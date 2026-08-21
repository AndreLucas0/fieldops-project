/**
 * Consulta de equipamento pelo QR Code (FE-M11).
 *
 * `GET /equipment/by-qr/{qrCode}` é o único caminho previsto no contrato para
 * identificar o equipamento em campo.
 */

import { useCallback, useState } from 'react';

import { toApiError, type ApiError, type Equipment } from '@/models';
import { apiClient, type ApiClient } from '@/services';

export type LookupState =
  | { status: 'idle' }
  | { status: 'searching'; qrCode: string }
  | { status: 'found'; qrCode: string; equipment: Equipment }
  | { status: 'not-found'; qrCode: string }
  | { status: 'error'; qrCode: string; error: ApiError };

export interface UseEquipmentLookupResult {
  state: LookupState;
  lookup: (qrCode: string) => Promise<void>;
  reset: () => void;
}

export function useEquipmentLookup(client: ApiClient = apiClient): UseEquipmentLookupResult {
  const [state, setState] = useState<LookupState>({ status: 'idle' });

  const lookup = useCallback(
    async (qrCode: string) => {
      const code = qrCode.trim();
      if (code.length === 0) return;

      setState({ status: 'searching', qrCode: code });

      try {
        const equipment = await client.get<Equipment>(
          `/equipment/by-qr/${encodeURIComponent(code)}`,
        );
        setState({ status: 'found', qrCode: code, equipment });
      } catch (thrown) {
        const error = toApiError(thrown);
        // 404 não é falha da leitura: é um código que não corresponde a nenhum
        // equipamento cadastrado, e merece mensagem própria.
        setState(
          error.status === 404
            ? { status: 'not-found', qrCode: code }
            : { status: 'error', qrCode: code, error },
        );
      }
    },
    [client],
  );

  const reset = useCallback(() => setState({ status: 'idle' }), []);

  return { state, lookup, reset };
}

/**
 * O equipamento lido é o esperado pela inspeção?
 *
 * Sem expectativa (leitura avulsa), qualquer equipamento serve.
 */
export function matchesExpected(
  equipment: Equipment,
  expectedEquipmentId: string | undefined,
): boolean {
  return !expectedEquipmentId || equipment.id === expectedEquipmentId;
}
