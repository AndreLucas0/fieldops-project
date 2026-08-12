import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors } from '@/design-system';
import { useSession } from '@/features/auth/session-context';

/**
 * Proteção de rota (docs/aplicativo-mobile.md §13.11).
 *
 * Enquanto a sessão persistida está sendo lida não redirecionamos — caso
 * contrário o app piscaria o login a cada abertura, mesmo com sessão válida.
 */
export default function ProtectedLayout() {
  const { session, loading } = useSession();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!session) return <Redirect href="/login" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
