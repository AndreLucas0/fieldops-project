import { useRouter } from 'expo-router';
import { HardHat } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, colors, Field, Panel, spacing, Text } from '@/design-system';
import { useSession } from '@/features/auth/session-context';

/**
 * Login — porte de `src/routes/auth.tsx`.
 *
 * O cadastro e o "entrar com Google" do protótipo foram removidos: no FieldOps
 * o usuário é criado pelo administrador na interface web (docs §8.2), e o
 * acesso é por e-mail e senha contra a API.
 */
export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn } = useSession();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    try {
      await signIn(email, password);
      router.replace('/inicio');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing['3xl'], paddingBottom: insets.bottom + spacing['3xl'] },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brand}>
          <HardHat size={20} color={colors.primary} />
          <Text variant="bodyMedium" color="mutedForeground">
            FieldOps
          </Text>
        </View>

        <Panel style={styles.card}>
          <Text variant="title">Entrar</Text>
          <Text variant="body" color="mutedForeground">
            Acesse suas inspeções atribuídas.
          </Text>

          <View style={styles.form}>
            <Field
              label="E-mail"
              value={email}
              onChangeText={setEmail}
              placeholder="voce@empresa.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              maxLength={255}
              editable={!loading}
            />
            <Field
              label="Senha"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              autoCapitalize="none"
              textContentType="password"
              editable={!loading}
              error={error ?? undefined}
            />
          </View>

          <Button
            title="Entrar"
            size="lg"
            loading={loading}
            disabled={!email.trim() || !password}
            onPress={handleSubmit}
          />

          <Text variant="caption" color="mutedForeground" center>
            Não tem acesso? Solicite ao administrador da sua operação.
          </Text>
        </Panel>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing['2xl'],
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  card: {
    padding: spacing['2xl'],
    gap: spacing.lg,
  },
  form: {
    gap: spacing.lg,
  },
});
