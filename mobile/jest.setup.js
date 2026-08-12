// Dublês dos módulos nativos que não existem no ambiente de teste.

// Sinaliza ao React que estamos em ambiente de teste, para que as atualizações
// de estado disparadas por efeitos sejam agrupadas em act().
global.IS_REACT_ACT_ENVIRONMENT = true;

// As fontes do Google não são baixadas nos testes; `useFonts` responde
// imediatamente como carregado para que as telas rendereizem.
jest.mock('@expo-google-fonts/barlow', () => ({
  useFonts: () => [true, null],
  Barlow_400Regular: 'Barlow_400Regular',
  Barlow_500Medium: 'Barlow_500Medium',
  Barlow_600SemiBold: 'Barlow_600SemiBold',
  Barlow_700Bold: 'Barlow_700Bold',
}));

jest.mock('@expo-google-fonts/archivo', () => ({
  Archivo_700Bold: 'Archivo_700Bold',
  Archivo_800ExtraBold: 'Archivo_800ExtraBold',
}));

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
  hideAsync: jest.fn(() => Promise.resolve()),
}));

// Armazenamento seguro em memória, para exercitar o fluxo de sessão.
jest.mock('expo-secure-store', () => {
  const store = new Map();
  return {
    setItemAsync: jest.fn((key, value) => {
      store.set(key, value);
      return Promise.resolve();
    }),
    getItemAsync: jest.fn((key) => Promise.resolve(store.get(key) ?? null)),
    deleteItemAsync: jest.fn((key) => {
      store.delete(key);
      return Promise.resolve();
    }),
    __store: store,
  };
});

jest.mock('expo-crypto', () => {
  let counter = 0;
  return {
    randomUUID: jest.fn(() => {
      counter += 1;
      return `00000000-0000-4000-8000-${String(counter).padStart(12, '0')}`;
    }),
  };
});

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  launchCameraAsync: jest.fn(() =>
    Promise.resolve({ canceled: false, assets: [{ uri: 'file:///foto-de-teste.jpg' }] }),
  ),
}));

// O degradê vira uma View simples; o que importa nos testes é o conteúdo.
jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: View };
});
