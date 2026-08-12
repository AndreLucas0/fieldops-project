import { Link, useRouter } from 'expo-router';
import { Activity, ChevronRight, ClipboardList, Plus } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  Button,
  colors,
  EmptyState,
  ErrorState,
  LoadingState,
  Panel,
  Screen,
  spacing,
  Text,
  textColor,
} from '@/design-system';
import { InspectionCard } from '@/components/InspectionCard';
import { SignOutButton } from '@/components/SignOutButton';
import { summarize } from '@/domain/inspection';
import { useSession } from '@/features/auth/session-context';
import { useInspections, useTemplates } from '@/hooks/use-inspection-data';

/** Início — porte de `_authenticated/inicio.tsx`. */
export default function HomeScreen() {
  const router = useRouter();
  const { session } = useSession();
  const templatesQuery = useTemplates();
  const inspectionsQuery = useInspections();

  const templates = templatesQuery.data ?? [];
  const inspections = inspectionsQuery.data ?? [];

  const running = inspections.filter(
    (i) => i.status === 'IN_PROGRESS' || i.status === 'ASSIGNED',
  );
  const finished = inspections.filter(
    (i) => i.status === 'SUBMITTED' || i.status === 'APPROVED' || i.status === 'REJECTED',
  );
  const pendingSync = inspections.filter((i) => i.syncStatus !== 'SYNCED').length;

  const averageScore = finished.length
    ? Math.round(
        finished.reduce((sum, i) => sum + summarize(i.itemsSnapshot, i.answers).score, 0) /
          finished.length,
      )
    : 0;

  const loading = templatesQuery.isLoading || inspectionsQuery.isLoading;
  const error = templatesQuery.error ?? inspectionsQuery.error;

  return (
    <Screen
      title="FieldOps"
      subtitle={session ? `Olá, ${session.user.name}` : 'Inspeções industriais'}
      action={<SignOutButton />}
    >
      {error ? (
        <ErrorState message="Não foi possível carregar seus dados." />
      ) : loading ? (
        <LoadingState />
      ) : (
        <>
          <View style={styles.stats}>
            <Stat label="Modelos" value={templates.length} />
            <Stat label="Em andamento" value={running.length} />
            <Stat label="Conformidade" value={`${averageScore}%`} />
          </View>

          {pendingSync > 0 && (
            <Panel style={styles.syncNotice}>
              <Text variant="bodyMedium" color="warning">
                {pendingSync} {pendingSync === 1 ? 'inspeção aguarda' : 'inspeções aguardam'} envio
              </Text>
              <Text variant="caption" color="mutedForeground">
                Os dados ficam salvos no dispositivo até a sincronização ser confirmada.
              </Text>
            </Panel>
          )}

          <Button
            title="Nova inspeção"
            size="lg"
            icon={<Plus size={20} color={textColor.primary} />}
            onPress={() => router.push('/inspecoes/nova')}
          />

          <Section title="Em andamento">
            {running.length === 0 ? (
              <EmptyState
                icon={<Activity size={28} color={colors.primary} />}
                title="Nenhuma inspeção em andamento"
                description="Inicie uma a partir de um modelo."
              />
            ) : (
              <View style={styles.list}>
                {running.map((inspection) => (
                  <InspectionCard key={inspection.id} inspection={inspection} />
                ))}
              </View>
            )}
          </Section>

          <Section
            title="Modelos recentes"
            action={
              <Link href="/modelos" asChild>
                <Pressable accessibilityRole="link">
                  <Text variant="caption" color="primary">
                    ver todos
                  </Text>
                </Pressable>
              </Link>
            }
          >
            {templates.length === 0 ? (
              <EmptyState
                icon={<ClipboardList size={28} color={colors.primary} />}
                title="Nenhum modelo ainda"
                description="Crie seu primeiro modelo de checklist."
              />
            ) : (
              <View style={styles.list}>
                {templates.slice(0, 3).map((template) => (
                  <Link key={template.id} href={`/modelos/${template.id}`} asChild>
                    <Pressable accessibilityRole="button">
                      {({ pressed }) => (
                        <Panel style={[styles.templateCard, pressed && styles.pressed]}>
                          <View style={styles.templateInfo}>
                            <Text variant="bodySemibold" numberOfLines={1}>
                              {template.title}
                            </Text>
                            <Text variant="caption" color="mutedForeground">
                              {template.items.length} itens
                            </Text>
                          </View>
                          <ChevronRight size={20} color={colors.mutedForeground} />
                        </Panel>
                      )}
                    </Pressable>
                  </Link>
                ))}
              </View>
            )}
          </Section>
        </>
      )}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Panel style={styles.stat}>
      <Text variant="title" color="primary">
        {value}
      </Text>
      <Text variant="captionMedium" color="mutedForeground" center>
        {label.toUpperCase()}
      </Text>
    </Panel>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text variant="sectionLabel" color="mutedForeground">
          {title}
        </Text>
        {action}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  stats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  syncNotice: {
    padding: spacing.lg,
    gap: 2,
  },
  section: {
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  list: {
    gap: spacing.md,
  },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  templateInfo: {
    flex: 1,
    gap: 2,
  },
  pressed: {
    opacity: 0.85,
  },
});
