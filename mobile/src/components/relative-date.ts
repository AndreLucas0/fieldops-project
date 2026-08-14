/**
 * Datas do ponto de vista de quem está em campo.
 *
 * "Hoje, 14:30" responde a pergunta do técnico ("é agora?") melhor que
 * "14/08/2026 14:30". Fora da janela próxima, a data completa volta a ser mais
 * informativa que "em 12 dias".
 */

const MS_PER_DAY = 86_400_000;

function startOfDay(value: Date): number {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
}

/** Diferença em dias de calendário — ignora a hora, então 23h→01h é 1 dia. */
export function calendarDaysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to) - startOfDay(from)) / MS_PER_DAY);
}

export function formatTime(value: Date): string {
  const hours = String(value.getHours()).padStart(2, '0');
  const minutes = String(value.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/** `dd/MM/yyyy` — mesmo formato das listagens da interface administrativa. */
export function formatDate(value: Date): string {
  const day = String(value.getDate()).padStart(2, '0');
  const month = String(value.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${value.getFullYear()}`;
}

/** `dd/MM/yyyy HH:mm`. */
export function formatDateTime(value: Date): string {
  return `${formatDate(value)} ${formatTime(value)}`;
}

/** Converte texto ISO da API em `Date`, ou `null` se vier inválido. */
export function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Agendamento em linguagem de campo: "Hoje, 14:30", "Amanhã, 08:00",
 * "Ontem, 09:00" ou a data completa. `now` é injetável para teste.
 */
export function formatScheduledFor(
  value: string | Date | null | undefined,
  now: Date = new Date(),
): string {
  const date = value instanceof Date ? value : parseIsoDate(value);
  if (!date) return '—';

  switch (calendarDaysBetween(now, date)) {
    case 0:
      return `Hoje, ${formatTime(date)}`;
    case 1:
      return `Amanhã, ${formatTime(date)}`;
    case -1:
      return `Ontem, ${formatTime(date)}`;
    default:
      return formatDateTime(date);
  }
}

/**
 * Agendamento vencido: passou da hora e a inspeção ainda não terminou.
 * Quem decide "não terminou" é a tela, pelo `status`.
 */
export function isOverdue(value: string | Date | null | undefined, now: Date = new Date()): boolean {
  const date = value instanceof Date ? value : parseIsoDate(value);
  return date !== null && date.getTime() < now.getTime();
}
