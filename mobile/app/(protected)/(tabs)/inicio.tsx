import { useCallback, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';

import {
  EmptyState,
  ErrorState,
  InspectionCard,
  LoadingSpinner,
} from '@/components';
import { Button, colors, Panel, spacing, Text } from '@/design-system';
import { firstName } from '@/domain/auth';
import { useSession } from '@/features/auth/session-context';
import { useInspections } from '@/features/inspections/use-inspections';
import type { Inspection } from '@/models';

/**
 * FE-M02 — Início.
 *
 * Três recortes da mesma lista, na ordem em que o técnico decide o que fazer:
 * o que está atrasado, o que já começou e o que é para hoje.
 */
export default function InicioScreen() {
  const router = useRouter();

  const insets = useSafeAreaInsets();

  const { session } = useSession();

  const {
    groups,
    loading,
    error,
    refreshing,
    reload,
    refresh,
  } = useInspections();

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  /*
   * Atualiza automaticamente sempre que o usuário entra
   * ou volta para esta tela.
   */
  useFocusEffect(
    useCallback(() => {
      async function updateInspections() {
        await refresh();
        setLastUpdated(new Date());
      }

      updateInspections();
    }, [refresh]),
  );

  if (!session) return null;

  const { user } = session;

  function openInspection(inspection: Inspection): void {
    router.push({
      pathname: '/inspections/[inspectionId]',
      params: {
        inspectionId: inspection.id,
      },
    });
  }

  /**
   * Atualização manual através do "arrastar para baixo".
   */
  async function handleRefresh(): Promise<void> {
    await refresh();
    setLastUpdated(new Date());
  }

  const empty =
    groups.overdue.length === 0 &&
    groups.inProgress.length === 0 &&
    groups.today.length === 0;

  return (
    <ScrollView
      testID="inicio-screen"
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + spacing.lg,
        },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
        />
      }
    >
      <View style={styles.greeting}>
        <Text variant="title">
          Olá, {firstName(user)}.
        </Text>

        <Text variant="caption" tone="muted">
          {user.email}
        </Text>

        {lastUpdated ? (
          <Text
            testID="inicio-last-updated"
            variant="caption"
            tone="muted"
          >
            Última atualização:{' '}
            {lastUpdated.toLocaleDateString('pt-BR')} às{' '}
            {lastUpdated.toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        ) : null}
      </View>

      <View style={styles.actions}>
        <Button
          testID="inicio-scanner"
          label="Ler QR Code"
          variant="secondary"
          onPress={() => router.push('/scanner')}
          style={styles.action}
        />
      </View>

      {loading ? (
        <LoadingSpinner
          testID="inicio-loading"
          message="Buscando suas inspeções…"
        />
      ) : error ? (
        <ErrorState
          testID="inicio-error"
          message={error.message}
          requestId={error.requestId ?? null}
          onRetry={reload}
        />
      ) : empty ? (
        <EmptyState
          testID="inicio-empty"
          title="Nenhuma inspeção atribuída"
          message="Quando o supervisor atribuir uma inspeção a você, ela aparece aqui."
          actionLabel="Atualizar"
          onAction={reload}
        />
      ) : (
        <View style={styles.groups}>
          <InspectionGroup
            testID="inicio-overdue"
            title="Atrasadas"
            hint="Passou do horário agendado e ainda não foram concluídas."
            inspections={groups.overdue}
            onPress={openInspection}
          />

          <InspectionGroup
            testID="inicio-in-progress"
            title="Em andamento"
            hint="Checklist começado, aguardando conclusão."
            inspections={groups.inProgress}
            onPress={openInspection}
          />

          <InspectionGroup
            testID="inicio-today"
            title="Hoje"
            hint="Agendadas para hoje."
            inspections={groups.today}
            onPress={openInspection}
          />
        </View>
      )}
    </ScrollView>
  );
}

type InspectionGroupProps = {
  title: string;
  hint: string;
  inspections: readonly Inspection[];
  onPress: (inspection: Inspection) => void;
  testID: string;
};

/** Grupo vazio some da tela: uma seção "Atrasadas (0)" só ocupa espaço. */
function InspectionGroup({
  title,
  hint,
  inspections,
  onPress,
  testID,
}: InspectionGroupProps) {
  if (inspections.length === 0) return null;

  return (
    <Panel
      testID={testID}
      style={styles.group}
    >
      <View style={styles.groupHeader}>
        <Text variant="subtitle">
          {title} ({inspections.length})
        </Text>

        <Text variant="caption" tone="muted">
          {hint}
        </Text>
      </View>

      {inspections.map((inspection) => (
        <InspectionCard
          key={inspection.id}
          testID={`${testID}-card-${inspection.id}`}
          inspection={inspection}
          onPress={onPress}
        />
      ))}
    </Panel>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    flexGrow: 1,
    gap: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['3xl'],
    paddingBottom: spacing['4xl'],
  },

  greeting: {
    gap: spacing.xs,
  },

  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },

  action: {
    flex: 1,
  },

  groups: {
    gap: spacing.lg,
  },

  group: {
    gap: spacing.md,
  },

  groupHeader: {
    gap: spacing.xs,
  },
});