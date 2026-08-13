import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';

import { Brand, BrandSlashes, Button, colors, Screen, spacing, Text } from '@/design-system';
import { useSession } from '@/features/auth/session-context';
import { HighlightCard } from '@/features/onboarding/HighlightCard';
import { HIGHLIGHTS } from '@/features/onboarding/highlights';

export default function LandingScreen() {
  const router = useRouter();
  const { status } = useSession();

  // Enquanto a sessão gravada é lida, nada de apresentação: quem já entrou
  // deve cair direto no início, sem ver esta tela piscar.
  if (status === 'loading') {
    return (
      <Screen scroll={false} center testID="landing-loading">
        <ActivityIndicator size="large" color={colors.primary} />
      </Screen>
    );
  }

  if (status === 'signedIn') {
    return <Redirect href="/inicio" />;
  }

  return (
    <Screen testID="landing-screen" contentStyle={styles.content}>
      <View style={styles.header}>
        <Brand testID="landing-brand" />
      </View>

      <View style={styles.hero}>
        <BrandSlashes />
        <Text variant="display">
          Inspeções industriais{'\n'}
          <Text variant="display" tone="primary">
            sem papel.
          </Text>
        </Text>
        <Text tone="muted">
          Execute a inspeção no chão de fábrica, registre evidências em foto e sincronize quando o
          sinal voltar — tudo pelo celular.
        </Text>
      </View>

      <View style={styles.highlights}>
        {HIGHLIGHTS.map((highlight) => (
          <HighlightCard key={highlight.id} highlight={highlight} />
        ))}
      </View>

      <View style={styles.actions}>
        <Button
          testID="landing-signin"
          label="Entrar"
          accessibilityHint="Abre a tela de acesso com e-mail e senha"
          onPress={() => router.push('/login')}
        />
        <Text variant="caption" tone="muted" style={styles.note}>
          Sua conta é criada pelo administrador da operação.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing['2xl'],
  },
  header: {
    alignItems: 'flex-start',
  },
  hero: {
    gap: spacing.lg,
  },
  highlights: {
    gap: spacing.md,
  },
  actions: {
    gap: spacing.md,
    marginTop: 'auto',
  },
  note: {
    textAlign: 'center',
  },
});
