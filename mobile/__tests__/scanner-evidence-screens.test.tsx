import { USER_IDS } from '@fieldops/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';

jest.mock('expo-router', () => require('@/test-utils/expo-router-mock'));

import ScannerScreen from '../app/(protected)/scanner';
import EvidenceCaptureScreen from '../app/(protected)/evidence/capture';
import EvidencePreviewScreen from '../app/(protected)/evidence/preview';
import * as evidenceUpload from '@/features/evidence/evidence-upload';
import { readCapture, resetCaptures, stashCapture } from '@/features/evidence/pending-capture';
import { resetRouterMock, routerMock, setSearchParams } from '@/test-utils/expo-router-mock';
import { buildTestAuthService, renderWithSession, seedStoredSession } from '@/test-utils/render';
import { configureApi, getMockDatabase, resetApiConfig, resetMockDatabase } from '@/services';

const TECHNICIAN_ID = USER_IDS.technician;

function asMock<T>(fn: T): jest.Mock {
  return fn as unknown as jest.Mock;
}

/**
 * URI real de arquivo no Expo Go: o diretório da experiência vem codificado
 * (`%2540anonymous%252F...`). Decodificá-la aponta para um arquivo inexistente.
 */
const EXPO_GO_URI =
  'file:///data/user/0/host.exp.exponent/cache/ExperienceData/%2540anonymous%252Fmobile-abc123/Camera/foto.jpg';

beforeEach(() => {
  resetRouterMock();
  resetCaptures();
  resetMockDatabase();
  configureApi({ mockEnabled: true, mockLatencyMs: 0 });
});

afterEach(() => {
  resetApiConfig();
});

async function signedIn() {
  const accessToken = 'mock-access.teste';
  getMockDatabase().accessTokens.set(accessToken, TECHNICIAN_ID);

  await seedStoredSession({
    accessToken,
    refreshToken: 'mock-refresh.teste',
    expiresAt: Date.now() + 15 * 60 * 1000,
    user: {
      id: TECHNICIAN_ID,
      name: 'Carlos Souza',
      email: 'tecnico@fieldops.local',
      role: 'TECHNICIAN',
    },
  });
}

async function render(ui: React.ReactElement, params: Record<string, string> = {}) {
  await signedIn();
  setSearchParams(params);
  return renderWithSession(ui, { service: buildTestAuthService() });
}

describe('FE-M11 — Scanner QR', () => {
  it('sem permissão de câmera, oferece a busca pelo código', async () => {
    await render(<ScannerScreen />);

    expect(screen.getByTestId('scanner-sem-camera')).toBeOnTheScreen();
    expect(screen.getByTestId('scanner-codigo')).toBeOnTheScreen();
  });

  it('encontra o equipamento e exibe os dados do cadastro', async () => {
    await render(<ScannerScreen />);

    await fireEvent.changeText(screen.getByTestId('scanner-codigo'), 'GD001');
    await fireEvent.press(screen.getByTestId('scanner-buscar'));

    await waitFor(() => expect(screen.getByTestId('scanner-equipamento')).toBeOnTheScreen());

    const card = screen.getByTestId('scanner-equipamento');
    expect(card).toHaveTextContent(/Gerador GD-001/);
    expect(card).toHaveTextContent(/PAT-000001/);
    expect(card).toHaveTextContent(/GD001-2021-4471/);
    expect(card).toHaveTextContent(/Stemac/);
    expect(card).toHaveTextContent(/Ativo/);
  });

  it('avisa quando o código não corresponde a nenhum equipamento', async () => {
    await render(<ScannerScreen />);

    await fireEvent.changeText(screen.getByTestId('scanner-codigo'), 'CODIGO-INEXISTENTE');
    await fireEvent.press(screen.getByTestId('scanner-buscar'));

    await waitFor(() => expect(screen.getByTestId('scanner-nao-encontrado')).toBeOnTheScreen());
    expect(screen.getByTestId('scanner-nao-encontrado')).toHaveTextContent(/não localizado/);
  });

  it('simula a leitura no modo mock', async () => {
    await render(<ScannerScreen />);

    await fireEvent.press(screen.getByTestId('scanner-simular'));

    await waitFor(() => expect(screen.getByTestId('scanner-equipamento')).toBeOnTheScreen());
  });

  it('alerta quando o equipamento lido diverge do esperado (PEND-F03)', async () => {
    const outro = getMockDatabase().equipment[1];
    await render(<ScannerScreen />, { expectedEquipmentId: outro?.id ?? 'outro' });

    await fireEvent.press(screen.getByTestId('scanner-simular'));

    await waitFor(() => expect(screen.getByTestId('scanner-divergencia')).toBeOnTheScreen());
    expect(screen.getByTestId('scanner-aviso-divergencia')).toBeOnTheScreen();
  });

  it('não alerta quando o equipamento é o esperado', async () => {
    const esperado = getMockDatabase().equipment.find((item) => item.qrCode === 'GD001');
    await render(<ScannerScreen />, { expectedEquipmentId: esperado?.id ?? '' });

    await fireEvent.press(screen.getByTestId('scanner-simular'));

    await waitFor(() => expect(screen.getByTestId('scanner-equipamento')).toBeOnTheScreen());
    expect(screen.queryByTestId('scanner-divergencia')).toBeNull();
  });

  it('permite continuar apesar da divergência', async () => {
    const outro = getMockDatabase().equipment[1];
    await render(<ScannerScreen />, { expectedEquipmentId: outro?.id ?? 'outro' });

    await fireEvent.press(screen.getByTestId('scanner-simular'));
    await waitFor(() => expect(screen.getByTestId('scanner-divergencia')).toBeOnTheScreen());

    await fireEvent.press(screen.getByTestId('scanner-divergencia-continuar'));

    expect(screen.queryByTestId('scanner-divergencia')).toBeNull();
    expect(screen.getByTestId('scanner-equipamento')).toBeOnTheScreen();
  });
});

describe('FE-M12 — Captura de evidência', () => {
  it('oferece a galeria quando a câmera não está disponível', async () => {
    await render(<EvidenceCaptureScreen />, { inspectionId: 'insp-1' });

    expect(screen.getByTestId('captura-sem-camera')).toBeOnTheScreen();
    expect(screen.getByTestId('captura-galeria')).toBeOnTheScreen();
    expect(screen.queryByTestId('captura-fotografar')).toBeNull();
  });

  it('leva a imagem escolhida e a descrição para a prévia', async () => {
    asMock(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///foto.jpg' }],
    });

    await render(<EvidenceCaptureScreen />, {
      inspectionId: 'insp-1',
      origin: 'checklist',
      responseId: 'resp-1',
    });

    await fireEvent.changeText(screen.getByTestId('captura-descricao'), 'Painel obstruído');
    await fireEvent.press(screen.getByTestId('captura-galeria'));

    await waitFor(() =>
      expect(routerMock.push).toHaveBeenCalledWith({
        pathname: '/evidence/preview',
        params: expect.objectContaining({
          inspectionId: 'insp-1',
          origin: 'checklist',
          responseId: 'resp-1',
          captureId: expect.any(String),
          description: 'Painel obstruído',
        }),
      }),
    );

    const { params } = routerMock.push.mock.calls[0][0];
    expect(readCapture(params.captureId)).toBe('file:///foto.jpg');
  });

  it('não leva a URI do arquivo na rota (o expo-router a decodificaria)', async () => {
    asMock(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
      canceled: false,
      assets: [{ uri: EXPO_GO_URI }],
    });

    await render(<EvidenceCaptureScreen />, { inspectionId: 'insp-1' });

    await fireEvent.press(screen.getByTestId('captura-galeria'));

    await waitFor(() => expect(routerMock.push).toHaveBeenCalled());
    const { params } = routerMock.push.mock.calls[0][0];
    expect(params).not.toHaveProperty('uri');
    expect(readCapture(params.captureId)).toBe(EXPO_GO_URI);
  });

  it('cancelar a galeria não navega', async () => {
    asMock(ImagePicker.launchImageLibraryAsync).mockResolvedValue({ canceled: true, assets: [] });

    await render(<EvidenceCaptureScreen />, { inspectionId: 'insp-1' });

    await fireEvent.press(screen.getByTestId('captura-galeria'));

    await waitFor(() => expect(routerMock.push).not.toHaveBeenCalled());
  });
});

describe('FE-M13 — Prévia de evidência', () => {
  function inspectionId(): string {
    const found = getMockDatabase().inspections.find(
      (inspection) => inspection.status === 'IN_PROGRESS',
    );
    return found?.id ?? '';
  }

  it('mostra o vínculo de origem', async () => {
    await render(<EvidencePreviewScreen />, {
      inspectionId: inspectionId(),
      captureId: stashCapture('file:///foto.jpg'),
      responseId: 'resp-1',
    });

    expect(screen.getByTestId('previa-vinculo')).toHaveTextContent(/resposta do item/);
    expect(screen.getByTestId('previa-imagem')).toBeOnTheScreen();
  });

  it('identifica evidência de não conformidade', async () => {
    await render(<EvidencePreviewScreen />, {
      inspectionId: inspectionId(),
      captureId: stashCapture('file:///foto.jpg'),
      nonConformityId: 'nc-1',
    });

    expect(screen.getByTestId('previa-vinculo')).toHaveTextContent(/não conformidade/);
  });

  it('refazer volta sem enviar nada', async () => {
    const id = inspectionId();
    const antes = getMockDatabase().evidence[id]?.length ?? 0;

    await render(<EvidencePreviewScreen />, {
      inspectionId: id,
      captureId: stashCapture('file:///foto.jpg'),
    });

    await fireEvent.press(screen.getByTestId('previa-refazer'));

    expect(routerMock.back).toHaveBeenCalled();
    expect(getMockDatabase().evidence[id]?.length ?? 0).toBe(antes);
  });

  it('confirmar envia a evidência e volta ao checklist', async () => {
    const id = inspectionId();
    const antes = getMockDatabase().evidence[id]?.length ?? 0;

    await render(<EvidencePreviewScreen />, {
      inspectionId: id,
      captureId: stashCapture('file:///foto.jpg'),
      origin: 'checklist',
      responseId: 'resp-1',
      description: 'Painel obstruído',
    });

    await fireEvent.press(screen.getByTestId('previa-confirmar'));

    await waitFor(() =>
      expect(routerMock.dismissTo).toHaveBeenCalledWith({
        pathname: '/inspections/[inspectionId]/checklist',
        params: { inspectionId: id },
      }),
    );

    const lista = getMockDatabase().evidence[id] ?? [];
    expect(lista.length).toBe(antes + 1);
    expect(lista[lista.length - 1]?.responseId).toBe('resp-1');
  });

  it('envia o arquivo pela URI original do Expo Go, sem decodificar', async () => {
    const id = inspectionId();
    const upload = jest.spyOn(evidenceUpload, 'uploadEvidence');

    await render(<EvidencePreviewScreen />, {
      inspectionId: id,
      captureId: stashCapture(EXPO_GO_URI),
      origin: 'checklist',
    });

    await fireEvent.press(screen.getByTestId('previa-confirmar'));

    await waitFor(() => expect(routerMock.dismissTo).toHaveBeenCalled());
    expect(upload).toHaveBeenCalledWith(expect.objectContaining({ fileUri: EXPO_GO_URI }));
    upload.mockRestore();
  });

  it('evidência de NC volta para a lista de não conformidades', async () => {
    const id = inspectionId();

    await render(<EvidencePreviewScreen />, {
      inspectionId: id,
      captureId: stashCapture('file:///foto.jpg'),
      origin: 'non-conformities',
      nonConformityId: 'nc-1',
    });

    await fireEvent.press(screen.getByTestId('previa-confirmar'));

    await waitFor(() =>
      expect(routerMock.dismissTo).toHaveBeenCalledWith({
        pathname: '/inspections/[inspectionId]/non-conformities',
        params: { inspectionId: id },
      }),
    );
  });

  it('mostra a falha do servidor sem sair da tela', async () => {
    await render(<EvidencePreviewScreen />, {
      inspectionId: 'inspecao-inexistente',
      captureId: stashCapture('file:///foto.jpg'),
    });

    await fireEvent.press(screen.getByTestId('previa-confirmar'));

    await waitFor(() => expect(screen.getByTestId('previa-falha')).toBeOnTheScreen());
    expect(routerMock.dismissTo).not.toHaveBeenCalled();
  });
});
