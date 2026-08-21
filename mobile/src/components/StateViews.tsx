import { ActivityIndicator, StyleSheet, View, type ViewStyle } from 'react-native';

import { Button, colors, Icon, spacing, Text, type IconName } from '@/design-system';

/**
 * Estados padrão de tela: carregando, vazio e erro.
 *
 * Ficam juntos porque as três telas de lista do app alternam entre eles, e
 * manter o mesmo espaçamento e a mesma hierarquia evita que a tela "pule" ao
 * trocar de estado.
 */

export type LoadingSpinnerProps = {
  /** Texto abaixo do indicador. */
  message?: string;
  /** `inline` para dentro de um cartão; `block` ocupa o espaço disponível. */
  variant?: 'block' | 'inline';
  style?: ViewStyle;
  testID?: string;
};

export function LoadingSpinner({
  message = 'Carregando…',
  variant = 'block',
  style,
  testID,
}: LoadingSpinnerProps) {
  return (
    <View
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityLabel={message}
      style={[variant === 'block' ? styles.block : styles.inline, style]}>
      <ActivityIndicator size={variant === 'block' ? 'large' : 'small'} color={colors.primary} />

      {message ? (
        <Text variant="caption" tone="muted" style={styles.centered}>
          {message}
        </Text>
      ) : null}
    </View>
  );
}

export type EmptyStateProps = {
  /** Ícone do conjunto do design system. */
  icon?: IconName;
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
  testID?: string;
};

/**
 * Ausência de dados não é erro (`docs/telas-frontend.md` FE-M03): sem cor de
 * alerta, e com o caminho para a próxima ação quando existir.
 */
export function EmptyState({
  icon = 'clipboard',
  title = 'Nenhum registro',
  message,
  actionLabel,
  onAction,
  style,
  testID,
}: EmptyStateProps) {
  return (
    <View testID={testID} style={[styles.block, style]}>
      <Icon name={icon} size={40} color={colors.mutedForeground} />

      <Text variant="subtitle" style={styles.centered}>
        {title}
      </Text>

      {message ? (
        <Text variant="caption" tone="muted" style={styles.centered}>
          {message}
        </Text>
      ) : null}

      {actionLabel && onAction ? (
        <Button
          testID={testID ? `${testID}-action` : undefined}
          label={actionLabel}
          onPress={onAction}
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

export type ErrorStateProps = {
  /** Mensagem já em linguagem de negócio — use `ApiError.message`. */
  message?: string;
  title?: string;
  /** Código da ocorrência, para correlacionar com o log do servidor. */
  requestId?: string | null;
  onRetry?: () => void;
  retryLabel?: string;
  style?: ViewStyle;
  testID?: string;
};

export function ErrorState({
  title = 'Não foi possível carregar',
  message = 'Tente novamente em instantes.',
  requestId,
  onRetry,
  retryLabel = 'Tentar novamente',
  style,
  testID,
}: ErrorStateProps) {
  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.block, style]}>
      <Icon name="offline" size={40} color={colors.destructive} />

      <Text variant="subtitle" style={styles.centered}>
        {title}
      </Text>

      <Text variant="caption" tone="muted" style={styles.centered}>
        {message}
      </Text>

      {requestId ? (
        <Text variant="caption" tone="muted" style={styles.centered}>
          Código da ocorrência: {requestId}
        </Text>
      ) : null}

      {onRetry ? (
        <Button
          testID={testID ? `${testID}-retry` : undefined}
          label={retryLabel}
          variant="outline"
          onPress={onRetry}
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing['4xl'],
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  centered: {
    textAlign: 'center',
  },
  action: {
    marginTop: spacing.md,
    alignSelf: 'stretch',
  },
});
