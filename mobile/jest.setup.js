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

// expo-file-system é nativo. `__files` guarda as URIs criadas por cópia;
// `__missing` simula arquivos de origem que sumiram (copy lança erro).
jest.mock('expo-file-system', () => {
  const files = new Set();
  const missing = new Set();
  const join = (...parts) =>
    parts
      .map((part) => (typeof part === 'string' ? part : part.uri))
      .map((segment, index) =>
        index === 0 ? segment.replace(/\/+$/, '') : segment.replace(/^\/+|\/+$/g, ''),
      )
      .join('/');

  class Directory {
    constructor(...parts) {
      this.uri = join(...parts);
    }
    create() {}
  }

  class File {
    constructor(...parts) {
      this.uri = join(...parts);
    }
    get exists() {
      return files.has(this.uri);
    }
    copy(destination) {
      if (missing.has(this.uri)) throw new Error(`File not found: ${this.uri}`);
      files.add(destination.uri);
    }
    delete() {
      files.delete(this.uri);
    }
  }

  return {
    __files: files,
    __missing: missing,
    File,
    Directory,
    Paths: {
      get document() {
        return new Directory('file:///document');
      },
    },
  };
});

beforeEach(() => {
  const FileSystem = require('expo-file-system');
  FileSystem.__files.clear();
  FileSystem.__missing.clear();
});

// expo-network não existe no ambiente de teste. Por padrão o dispositivo está
// online; cada teste pode sobrescrever com mockResolvedValueOnce.
jest.mock('expo-network', () => ({
  __esModule: true,
  getNetworkStateAsync: jest.fn(),
  addNetworkStateListener: jest.fn(),
}));

// expo-sqlite é nativo; Maps em memória reproduzem o contrato de outbox e
// sync_metadata (insert/update/select) sem I/O real.
// As funções ficam sem implementação no mock factory para que o beforeEach
// possa fazer mockReset() + mockImplementation() sem perder a implementação.
jest.mock('expo-sqlite', () => {
  const store = new Map();
  const metaStore = new Map();
  const cacheStore = new Map();
  const db = {
    execAsync: jest.fn(),
    runAsync: jest.fn(),
    getAllAsync: jest.fn(),
    getFirstAsync: jest.fn(),
  };
  return {
    __store: store,
    __metaStore: metaStore,
    __cacheStore: cacheStore,
    __db: db,
    openDatabaseAsync: jest.fn(async () => db),
  };
});

beforeEach(() => {
  const Network = require('expo-network');
  Network.getNetworkStateAsync
    .mockReset()
    .mockResolvedValue({ isConnected: true, isInternetReachable: true });
  Network.addNetworkStateListener.mockReset().mockReturnValue({ remove: jest.fn() });

  const SQLite = require('expo-sqlite');
  SQLite.__store.clear();
  SQLite.__metaStore.clear();
  SQLite.__cacheStore.clear();
  const store = SQLite.__store;
  const metaStore = SQLite.__metaStore;
  const cacheStore = SQLite.__cacheStore;
  const db = SQLite.__db;

  db.execAsync.mockReset().mockResolvedValue(undefined);
  db.runAsync.mockReset().mockImplementation(async (sql, params) => {
    if (/INSERT OR REPLACE INTO outbox/i.test(sql)) {
      const [id, inspection_id, entity_type, entity_id, operation_type, base_version, payload] =
        params;
      store.set(id, {
        id,
        inspection_id,
        entity_type,
        entity_id,
        operation_type,
        base_version,
        payload,
        synced: 0,
        error_count: 0,
        status: 'PENDING',
        last_error: null,
        created_at: new Date().toISOString(),
      });
    } else if (/UPDATE outbox SET synced = 1/i.test(sql)) {
      for (const rowId of params) {
        const row = store.get(rowId);
        if (row) store.set(rowId, { ...row, synced: 1, status: 'COMPLETED' });
      }
    } else if (/UPDATE outbox SET error_count/i.test(sql)) {
      // markEntryFailed: params = [status, last_error, id]
      const [status, last_error, rowId] = params;
      const row = store.get(rowId);
      if (row) store.set(rowId, { ...row, error_count: row.error_count + 1, status, last_error });
    } else if (/UPDATE outbox SET id = \?/i.test(sql)) {
      // rebaseOutboxEntry: params = [newId, base_version, id]
      const [newId, base_version, rowId] = params;
      const row = store.get(rowId);
      if (row) {
        store.delete(rowId);
        store.set(newId, { ...row, id: newId, base_version, status: 'PENDING', last_error: null });
      }
    } else if (/DELETE FROM outbox WHERE id/i.test(sql)) {
      store.delete(params[0]);
    } else if (/INSERT OR REPLACE INTO read_cache/i.test(sql)) {
      const [key, value] = params;
      cacheStore.set(key, value);
    } else if (/INSERT OR REPLACE INTO sync_metadata/i.test(sql)) {
      const [key, value] = params;
      metaStore.set(key, value);
    }
  });
  db.getAllAsync.mockReset().mockImplementation(async (sql, params) => {
    if (/WHERE status IN/i.test(sql)) {
      return [...store.values()].filter((r) =>
        ['FAILED', 'CONFLICT', 'REJECTED'].includes(r.status),
      );
    }
    // Pendentes: não sincronizadas e não recusadas de vez pelo servidor.
    // ORDER BY created_at, como no SQL (sort estável: empates mantêm a inserção).
    const rows = [...store.values()]
      .filter((r) => r.synced === 0 && r.status !== 'REJECTED')
      .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    if (params && params.length > 0 && params[0]) {
      return rows.filter((r) => r.inspection_id === params[0]);
    }
    return rows;
  });
  db.getFirstAsync.mockReset().mockImplementation(async (sql, params) => {
    if (/COUNT\(\*\)/i.test(sql)) {
      return {
        count: [...store.values()].filter((r) => r.synced === 0 && r.status !== 'REJECTED').length,
      };
    }
    if (/FROM outbox WHERE id = \?/i.test(sql)) {
      return store.get(params && params[0]) ?? null;
    }
    if (/read_cache/i.test(sql)) {
      const key = params && params[0];
      return cacheStore.has(key) ? { value: cacheStore.get(key) } : null;
    }
    if (/sync_metadata/i.test(sql)) {
      const key = params && params[0];
      return metaStore.has(key) ? { value: metaStore.get(key) } : null;
    }
    return null;
  });
});
