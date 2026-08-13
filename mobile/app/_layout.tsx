import { useCallback, useEffect } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { initialWindowMetrics, SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Archivo_700Bold, Archivo_800ExtraBold } from '@expo-google-fonts/archivo';
import {
  Barlow_400Regular,
  Barlow_500Medium,
  Barlow_600SemiBold,
  Barlow_700Bold,
} from '@expo-google-fonts/barlow';

import { SessionProvider } from '@/features/auth/session-context';
import { colors } from '@/design-system';

SplashScreen.preventAutoHideAsync().catch(() => {
  // Em alguns ambientes a splash já foi ocultada; não é motivo para falhar.
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Archivo_700Bold,
    Archivo_800ExtraBold,
    Barlow_400Regular,
    Barlow_500Medium,
    Barlow_600SemiBold,
    Barlow_700Bold,
  });

  // Falha de fonte não pode travar o app em campo: seguimos com a fonte do
  // sistema em vez de deixar a splash aberta indefinidamente.
  const ready = fontsLoaded || !!fontError;

  const hideSplash = useCallback(async () => {
    await SplashScreen.hideAsync().catch(() => {});
  }, []);

  useEffect(() => {
    if (ready) void hideSplash();
  }, [ready, hideSplash]);

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    // Sem as métricas iniciais o provider renderiza vazio no primeiro quadro,
    // o que aparece como um piscar em branco ao abrir o app.
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <SessionProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: 'fade',
          }}
        />
      </SessionProvider>
    </SafeAreaProvider>
  );
}
