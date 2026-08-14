import { maskBrDate, parseBrDate, toIsoDate } from './DateField';

describe('maskBrDate', () => {
  it('insere as barras conforme a digitação avança', () => {
    expect(maskBrDate('1')).toBe('1');
    expect(maskBrDate('14')).toBe('14');
    expect(maskBrDate('1408')).toBe('14/08');
    expect(maskBrDate('14082026')).toBe('14/08/2026');
  });

  it('ignora o que não for dígito e descarta o excedente', () => {
    expect(maskBrDate('14/08/2026')).toBe('14/08/2026');
    expect(maskBrDate('14a08b2026')).toBe('14/08/2026');
    expect(maskBrDate('140820261234')).toBe('14/08/2026');
  });

  it('permite apagar até esvaziar', () => {
    expect(maskBrDate('')).toBe('');
  });
});

describe('parseBrDate', () => {
  it('converte data completa para o formato do contrato', () => {
    expect(parseBrDate('14/08/2026')).toBe('2026-08-14');
    expect(parseBrDate('01/01/2026')).toBe('2026-01-01');
  });

  it('devolve nulo enquanto a data está incompleta', () => {
    expect(parseBrDate('')).toBeNull();
    expect(parseBrDate('14')).toBeNull();
    expect(parseBrDate('14/08')).toBeNull();
    expect(parseBrDate('14/08/20')).toBeNull();
  });

  it('recusa data que não existe no calendário', () => {
    expect(parseBrDate('31/02/2026')).toBeNull();
    expect(parseBrDate('32/01/2026')).toBeNull();
    expect(parseBrDate('14/13/2026')).toBeNull();
  });

  it('aceita 29 de fevereiro em ano bissexto', () => {
    expect(parseBrDate('29/02/2024')).toBe('2024-02-29');
    expect(parseBrDate('29/02/2026')).toBeNull();
  });
});

describe('toIsoDate', () => {
  it('usa o calendário local, sem deslocar por fuso', () => {
    // Meia-noite local em 14/08 continua sendo 14/08, e não 13/08 em UTC.
    expect(toIsoDate(new Date(2026, 7, 14, 0, 0, 0))).toBe('2026-08-14');
    expect(toIsoDate(new Date(2026, 7, 14, 23, 59, 59))).toBe('2026-08-14');
  });
});
