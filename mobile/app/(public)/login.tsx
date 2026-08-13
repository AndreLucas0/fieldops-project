import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';

import {
  Brand,
  Button,
  Feedback,
  Field,
  Panel,
  Screen,
  spacing,
  Text,
} from '@/design-system';
import {
  AUTH_ERROR_MESSAGES,
  hasCredentialErrors,
  validateCredentials,
  type AuthFailureCode,
  type CredentialErrors,
} from '@/domain/auth';
import { toAuthFailureCode, useSession } from '@/features/auth/session-context';

export default function LoginScreen() {
  const router = useRouter();
  const { status, signIn } = useSession();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<CredentialErrors>({});
  const [failure, setFailure] = useState<AuthFailureCode | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (status === 'signedIn') {
    return <Redirect href="/inicio" />;
  }

  async function handleSubmit() {
    if (submitting) return;

    const credentials = { email, password };
    const errors = validateCredentials(credentials);
    setFieldErrors(errors);
    setFailure(null);

    // Validação local antes da chamada: evita ida ao servidor por campo vazio.
    if (hasCredentialErrors(errors)) return;

    setSubmitting(true);
    try {
      await signIn(credentials);
      // A navegação é do layout protegido; aqui basta sair da pilha pública.
      router.replace('/inicio');
    } catch (error) {
      setFailure(toAuthFailureCode(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen testID="login-screen" center contentStyle={styles.content}>
      <View style={styles.header}>
        <Brand testID="login-brand" />
      </View>

      <Panel tone="raised" testID="login-panel" style={styles.panel}>
        <View style={styles.intro}>
          <Text variant="title">Entrar</Text>
          <Text variant="caption" tone="muted">
            Acesse suas inspeções atribuídas.
          </Text>
        </View>

        {failure ? (
          <Feedback
            testID="login-failure"
            tone={failure === 'NETWORK_UNAVAILABLE' ? 'warning' : 'error'}
            message={AUTH_ERROR_MESSAGES[failure]}
          />
        ) : null}

        <View style={styles.form}>
          <Field
            testID="login-email"
            label="E-mail"
            placeholder="voce@empresa.com"
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
            }}
            error={fieldErrors.email}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            keyboardType="email-address"
            inputMode="email"
            returnKeyType="next"
            editable={!submitting}
          />

          <Field
            testID="login-password"
            label="Senha"
            placeholder="Sua senha"
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
            }}
            error={fieldErrors.password}
            secure
            autoCapitalize="none"
            autoComplete="current-password"
            returnKeyType="go"
            onSubmitEditing={handleSubmit}
            editable={!submitting}
          />
        </View>

        <Button
          testID="login-submit"
          label={submitting ? 'Entrando…' : 'Entrar'}
          loading={submitting}
          onPress={handleSubmit}
        />

        <Text variant="caption" tone="muted" style={styles.help}>
          Esqueceu a senha ou perdeu o acesso? Procure o administrador da operação.
        </Text>
      </Panel>

      <Button
        testID="login-back"
        label="Voltar"
        variant="ghost"
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xl,
  },
  header: {
    alignItems: 'flex-start',
  },
  panel: {
    gap: spacing.xl,
  },
  intro: {
    gap: spacing.xs,
  },
  form: {
    gap: spacing.lg,
  },
  help: {
    textAlign: 'center',
  },
});
