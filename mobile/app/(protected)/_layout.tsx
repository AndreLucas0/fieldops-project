import { ActivityIndicator } from 'react-native';
import { Redirect, Stack } from 'expo-router';

import { colors, fonts, fontSizes, Screen } from '@/design-system';
import { canUseFieldApp } from '@/domain/auth';
import { useSession } from '@/features/auth/session-context';

/**
 * Barreira de rota do aplicativo. A API continua validando cada requisição
 * (docs/perfis-de-usuario.md §5.3) — isto aqui é conveniência de interface.
 *
 * O cabeçalho nativo fica ligado por padrão: toda tela empilhada ganha título e
 * botão de voltar sem precisar repetir um botão em cada arquivo. O grupo de
 * abas é a exceção — ele tem a própria navegação e um cabeçalho ali seria uma
 * segunda barra sobre a barra de abas.
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
        headerShown: true,
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.primary,
        headerTitleStyle: {
          color: colors.foreground,
          fontFamily: fonts.semibold,
          fontSize: fontSizes.base,
        },
        headerBackTitle: 'Voltar',
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

      <Stack.Screen
        name="inspections/[inspectionId]/index"
        options={{ title: 'Detalhes da inspeção' }}
      />
      <Stack.Screen
        name="inspections/[inspectionId]/start"
        options={{ title: 'Iniciar inspeção' }}
      />
      <Stack.Screen
        name="inspections/[inspectionId]/checklist"
        options={{ title: 'Checklist' }}
      />
      <Stack.Screen name="evidence/capture" options={{ title: 'Nova evidência' }} />
      <Stack.Screen name="evidence/preview" options={{ title: 'Conferir evidência' }} />
      <Stack.Screen
        name="inspections/[inspectionId]/non-conformities"
        options={{ title: 'Não conformidades' }}
      />
      <Stack.Screen
        name="inspections/[inspectionId]/summary"
        options={{ title: 'Resumo' }}
      />
      <Stack.Screen name="scanner" options={{ title: 'Ler QR Code' }} />
    </Stack>
  );
}
