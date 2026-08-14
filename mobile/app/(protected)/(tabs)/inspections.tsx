import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import {
  EmptyState,
  ErrorState,
  FilterChips,
  InspectionCard,
  LoadingSpinner,
  statusLabel,
} from '@/components';
import { Button, colors, spacing, Text } from '@/design-system';
import {
  EMPTY_FILTERS,
  FILTERABLE_PRIORITIES,
  FILTERABLE_STATUSES,
  PERIOD_LABELS,
  countActiveFilters,
  filterInspections,
  hasActiveFilters,
  sortInspections,
  toggleValue,
  type InspectionFilters,
  type PeriodKey,
} from '@/features/inspections/inspection-filters';
import { useInspections } from '@/features/inspections/use-inspections';
import { usePlaceNames } from '@/features/inspections/use-place-names';
import type { Inspection, InspectionPriority, InspectionStatus } from '@/models';

const STATUS_OPTIONS = FILTERABLE_STATUSES.map((value) => ({
  value,
  label: statusLabel('inspection', value),
}));

const PRIORITY_OPTIONS = FILTERABLE_PRIORITIES.map((value) => ({
  value,
  label: statusLabel('priority', value),
}));

const PERIOD_OPTIONS = (Object.keys(PERIOD_LABELS) as PeriodKey[]).map((value) => ({
  value,
  label: PERIOD_LABELS[value],
}));

/**
 * FE-M03 — Lista de inspeções.
 *
 * A busca traz as inspeções do técnico de uma vez; os chips filtram a lista já
 * carregada, sem nova ida à rede.
 */
export default function InspectionsScreen() {
  const router = useRouter();
  // As abas não têm cabeçalho nativo: a área segura é da própria tela.
  const insets = useSafeAreaInsets();
  const { inspections, loading, error, refreshing, reload, refresh } = useInspections();
  const places = usePlaceNames(inspections);

  const [filters, setFilters] = useState<InspectionFilters>(EMPTY_FILTERS);

  const visible = useMemo(
    () => sortInspections(filterInspections(inspections, filters)),
    [inspections, filters],
  );

  const active = hasActiveFilters(filters);

  function toggleStatus(status: InspectionStatus): void {
    setFilters((current) => ({ ...current, statuses: toggleValue(current.statuses, status) }));
  }

  function togglePriority(priority: InspectionPriority): void {
    setFilters((current) => ({
      ...current,
      priorities: toggleValue(current.priorities, priority),
    }));
  }

  /** Período é exclusivo: tocar no chip já marcado volta a "todos". */
  function togglePeriod(period: PeriodKey): void {
    setFilters((current) => ({ ...current, period: current.period === period ? null : period }));
  }

  function openInspection(inspection: Inspection): void {
    router.push({
      pathname: '/inspections/[inspectionId]',
      params: { inspectionId: inspection.id },
    });
  }

  if (loading) {
    return <LoadingSpinner testID="inspections-loading" message="Buscando suas inspeções…" />;
  }

  if (error) {
    return (
      <ErrorState
        testID="inspections-error"
        message={error.message}
        requestId={error.requestId ?? null}
        onRetry={reload}
      />
    );
  }

  return (
    <FlatList
      testID="inspections-screen"
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}
      data={visible}
      keyExtractor={(inspection) => inspection.id}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text variant="title">Inspeções</Text>
            <Text testID="inspections-count" variant="caption" tone="muted">
              {visible.length} de {inspections.length}
            </Text>
          </View>

          <FilterChips
            testID="filtro-estado"
            label="Estado"
            options={STATUS_OPTIONS}
            selected={filters.statuses}
            onToggle={toggleStatus}
          />

          <FilterChips
            testID="filtro-prioridade"
            label="Prioridade"
            options={PRIORITY_OPTIONS}
            selected={filters.priorities}
            onToggle={togglePriority}
          />

          <FilterChips
            testID="filtro-periodo"
            label="Período"
            options={PERIOD_OPTIONS}
            selected={filters.period ? [filters.period] : []}
            onToggle={togglePeriod}
          />

          {active ? (
            <Button
              testID="inspections-clear-filters"
              label={`Limpar filtros (${countActiveFilters(filters)})`}
              variant="ghost"
              onPress={() => setFilters(EMPTY_FILTERS)}
            />
          ) : null}
        </View>
      }
      ListEmptyComponent={
        active ? (
          <EmptyState
            testID="inspections-empty-filtered"
            icon="filter"
            title="Nenhuma inspeção encontrada"
            message="Nenhuma inspeção atende aos filtros escolhidos. Ajuste ou limpe os filtros para ver as demais."
            actionLabel="Limpar filtros"
            onAction={() => setFilters(EMPTY_FILTERS)}
          />
        ) : (
          <EmptyState
            testID="inspections-empty"
            title="Nenhuma inspeção encontrada"
            message="Você ainda não tem inspeções atribuídas. Assim que o supervisor atribuir uma, ela aparece aqui."
            actionLabel="Atualizar"
            onAction={reload}
          />
        )
      }
      renderItem={({ item }) => (
        <InspectionCard
          testID={`inspections-card-${item.id}`}
          inspection={item}
          clientName={places.clients.get(item.clientId) ?? null}
          siteName={places.sites.get(item.siteId) ?? null}
          onPress={openInspection}
        />
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['3xl'],
    paddingBottom: spacing['4xl'],
  },
  header: {
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  separator: {
    height: spacing.md,
  },
});
