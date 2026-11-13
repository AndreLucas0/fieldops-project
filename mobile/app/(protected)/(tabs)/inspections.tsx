
import { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
  TextInput,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SlidersHorizontal, X } from 'lucide-react-native';

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

import type {
  Inspection,
  InspectionPriority,
  InspectionStatus,
} from '@/models';

const STATUS_OPTIONS = FILTERABLE_STATUSES.map((value) => ({
  value,
  label: statusLabel('inspection', value),
}));

const PRIORITY_OPTIONS = FILTERABLE_PRIORITIES.map((value) => ({
  value,
  label: statusLabel('priority', value),
}));



const PERIOD_OPTIONS = (
  Object.keys(PERIOD_LABELS) as PeriodKey[]
).map((value) => ({
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

  const {
    inspections,
    loading,
    error,
    refreshing,
    reload,
    refresh,
  } = useInspections();

  const places = usePlaceNames(inspections);

  const [filters, setFilters] =
    useState<InspectionFilters>(EMPTY_FILTERS);

  const [filtersVisible, setFiltersVisible] = useState(false);

  const [localSearch, setLocalSearch] = useState('');

  const visible = useMemo(() => {
    const filtered = filterInspections(inspections, filters);

    const search = localSearch.trim().toLowerCase();

    if (!search) {
      return sortInspections(filtered);
    }

    const localFiltered = filtered.filter((inspection) => {
      const siteName = places.sites.get(inspection.siteId) ?? '';
      const clientName = places.clients.get(inspection.clientId) ?? '';

      return (
        siteName.toLowerCase().includes(search) ||
        clientName.toLowerCase().includes(search)
      );
    });

    return sortInspections(localFiltered);
  }, [inspections, filters, localSearch, places]);

  const active =
    hasActiveFilters(filters) || localSearch.trim().length > 0;


  function toggleStatus(status: InspectionStatus): void {
    setFilters((current) => ({
      ...current,
      statuses: toggleValue(current.statuses, status),
    }));
  }

  function togglePriority(priority: InspectionPriority): void {
    setFilters((current) => ({
      ...current,
      priorities: toggleValue(current.priorities, priority),
    }));
  }

  /**
   * Período é exclusivo:
   * tocar no chip já marcado volta para "todos".
   */
  function togglePeriod(period: PeriodKey): void {
    setFilters((current) => ({
      ...current,
      period: current.period === period ? null : period,
    }));
  }

  function clearFilters(): void {
    setFilters(EMPTY_FILTERS);
    setLocalSearch('');
  }

  function openInspection(inspection: Inspection): void {
    router.push({
      pathname: '/inspections/[inspectionId]',
      params: {
        inspectionId: inspection.id,
      },
    });
  }

  if (loading) {
    return (
      <LoadingSpinner
        testID="inspections-loading"
        message="Buscando suas inspeções…"
      />
    );
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
    <>
      <FlatList
        testID="inspections-screen"
        style={styles.root}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + spacing.lg,
          },
        ]}
        data={visible}
        keyExtractor={(inspection) => inspection.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View>
                <Text variant="title">Inspeções</Text>

                <Text
                  testID="inspections-count"
                  variant="caption"
                  tone="muted"
                >
                  {visible.length} de {inspections.length}
                </Text>
              </View>

              <Pressable
                testID="inspections-filter-button"
                onPress={() => setFiltersVisible(true)}
                style={styles.filterButton}
                accessibilityRole="button"
                accessibilityLabel="Abrir filtros"
              >
                <SlidersHorizontal
                  size={22}
                  color={colors.foreground}
                />

                {active ? (
                  <View style={styles.filterBadge} />
                ) : null}
              </Pressable>
            </View>
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
              onAction={clearFilters}
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
        ItemSeparatorComponent={() => (
          <View style={styles.separator} />
        )}
      />

      {/* Modal lateral de filtros */}
      <Modal
        visible={filtersVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFiltersVisible(false)}
      >
        <View style={styles.modalContainer}>
          {/* Área escura atrás do painel */}
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setFiltersVisible(false)}
          />

          {/* Painel lateral */}
          <View
            style={[
              styles.filterPanel,
              {
                paddingTop: insets.top + spacing.lg,
              },
            ]}
          >
            <View style={styles.filterHeader}>
              <Text variant="title">Filtros</Text>

              <Pressable
                onPress={() => setFiltersVisible(false)}
                style={styles.closeButton}
                accessibilityRole="button"
                accessibilityLabel="Fechar filtros"
              >
                <X size={24} color={colors.foreground} />
              </Pressable>
            </View>

            <View style={styles.filterContent}>
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
                selected={
                  filters.period
                    ? [filters.period]
                    : []
                }
                onToggle={togglePeriod}
              />

              <View style={styles.localFilter}>
                <Text variant="label" tone="muted">
                  Local ou cliente
                </Text>

                <TextInput
                  value={localSearch}
                  onChangeText={setLocalSearch}
                  placeholder="Pesquisar local ou cliente..."
                  placeholderTextColor={colors.foreground}
                  style={styles.localInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {active ? (
                <Button
                  testID="inspections-clear-filters"
                  label={`Limpar filtros (${countActiveFilters(filters)})`}
                  variant="ghost"
                  onPress={clearFilters}
                />
              ) : null}
            </View>
          </View>
        </View>
      </Modal>
    </>
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
    paddingBottom: spacing['4xl'],
  },

  header: {
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },

  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  filterBadge: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },

  separator: {
    height: spacing.md,
  },

  /*
   * Modal
   */

  modalContainer: {
    flex: 1,
    flexDirection: 'row',
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },

  filterPanel: {
    width: '82%',
    maxWidth: 420,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['4xl'],
    shadowColor: '#000',
    shadowOffset: {
      width: -4,
      height: 0,
    },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },

  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.xl,
  },

  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  filterContent: {
    gap: spacing.lg,
  },
  localFilter: {
    gap: spacing.sm,
  },

  localInput: {
    height: 48,
    borderWidth: 1,
    borderColor: '#2A3138',
    borderRadius: 22,
    paddingHorizontal: spacing.lg,
    color: colors.foreground,
    backgroundColor: '#181E23',
  },
});

