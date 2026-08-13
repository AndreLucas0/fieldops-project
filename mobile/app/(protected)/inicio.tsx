import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Brand, Button, Feedback, Panel, Screen, spacing, Text } from '@/design-system';
import { firstName } from '@/domain/auth';
import { useSession } from '@/features/auth/session-context';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  SUPERVISOR: 'Supervisor',
  TECHNICIAN: 'Técnico de campo',
  CLIENT_VIEWER: 'Cliente',
};

/**
 * Início provisório: confirma que a sessão chegou à área protegida e permite
 * sair. As listas de inspeções entram junto com a camada de dados.
 */
export default function InicioScreen() {
  const { session, signOut } = useSession();
  const [signingOut, setSigningOut] = useState(false);

  if (!session) return null;

  const { user } = session;

  return (
    <Screen testID="inicio-screen" contentStyle={styles.content}>
      <Brand />

      <View style={styles.greeting}>
        <Text variant="title">Olá, {firstName(user)}.</Text>
        <Text tone="muted">{ROLE_LABELS[user.role] ?? user.role}</Text>
      </View>

      <Panel tone="raised" style={styles.panel}>
        <Text variant="subtitle">Sessão ativa</Text>
        <Text variant="caption" tone="muted">
          {user.email}
        </Text>
        <Feedback
          tone="info"
          message="As inspeções atribuídas aparecerão aqui quando a API estiver conectada."
        />
      </Panel>

      <Button
        testID="inicio-signout"
        label="Sair"
        variant="outline"
        loading={signingOut}
        onPress={async () => {
          setSigningOut(true);
          await signOut();
        }}
        style={styles.signOut}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing['2xl'],
  },
  greeting: {
    gap: spacing.xs,
  },
  panel: {
    gap: spacing.md,
  },
  signOut: {
    marginTop: 'auto',
  },
});
