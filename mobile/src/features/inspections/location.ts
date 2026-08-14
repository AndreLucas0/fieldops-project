/**
 * Captura da localização de início e conclusão da inspeção (RN-061, RN-062).
 *
 * Nunca lança: em campo, um GPS sem sinal não pode impedir o técnico de
 * trabalhar. O resultado descreve o que aconteceu e a tela decide o que dizer.
 */

import * as Location from 'expo-location';

import type { GeoLocation } from '@/models';

export type LocationOutcome =
  | { status: 'captured'; location: GeoLocation }
  | { status: 'denied' }
  | { status: 'unavailable'; reason: string };

/** Espera máxima pelo GPS antes de seguir sem localização. */
const CAPTURE_TIMEOUT_MS = 10_000;

export async function requestLocationPermission(): Promise<boolean> {
  try {
    const { granted } = await Location.requestForegroundPermissionsAsync();
    return granted;
  } catch {
    return false;
  }
}

export async function captureLocation(): Promise<LocationOutcome> {
  let granted = false;
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    granted = permission.granted;
  } catch {
    return { status: 'unavailable', reason: 'Não foi possível consultar a permissão.' };
  }

  if (!granted) return { status: 'denied' };

  try {
    const position = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      CAPTURE_TIMEOUT_MS,
    );

    if (!position) {
      return { status: 'unavailable', reason: 'O GPS demorou demais para responder.' };
    }

    return {
      status: 'captured',
      location: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        // `accuracy` pode vir nulo em alguns aparelhos.
        accuracyMeters: position.coords.accuracy ?? null,
        capturedAt: new Date(position.timestamp).toISOString(),
      },
    };
  } catch {
    return { status: 'unavailable', reason: 'Não foi possível obter a posição agora.' };
  }
}

/** O temporizador é cancelado quando o GPS responde primeiro — senão fica um
 * `setTimeout` pendurado até o fim, segurando o processo. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), ms);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

/** Texto curto da precisão, para o técnico julgar se a posição serve. */
export function describeAccuracy(location: GeoLocation): string {
  if (location.accuracyMeters == null) return 'Precisão não informada';
  return `Precisão aproximada de ${Math.round(location.accuracyMeters)} m`;
}
