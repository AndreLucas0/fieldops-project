import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, spacing } from '../tokens';
import { Text } from './Text';

/**
 * Casca das telas — porte do `MobileShell` do protótipo.
 *
 * Reproduz o cabeçalho fixo (voltar, título, subtítulo, ação) e a "hazard
 * line" âmbar abaixo dele. A navegação inferior não vive aqui: no Expo Router
 * ela é o Tabs navigator, em `app/(protected)/(tabs)/_layout.tsx`.
 */

export interface ScreenProps {
  title: string;
  subtitle?: string;
  /** Ação à direita do cabeçalho. */
  action?: ReactNode;
  /** Exibe o botão de voltar à esquerda do título. */
  showBack?: boolean;
  children: ReactNode;
  /** Desliga o ScrollView para telas que gerenciam a própria rolagem. */
  scrollable?: boolean;
  /** Espaço extra no rodapé — usado nas telas sob a barra de abas. */
  contentBottomInset?: number;
}

export function Screen({
  title,
  subtitle,
  action,
  showBack,
  children,
  scrollable = true,
  contentBottomInset = spacing['3xl'],
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const content = (
    <View style={styles.content}>{children}</View>
  );

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            {showBack && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Voltar"
                onPress={() => (router.canGoBack() ? router.back() : router.replace('/inicio'))}
                style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
              >
                <ArrowLeft size={18} color={colors.foreground} />
              </Pressable>
            )}
            <View style={styles.titleBlock}>
              <Text variant="title" numberOfLines={1}>
                {title}
              </Text>
              {subtitle && (
                <Text variant="caption" color="mutedForeground" numberOfLines={1}>
                  {subtitle}
                </Text>
              )}
            </View>
          </View>
          {action && <View style={styles.headerAction}>{action}</View>}
        </View>
        <HazardLine />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        {scrollable ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={{ paddingBottom: contentBottomInset }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {content}
          </ScrollView>
        ) : (
          content
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

/**
 * Faixa listrada âmbar do protótipo (`@utility hazard-line`). O RN não tem
 * repeating-linear-gradient, então as listras são desenhadas como uma régua de
 * blocos inclinados.
 */
export function HazardLine({ height = 3 }: { height?: number }) {
  return (
    <View style={[styles.hazard, { height }]}>
      {Array.from({ length: 40 }).map((_, index) => (
        <View key={index} style={[styles.hazardStripe, { height }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minWidth: 0,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  headerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconButton: {
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
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    gap: spacing.xl,
  },
  hazard: {
    flexDirection: 'row',
    overflow: 'hidden',
    opacity: 0.6,
  },
  hazardStripe: {
    width: 10,
    marginRight: 10,
    backgroundColor: colors.primary,
    transform: [{ skewX: '-45deg' }],
  },
});
