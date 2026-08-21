/**
 * Regras do formulário de não conformidade (FE-M10).
 *
 * Puras e testáveis: a tela só desenha o que estas funções decidem.
 */

import type { NonConformity, Severity } from '@/models';

export interface NonConformityDraft {
  title: string;
  description: string;
  severity: Severity;
}

export interface NonConformityErrors {
  title?: string;
  description?: string;
}

export const SEVERITY_ORDER: readonly Severity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export const EMPTY_DRAFT: NonConformityDraft = {
  title: '',
  description: '',
  severity: 'MEDIUM',
};

/** Limite de `title` no contrato (`openapi.yaml` §NonConformity). */
export const TITLE_MAX_LENGTH = 200;

export function validateDraft(draft: NonConformityDraft): NonConformityErrors {
  const errors: NonConformityErrors = {};

  const title = draft.title.trim();
  if (title.length === 0) {
    errors.title = 'Informe um título para a não conformidade.';
  } else if (title.length > TITLE_MAX_LENGTH) {
    errors.title = `O título deve ter no máximo ${TITLE_MAX_LENGTH} caracteres.`;
  }

  // O contrato exige `description` em qualquer severidade
  // (`NonConformityCreateRequest.required`). A mensagem é mais enfática em
  // CRITICAL, onde a descrição orienta a ação imediata.
  if (draft.description.trim().length === 0) {
    errors.description =
      draft.severity === 'CRITICAL'
        ? 'Severidade crítica exige a descrição do risco e da ação imediata.'
        : 'Descreva o que foi encontrado.';
  }

  return errors;
}

export function hasErrors(errors: NonConformityErrors): boolean {
  return Boolean(errors.title || errors.description);
}

/** Preenche o formulário a partir de uma NC existente, para edição. */
export function toDraft(nonConformity: NonConformity): NonConformityDraft {
  return {
    title: nonConformity.title,
    description: nonConformity.description,
    severity: nonConformity.severity,
  };
}
