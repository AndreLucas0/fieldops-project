import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { LogOut } from 'lucide-react-native';
import { Alert, Pressable, StyleSheet } from 'react-native';
import { colors, radii } from '@/design-system';
import { useSession } from '@/features/auth/session-context';

/**
 * Ação de sair do cabeçalho, como no `MobileShell` do protótipo — mas com
 * confirmação, porque sair é irreversível para o trabalho não sincronizado
 * (docs/aplicativo-mobile.md §13.9: "confirmar ações irreversíveis").
 */
export function SignOutButton() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { signOut } = useSession();

  function confirmSignOut() {
    Alert.alert('Sair da conta', 'Você precisará entrar novamente para sincronizar as inspeções.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          queryClient.clear();
          router.replace('/');
        },
      },
    ]);
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Sair"
      onPress={confirmSignOut}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <LogOut size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.7,
  },
});
