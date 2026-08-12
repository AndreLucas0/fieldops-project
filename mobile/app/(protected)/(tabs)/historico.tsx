import { History } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import {
  colors,
  EmptyState,
  ErrorState,
  LoadingState,
  Screen,
  spacing,
} from '@/design-system';
import { InspectionCard } from '@/components/InspectionCard';
import { SignOutButton } from '@/components/SignOutButton';
import { useInspections } from '@/hooks/use-inspection-data';

/** Histórico — porte de `_authenticated/historico.tsx`. */
export default function HistoryScreen() {
  const { data: inspections = [], isLoading, error } = useInspections();

  const finished = inspections
    .filter(
      (i) => i.status === 'SUBMITTED' || i.status === 'APPROVED' || i.status === 'REJECTED',
    )
    .sort((a, b) => {
      const dateA = new Date(a.completedAtDevice ?? a.createdAt).getTime();
      const dateB = new Date(b.completedAtDevice ?? b.createdAt).getTime();
      return dateB - dateA;
    });

  return (
    <Screen title="Histórico" subtitle="Inspeções finalizadas" action={<SignOutButton />}>
      {error ? (
        <ErrorState message="Não foi possível carregar o histórico." />
      ) : isLoading ? (
        <LoadingState />
      ) : finished.length === 0 ? (
        <EmptyState
          icon={<History size={32} color={colors.primary} />}
          title="Nada por aqui ainda"
          description="Inspeções finalizadas aparecem neste histórico."
        />
      ) : (
        <View style={styles.list}>
          {finished.map((inspection) => (
            <InspectionCard key={inspection.id} inspection={inspection} variant="result" />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.md,
  },
});
