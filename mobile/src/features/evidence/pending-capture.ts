/**
 * Foto capturada à espera de confirmação, entre a captura (FE-M12) e a prévia (FE-M13).
 *
 * A URI do arquivo não pode viajar como parâmetro de rota: o `useLocalSearchParams`
 * do expo-router aplica `decodeURIComponent` a todo valor, e no Expo Go o caminho do
 * cache traz o diretório da experiência já codificado (`%2540anonymous%252F...`).
 * Decodificado, aponta para um arquivo que não existe e o upload falha antes de sair
 * do aparelho. Por isso a rota leva só um id simples e a URI fica aqui, intacta.
 *
 * Memória do processo: se o app for reiniciado, a prévia não encontra a foto e pede
 * nova captura — o mesmo que aconteceria com um arquivo de cache descartado.
 */

const captures = new Map<string, string>();
let sequence = 0;

/** Guarda a URI e devolve o id a passar na rota. */
export function stashCapture(uri: string): string {
  sequence += 1;
  const id = `captura-${sequence}`;
  captures.set(id, uri);
  return id;
}

/** URI original da captura, ou `null` se o id for desconhecido. */
export function readCapture(id: string | null | undefined): string | null {
  if (!id) return null;
  return captures.get(id) ?? null;
}

/** Descarta a captura depois do envio. */
export function releaseCapture(id: string | null | undefined): void {
  if (id) captures.delete(id);
}

/** Apenas para testes. */
export function resetCaptures(): void {
  captures.clear();
  sequence = 0;
}
