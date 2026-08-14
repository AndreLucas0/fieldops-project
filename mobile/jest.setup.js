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

// O seletor de data é um componente nativo; nos testes basta um marcador que
// permita disparar `onChange` como o diálogo real faria.
jest.mock('@react-native-community/datetimepicker', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: View };
});

// O GPS não existe no ambiente de teste. O padrão concede a permissão e
// devolve uma posição fixa; cada teste sobrescreve o que precisar.
jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3, High: 4 },
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

beforeEach(() => {
  const Location = require('expo-location');
  Location.requestForegroundPermissionsAsync
    .mockReset()
    .mockResolvedValue({ granted: true, status: 'granted' });
  Location.getCurrentPositionAsync.mockReset().mockResolvedValue({
    coords: { latitude: -23.3556, longitude: -46.8781, accuracy: 12 },
    timestamp: Date.parse('2026-08-14T12:00:00Z'),
  });
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

// `expo-crypto` usa API nativa; nos testes basta um gerador incremental para
// os identificadores de resposta ficarem previsíveis.
jest.mock('expo-crypto', () => {
  let counter = 0;
  return {
    randomUUID: jest.fn(() => {
      counter += 1;
      return `00000000-0000-4000-8000-${String(counter).padStart(12, '0')}`;
    }),
  };
});

// A câmera e o seletor de imagem dependem de módulo nativo. Os testes usam a
// permissão negada por padrão (o caminho de fallback, que é o testável) e
// controlam o retorno da galeria caso a caso.
jest.mock('expo-camera', () => {
  const { View } = require('react-native');
  return {
    CameraView: View,
    useCameraPermissions: jest.fn(() => [{ granted: false }, jest.fn()]),
  };
});

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
}));
