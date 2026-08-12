import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Answer } from '@/domain/inspection';
import {
  inspectionRepository,
  type CreateInspectionInput,
  type CreateTemplateInput,
} from '@/infrastructure/repositories/inspection-repository';

/**
 * Acesso a dados via TanStack Query, como previsto em
 * docs/aplicativo-mobile.md §13.6. Equivale ao use-inspection-data.ts do
 * protótipo, mas conversando com o repositório em vez do Supabase.
 */

export const queryKeys = {
  templates: ['templates'] as const,
  template: (id: string) => ['template', id] as const,
  inspections: ['inspections'] as const,
  inspection: (id: string) => ['inspection', id] as const,
};

export function useTemplates() {
  return useQuery({
    queryKey: queryKeys.templates,
    queryFn: () => inspectionRepository.listTemplates(),
  });
}

export function useTemplate(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.template(id ?? ''),
    queryFn: () => inspectionRepository.getTemplate(id!),
    enabled: !!id,
  });
}

export function useInspections() {
  return useQuery({
    queryKey: queryKeys.inspections,
    queryFn: () => inspectionRepository.listInspections(),
  });
}

export function useInspection(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.inspection(id ?? ''),
    queryFn: () => inspectionRepository.getInspection(id!),
    enabled: !!id,
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTemplateInput) => inspectionRepository.createTemplate(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.templates });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => inspectionRepository.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.templates });
    },
  });
}

export function useCreateInspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInspectionInput) => inspectionRepository.createInspection(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inspections });
    },
  });
}

export function useSaveAnswers(inspectionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (answers: Answer[]) => inspectionRepository.saveAnswers(inspectionId, answers),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inspection(inspectionId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.inspections });
    },
  });
}

export function useCompleteInspection(inspectionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (answers: Answer[]) =>
      inspectionRepository.completeInspection(inspectionId, answers),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inspection(inspectionId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.inspections });
    },
  });
}
