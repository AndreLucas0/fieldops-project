import { ActivityIndicator } from 'react-native';
import { Redirect, Stack } from 'expo-router';

import { colors, Screen } from '@/design-system';
import { canUseFieldApp } from '@/domain/auth';
import { useSession } from '@/features/auth/session-context';

/**
 * Barreira de rota do aplicativo. A API continua validando cada requisição
 * (docs/perfis-de-usuario.md §5.3) — isto aqui é conveniência de interface.
 */
export default function ProtectedLayout() {
  const { status, session } = useSession();

  if (status === 'loading') {
    return (
      <Screen scroll={false} center testID="protected-loading">
        <ActivityIndicator size="large" color={colors.primary} />
      </Screen>
    );
  }

  if (status === 'signedOut' || !session) {
    return <Redirect href="/login" />;
  }

  // Perfis sem acesso ao app de campo (ex.: CLIENT_VIEWER) não passam daqui.
  if (!canUseFieldApp(session.user.role)) {
    return <Redirect href="/login" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
