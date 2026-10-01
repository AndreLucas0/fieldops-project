/**
 * Estado de execução do checklist (FE-M08) — offline-first.
 *
 * Cada resposta é gravada no outbox SQLite local assim que o técnico para de
 * digitar. O SyncService tenta sincronizar com o servidor em seguida, se
 * houver conexão. Caso contrário, as respostas ficam armazenadas localmente.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { randomUUID } from 'expo-crypto';

import { isAnswered, requiresObservation, type ChecklistValue } from '@/components';
import {
  type ApiError,
  type InspectionDetail,
  type InspectionItemSnapshot,
  type InspectionResponse,
  type Uuid,
} from '@/models';
import { apiClient, type ApiClient } from '@/services';
import { upsertOutboxEntry } from '@/services/local-db';
import { syncPendingIfOnline } from '@/services/sync-service';

import {
  groupBySection,
  indexResponses,
  initialValues,
  pendingRequiredItems,
  type ChecklistSection,
} from './checklist-sections';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'invalid' | 'error';

export interface ItemSaveState {
  status: SaveStatus;
  message?: string;
}

const IDLE: ItemSaveState = { status: 'idle' };

/**
 * Espera antes de enviar. Digitar num campo de texto não pode gerar uma
 * requisição por tecla; meio segundo é o intervalo em que a pessoa larga o
 * teclado sem perceber espera.
 */
const DEFAULT_DEBOUNCE_MS = 500;

export interface UseChecklistOptions {
  client?: ApiClient;
  debounceMs?: number;
  /** Injetável para teste — em produção é o gerador do dispositivo. */
  generateId?: () => string;
}

export interface UseChecklistResult {
  sections: ChecklistSection[];
  values: ReadonlyMap<Uuid, ChecklistValue>;
  saveStates: ReadonlyMap<Uuid, ItemSaveState>;
  responses: ReadonlyMap<Uuid, InspectionResponse>;
  progress: { answered: number; total: number };
  pending: InspectionItemSnapshot[];
  /** Registra a alteração e agenda o envio. */
  change: (item: InspectionItemSnapshot, value: ChecklistValue) => void;
  /** Envia agora o que estiver pendente de debounce (usado antes de sair). */
  flush: () => Promise<void>;
}

export function useChecklist(
  inspection: InspectionDetail | null,
  { client = apiClient, debounceMs = DEFAULT_DEBOUNCE_MS, generateId = randomUUID }: UseChecklistOptions = {},
): UseChecklistResult {
  const items = useMemo(() => inspection?.items ?? [], [inspection]);
  const sections = useMemo(() => groupBySection(items), [items]);

  const [values, setValues] = useState<Map<Uuid, ChecklistValue>>(() =>
    initialValues(inspection?.responses ?? []),
  );
  const [saveStates, setSaveStates] = useState<Map<Uuid, ItemSaveState>>(new Map());

  const [responses, setResponses] = useState<Map<Uuid, InspectionResponse>>(() =>
    indexResponses(inspection?.responses ?? []),
  );

  /**
   * Versão de cada resposta conhecida pelo servidor, para o envio ler o valor
   * mais recente e não o capturado quando o temporizador foi agendado. Só
   * armazena o número de versão (não a resposta inteira) e é incrementado
   * localmente após cada upsertOutboxEntry bem-sucedido, evitando que a 2ª
   * edição do mesmo item na mesma sessão envie baseVersion obsoleto (RN-075).
   */
  const versionsRef = useRef<{ signature: string; versions: Map<Uuid, number> } | null>(
    null,
  );

  const timersRef = useRef(new Map<Uuid, ReturnType<typeof setTimeout>>());
  const inFlightRef = useRef(new Map<Uuid, Promise<void>>());

  // Recarregar a inspeção (após conflito, por exemplo) reinicia o que está na
  // tela a partir do que o servidor devolveu.
  const detailSignature = `${inspection?.id ?? ''}:${inspection?.version ?? ''}`;
  const [lastSignature, setLastSignature] = useState(detailSignature);
  if (detailSignature !== lastSignature) {
    setLastSignature(detailSignature);
    setResponses(indexResponses(inspection?.responses ?? []));
    setValues(initialValues(inspection?.responses ?? []));
    setSaveStates(new Map());
  }

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      // Sair da tela cancela o que ainda não foi enviado; o `flush` explícito
      // é quem garante o envio quando a saída é intencional.
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const setSaveState = useCallback((itemId: Uuid, state: ItemSaveState) => {
    setSaveStates((current) => new Map(current).set(itemId, state));
  }, []);

  const send = useCallback(
    async (item: InspectionItemSnapshot, value: ChecklistValue) => {
      if (!inspection) return;

      // O cache só é lido aqui para obter a versão base conhecida pelo servidor.
      if (versionsRef.current?.signature !== detailSignature) {
        versionsRef.current = {
          signature: detailSignature,
          versions: new Map(
            (inspection.responses ?? []).map((r) => [r.inspectionItemId, r.version]),
          ),
        };
      }
      const knownVersion = versionsRef.current.versions.get(item.id) ?? 0;

      // SINGLE_CHOICE usa valueChoice no contrato de sync; os outros tipos usam valueText.
      const isSingleChoice = item.responseType === 'SINGLE_CHOICE';
      const syncPayload = {
        inspectionId: inspection.id,
        valueText: isSingleChoice ? null : (value.valueText ?? null),
        valueNumber: value.valueNumber ?? null,
        valueBoolean: value.valueBoolean ?? null,
        valueDate: value.valueDate ?? null,
        valueChoice: isSingleChoice ? (value.valueText ?? null) : null,
        observation: value.observation ?? null,
        conformity: value.conformity ?? null,
      };

      try {
        await upsertOutboxEntry({
          id: generateId(),
          inspectionId: inspection.id,
          entityType: 'INSPECTION_RESPONSE',
          entityId: item.id,
          operationType: 'UPSERT',
          baseVersion: knownVersion,
          payload: JSON.stringify(syncPayload),
        });

        versionsRef.current.versions.set(
          item.id,
          (versionsRef.current.versions.get(item.id) ?? 0) + 1,
        );
        setSaveState(item.id, { status: 'saved' });
        void syncPendingIfOnline(client, inspection.id);
      } catch {
        setSaveState(item.id, { status: 'error', message: 'Não foi possível gravar localmente.' });
      }
    },
    [client, detailSignature, generateId, inspection, setSaveState],
  );

  const change = useCallback(
    (item: InspectionItemSnapshot, value: ChecklistValue) => {
      setValues((current) => new Map(current).set(item.id, value));

      const timers = timersRef.current;
      const pendingTimer = timers.get(item.id);
      if (pendingTimer) clearTimeout(pendingTimer);

      // Validação local antes da rede: item não conforme sem a observação
      // exigida renderia 422 garantido (RN-038).
      if (requiresObservation(item, value) && !(value.observation ?? '').trim()) {
        setSaveState(item.id, {
          status: 'invalid',
          message: 'Descreva a observação para gravar este item.',
        });
        return;
      }

      setSaveState(item.id, { status: 'saving' });

      const timer = setTimeout(() => {
        timers.delete(item.id);
        const promise = send(item, value).finally(() => {
          inFlightRef.current.delete(item.id);
        });
        inFlightRef.current.set(item.id, promise);
      }, debounceMs);

      timers.set(item.id, timer);
    },
    [debounceMs, send, setSaveState],
  );

  const flush = useCallback(async () => {
    const timers = timersRef.current;
    timers.forEach((timer) => clearTimeout(timer));
    timers.clear();
    await Promise.all([...inFlightRef.current.values()]);
  }, []);

  const answered = useMemo(
    () => items.filter((item) => isAnswered(item, values.get(item.id) ?? {})).length,
    [items, values],
  );

  return {
    sections,
    values,
    saveStates,
    responses,
    progress: { answered, total: items.length },
    pending: pendingRequiredItems(sections, values),
    change,
    flush,
  };
}

/** Estados de gravação que não são erro, para a tela colorir o rótulo. */
export function saveStateOf(
  states: ReadonlyMap<Uuid, ItemSaveState>,
  itemId: Uuid,
): ItemSaveState {
  return states.get(itemId) ?? IDLE;
}

export function describeSaveError(error: ApiError): string {
  switch (error.status) {
    case 400:
      return 'Valor inválido para este item. Revise a resposta.';
    case 409:
      return 'Este item foi alterado em outro dispositivo. Recarregue a inspeção antes de continuar.';
    case 422:
      // O servidor explica qual regra falhou (observação, obrigatoriedade).
      return error.message;
    default:
      return error.message;
  }
}
