import {
  Archivo_700Bold,
  Archivo_800ExtraBold,
} from '@expo-google-fonts/archivo';
import {
  Barlow_400Regular,
  Barlow_500Medium,
  Barlow_600SemiBold,
  Barlow_700Bold,
  useFonts,
} from '@expo-google-fonts/barlow';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '@/design-system';
import { SessionProvider } from '@/features/auth/session-context';

SplashScreen.preventAutoHideAsync().catch(() => {
  // Em alguns ambientes a splash já foi escondida; não é um erro fatal.
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // O técnico trabalha em rede instável: evitamos refetch agressivo e
      // mantemos o dado em cache por mais tempo (docs §13.6).
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Barlow_400Regular,
    Barlow_500Medium,
    Barlow_600SemiBold,
    Barlow_700Bold,
    Archivo_700Bold,
    Archivo_800ExtraBold,
  });
  const [splashHidden, setSplashHidden] = useState(false);

  // Falha ao baixar a fonte não pode impedir o app de abrir — o sistema
  // assume a tipografia e o técnico segue trabalhando.
  const ready = fontsLoaded || !!fontError;

  useEffect(() => {
    if (ready && !splashHidden) {
      SplashScreen.hideAsync()
        .catch(() => undefined)
        .finally(() => setSplashHidden(true));
    }
  }, [ready, splashHidden]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.background }} />;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <SessionProvider>
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
                animation: 'slide_from_right',
              }}
            />
          </SessionProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
