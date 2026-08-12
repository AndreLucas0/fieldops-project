import { Redirect, useRouter } from 'expo-router';
import { Camera, ClipboardCheck, ListChecks, ShieldCheck } from 'lucide-react-native';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  alpha,
  Button,
  colors,
  HazardLine,
  Panel,
  radii,
  spacing,
  Text,
} from '@/design-system';
import { useSession } from '@/features/auth/session-context';

/**
 * Tela de entrada (landing) — porte de `src/routes/index.tsx` do protótipo.
 * Quem já tem sessão ativa é levado direto para o início.
 */

const features = [
  {
    icon: ListChecks,
    title: 'Modelos de checklist',
    text: 'Monte listas por equipamento ou área.',
  },
  {
    icon: ClipboardCheck,
    title: 'Inspeção em campo',
    text: 'Conforme, não conforme ou N/A em um toque.',
  },
  { icon: Camera, title: 'Evidência em foto', text: 'Anexe fotos direto da câmera do celular.' },
  { icon: ShieldCheck, title: 'Histórico e índice', text: 'Resultados e conformidade por inspeção.' },
];

export default function LandingScreen() {
  const { session, loading } = useSession();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  // Quem já tem sessão nunca vê a landing. `Redirect` substitui a rota em vez
  // de empilhá-la, então o "voltar" do Android não traz esta tela de volta.
  if (session) return <Redirect href="/inicio" />;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing['3xl'], paddingBottom: insets.bottom + spacing['3xl'] },
      ]}
    >
      <View style={styles.hazardMark}>
        <HazardLine height={6} />
      </View>

      <Text variant="display" style={styles.headline}>
        Inspeções industriais{'\n'}
        <Text variant="display" color="primary">
          sem papel.
        </Text>
      </Text>

      <Text variant="body" color="mutedForeground" style={styles.lead}>
        Crie modelos de checklist, execute a inspeção no chão de fábrica e registre evidências em
        foto — tudo pelo celular.
      </Text>

      <View style={styles.features}>
        {features.map((feature) => (
          <Panel key={feature.title} style={styles.featureCard}>
            <View style={styles.featureIcon}>
              <feature.icon size={20} color={colors.primary} />
            </View>
            <View style={styles.featureText}>
              <Text variant="bodySemibold">{feature.title}</Text>
              <Text variant="body" color="mutedForeground">
                {feature.text}
              </Text>
            </View>
          </Panel>
        ))}
      </View>

      <View style={styles.actions}>
        <Button title="Começar agora" size="lg" onPress={() => router.push('/login')} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.xl,
    gap: spacing.xl,
  },
  hazardMark: {
    width: 96,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  headline: {
    marginTop: spacing.sm,
  },
  lead: {
    marginTop: -spacing.sm,
  },
  features: {
    gap: spacing.md,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
  },
  featureIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: alpha.primary15,
  },
  featureText: {
    flex: 1,
    gap: 2,
  },
  actions: {
    gap: spacing.md,
  },
});
