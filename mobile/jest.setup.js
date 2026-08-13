// As fontes do Google são baixadas em tempo de execução; nos testes basta
// declarar que já carregaram para o layout raiz seguir adiante.
jest.mock('expo-font', () => ({
  useFonts: jest.fn(),
  isLoaded: () => true,
  isLoading: () => false,
  loadAsync: jest.fn(),
  unloadAsync: jest.fn(),
}));

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(async () => {}),
  hideAsync: jest.fn(async () => {}),
  setOptions: jest.fn(),
}));

// SecureStore não existe no ambiente de teste: um mapa em memória reproduz o
// contrato (get/set/delete) sem tocar no keychain nativo.
jest.mock('expo-secure-store', () => {
  const store = new Map();
  return {
    __store: store,
    isAvailableAsync: jest.fn(),
    getItemAsync: jest.fn(),
    setItemAsync: jest.fn(),
    deleteItemAsync: jest.fn(),
  };
});

// Fora do device não existem métricas de área segura; o mock oficial fornece
// valores estáveis (inclusive `initialWindowMetrics`).
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: View };
});

beforeEach(() => {
  const Font = require('expo-font');
  Font.useFonts.mockReset().mockReturnValue([true, null]);
  Font.loadAsync.mockReset().mockResolvedValue(undefined);
  Font.unloadAsync.mockReset().mockResolvedValue(undefined);

  const Splash = require('expo-splash-screen');
  Splash.preventAutoHideAsync.mockClear();
  Splash.hideAsync.mockClear();

  const SecureStore = require('expo-secure-store');
  SecureStore.__store.clear();

  // As implementações são reinstaladas a cada teste: assim um
  // `mockImplementationOnce` de um caso não vaza para o seguinte.
  SecureStore.isAvailableAsync.mockReset().mockResolvedValue(true);
  SecureStore.getItemAsync
    .mockReset()
    .mockImplementation(async (key) =>
      SecureStore.__store.has(key) ? SecureStore.__store.get(key) : null,
    );
  SecureStore.setItemAsync.mockReset().mockImplementation(async (key, value) => {
    SecureStore.__store.set(key, value);
  });
  SecureStore.deleteItemAsync.mockReset().mockImplementation(async (key) => {
    SecureStore.__store.delete(key);
  });
});
