import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '../tokens';

export type ScreenProps = {
  children: ReactNode;
  /** Rola o conteúdo — necessário em telas com formulário e teclado aberto. */
  scroll?: boolean;
  /** Centraliza verticalmente o conteúdo (landing e login). */
  center?: boolean;
  contentStyle?: ViewStyle;
  testID?: string;
};

export function Screen({ children, scroll = true, center = false, contentStyle, testID }: ScreenProps) {
  const insets = useSafeAreaInsets();

  const padding: ViewStyle = {
    paddingTop: insets.top + spacing.lg,
    paddingBottom: insets.bottom + spacing['2xl'],
    paddingHorizontal: spacing.xl,
  };

  const content = scroll ? (
    <ScrollView
      testID={testID}
      style={styles.flex}
      contentContainerStyle={[styles.content, center && styles.centered, padding, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  ) : (
    <View testID={testID} style={[styles.flex, center && styles.centered, padding, contentStyle]}>
      {children}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {content}
    </KeyboardAvoidingView>
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
  content: {
    flexGrow: 1,
  },
  centered: {
    justifyContent: 'center',
  },
});
