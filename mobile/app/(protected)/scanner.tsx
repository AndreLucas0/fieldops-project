import { EmptyState } from '@/components';
import { Screen } from '@/design-system';

/**
 * FE-M11 — Scanner QR.
 *
 * Espaço reservado: a leitura de QR (`GET /equipment/by-qr/{qrCode}`) entra na
 * etapa da tela de scanner. Existe agora para que "Ler QR Code" no início
 * tenha um destino real em vez de cair no "não encontrado".
 *
 * O voltar vem do cabeçalho nativo, configurado em `(protected)/_layout.tsx`.
 */
export default function ScannerScreen() {
  return (
    <Screen testID="scanner-screen" insetTop={false}>
      <EmptyState
        icon="camera"
        title="Leitor de QR Code"
        message="Esta tela ainda será construída. Ela vai identificar o equipamento pelo código e abrir a inspeção correspondente."
      />
    </Screen>
  );
}
