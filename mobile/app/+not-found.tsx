import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button, Screen, spacing, Text } from '@/design-system';

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <Screen scroll={false} center testID="not-found-screen">
      <View style={styles.content}>
        <Text variant="title">Tela não encontrada</Text>
        <Text tone="muted">O endereço acessado não existe neste aplicativo.</Text>
        <Button label="Voltar ao início" onPress={() => router.replace('/')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
});
