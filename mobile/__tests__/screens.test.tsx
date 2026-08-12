import { renderWithProviders, screen, waitFor } from '@/test-utils';
import HistoryScreen from '../app/(protected)/(tabs)/historico';
import HomeScreen from '../app/(protected)/(tabs)/inicio';
import TemplatesScreen from '../app/(protected)/(tabs)/modelos';
import RunInspectionScreen from '../app/(protected)/inspecoes/[inspectionId]';
import NewInspectionScreen from '../app/(protected)/inspecoes/nova';
import NewTemplateScreen from '../app/(protected)/modelos/novo';
import TemplateDetailScreen from '../app/(protected)/modelos/[templateId]';
import LoginScreen from '../app/(public)/login';
import LandingScreen from '../app/index';

/**
 * Smoke test de renderização: cada tela precisa montar sem lançar erro e
 * chegar ao seu conteúdo depois que as consultas resolvem.
 *
 * É o teste que pega tela em branco — um erro em tempo de render aqui vira
 * falha de suíte em vez de um app mudo no dispositivo.
 */

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  canGoBack: jest.fn(() => true),
};

let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => {
  // `require` é obrigatório aqui: a fábrica do jest.mock é içada para antes
  // dos imports do módulo, então um `import` não estaria disponível ainda.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return {
    useRouter: () => mockRouter,
    useLocalSearchParams: () => mockParams,
    Link: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    Redirect: ({ href }: { href: string }) => <View testID={`redirect-${href}`} />,
    Stack: View,
    Tabs: View,
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
});

describe('Landing', () => {
  it('renderiza a chamada principal e o botão de entrada', async () => {
    renderWithProviders(<LandingScreen />);

    await waitFor(() => {
      expect(screen.getByText(/Inspeções industriais/)).toBeTruthy();
    });
    expect(screen.getByText('Começar agora')).toBeTruthy();
    expect(screen.getByText('Modelos de checklist')).toBeTruthy();
  });
});

describe('Login', () => {
  it('renderiza os campos de e-mail e senha', async () => {
    renderWithProviders(<LoginScreen />);

    await waitFor(() => {
      expect(screen.getByLabelText('E-mail')).toBeTruthy();
    });
    expect(screen.getByLabelText('Senha')).toBeTruthy();
    // "Entrar" aparece duas vezes: título do cartão e rótulo do botão.
    expect(screen.getAllByText('Entrar')).toHaveLength(2);
  });
});

describe('Início', () => {
  it('mostra os indicadores e as inspeções em andamento', async () => {
    renderWithProviders(<HomeScreen />);

    await waitFor(() => {
      expect(screen.getByText('MODELOS')).toBeTruthy();
    });
    expect(screen.getByText('EM ANDAMENTO')).toBeTruthy();
    // O título aparece na inspeção em andamento e também em "modelos
    // recentes", já que a inspeção nasceu desse modelo.
    expect(screen.getAllByText('Inspeção de empilhadeira').length).toBeGreaterThan(0);
    expect(screen.getByText('Empilhadeira 01 • Fábrica Sorocaba — Galpão B')).toBeTruthy();
  });
});

describe('Modelos', () => {
  it('lista os modelos disponíveis', async () => {
    renderWithProviders(<TemplatesScreen />);

    await waitFor(() => {
      expect(screen.getByText('Inspeção de extintores')).toBeTruthy();
    });
    expect(screen.getByText('Inspeção de gerador diesel')).toBeTruthy();
  });
});

describe('Histórico', () => {
  it('lista as finalizadas e deixa de fora as em andamento', async () => {
    renderWithProviders(<HistoryScreen />);

    // "Extintor 07" está SUBMITTED e "Empilhadeira 04" APPROVED: ambas contam.
    await waitFor(() => {
      expect(screen.getByText(/Extintor 07/)).toBeTruthy();
    });
    expect(screen.getByText(/Empilhadeira 04/)).toBeTruthy();
    // "Empilhadeira 01" está IN_PROGRESS e não pertence ao histórico.
    expect(screen.queryByText(/Empilhadeira 01/)).toBeNull();
  });
});

describe('Detalhe do modelo', () => {
  it('renderiza os itens do modelo selecionado', async () => {
    mockParams = { templateId: '8f14e45f-ceea-4d1b-9a1e-1c9b0f2a1101' };
    renderWithProviders(<TemplateDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText('O lacre está intacto?')).toBeTruthy();
    });
    expect(screen.getByText('Iniciar inspeção')).toBeTruthy();
  });
});

describe('Novo modelo', () => {
  it('abre com um item em branco pronto para edição', async () => {
    renderWithProviders(<NewTemplateScreen />);

    await waitFor(() => {
      expect(screen.getByText('Itens (1)')).toBeTruthy();
    });
    expect(screen.getByLabelText('Nome do modelo')).toBeTruthy();
    expect(screen.getByText('Adicionar item')).toBeTruthy();
  });
});

describe('Nova inspeção', () => {
  it('lista os modelos para seleção', async () => {
    renderWithProviders(<NewInspectionScreen />);

    await waitFor(() => {
      expect(screen.getByText('Inspeção de extintores')).toBeTruthy();
    });
    expect(screen.getByLabelText('Ativo / equipamento')).toBeTruthy();
  });
});

describe('Execução da inspeção', () => {
  it('renderiza o checklist com progresso e itens do snapshot', async () => {
    mockParams = { inspectionId: 'c0ffee00-0000-4000-8000-000000000001' };
    renderWithProviders(<RunInspectionScreen />);

    await waitFor(() => {
      expect(screen.getByText('Horímetro')).toBeTruthy();
    });
    // 2 das 5 respostas vêm preenchidas nos dados de demonstração.
    expect(screen.getByText('2/5 respondidos')).toBeTruthy();
    expect(screen.getByText('Concluir inspeção')).toBeTruthy();
  });

  it('bloqueia a conclusão listando as pendências', async () => {
    mockParams = { inspectionId: 'c0ffee00-0000-4000-8000-000000000001' };
    renderWithProviders(<RunInspectionScreen />);

    await waitFor(() => {
      expect(screen.getByText(/pendências para concluir/)).toBeTruthy();
    });
  });

  it('deixa a inspeção aprovada somente leitura (RN-043)', async () => {
    mockParams = { inspectionId: 'c0ffee00-0000-4000-8000-000000000004' };
    renderWithProviders(<RunInspectionScreen />);

    await waitFor(() => {
      expect(screen.getByText('Inspeção aprovada')).toBeTruthy();
    });
    expect(screen.queryByText('Concluir inspeção')).toBeNull();
  });
});
