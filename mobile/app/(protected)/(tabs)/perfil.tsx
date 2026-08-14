import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { StatusBadge } from '@/components';
import { Button, Panel, Screen, spacing, Text } from '@/design-system';
import { useSession } from '@/features/auth/session-context';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  SUPERVISOR: 'Supervisor',
  TECHNICIAN: 'Técnico de campo',
  CLIENT_VIEWER: 'Cliente',
};

/**
 * FE-M05 — Perfil.
 *
 * Sair confirma antes: em campo, o toque acidental é comum, e refazer o login
 * exige rede — que pode não haver no momento.
 */
export default function PerfilScreen() {
  const { session, signOut } = useSession();
  const [signingOut, setSigningOut] = useState(false);

  if (!session) return null;

  const { user } = session;

  async function performSignOut(): Promise<void> {
    if (signingOut) return;

    setSigningOut(true);
    try {
      // O serviço encerra a sessão no servidor, limpa o Secure Store e navega
      // para o login; falha de rede não impede a saída local.
      await signOut();
    } finally {
      setSigningOut(false);
    }
  }

  function confirmSignOut(): void {
    Alert.alert(
      'Sair do aplicativo',
      'Você precisará de conexão para entrar novamente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: () => void performSignOut() },
      ],
      { cancelable: true },
    );
  }

  return (
    <Screen testID="perfil-screen" contentStyle={styles.content}>
      <Text variant="title">Perfil</Text>

      <Panel tone="raised" testID="perfil-card" style={styles.card}>
        <View style={styles.field}>
          <Text variant="label" tone="muted">
            Nome
          </Text>
          <Text testID="perfil-nome">{user.name}</Text>
        </View>

        <View style={styles.field}>
          <Text variant="label" tone="muted">
            E-mail
          </Text>
          <Text testID="perfil-email">{user.email}</Text>
        </View>

        <View style={styles.field}>
          <Text variant="label" tone="muted">
            Perfil de acesso
          </Text>
          <View style={styles.role}>
            <Text testID="perfil-role">{ROLE_LABELS[user.role] ?? user.role}</Text>
            <StatusBadge value="ACTIVE" context="user" size="sm" />
          </View>
        </View>
      </Panel>

      <Button
        testID="perfil-signout"
        label="Sair"
        variant="outline"
        loading={signingOut}
        onPress={confirmSignOut}
        accessibilityHint="Encerra a sessão e volta para a tela de login"
        style={styles.signOut}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing['2xl'],
  },
  card: {
    gap: spacing.xl,
  },
  field: {
    gap: spacing.xs,
  },
  role: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  signOut: {
    marginTop: 'auto',
  },
});
