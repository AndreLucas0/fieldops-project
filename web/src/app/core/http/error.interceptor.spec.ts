import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { ApiError } from '../models/api-error.model';
import { NotificationService, type AppNotification } from '../notifications/notification.service';
import { authInterceptor } from './auth.interceptor';
import { errorInterceptor } from './error.interceptor';
import { skipErrorNotification } from './http-context';

const API = '/api/v1';

const ERROR_BODY = {
  timestamp: '2026-08-01T14:30:00Z',
  status: 422,
  code: 'INSPECTION_REQUIRED_ITEMS_MISSING',
  message: 'A inspeção possui itens obrigatórios sem resposta.',
  path: '/api/v1/inspections/abc/submit',
  requestId: 'req-123',
  fieldErrors: [{ field: 'responses', message: 'Existem 2 itens obrigatórios pendentes.' }],
};

describe('errorInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let avisos: AppNotification[];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([errorInterceptor, authInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);

    avisos = [];
    TestBed.inject(NotificationService).notifications$.subscribe((aviso) => avisos.push(aviso));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    // O 401 leva o authInterceptor a encerrar a sessão; sem rotas reais, a
    // navegação precisa ser neutralizada.
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    sessionStorage.clear();
  });

  afterEach(() => {
    backend.verify();
    vi.restoreAllMocks();
  });

  function capture(status: number, body: Record<string, unknown> | string | null = null): ApiError {
    let captured: unknown;
    http.get(`${API}/inspections/abc`).subscribe({ error: (error) => (captured = error) });
    backend.expectOne(`${API}/inspections/abc`).flush(body, { status, statusText: 'erro' });
    return captured as ApiError;
  }

  it('converte a resposta no ApiError normalizado', () => {
    const error = capture(422, ERROR_BODY);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.kind).toBe('UNPROCESSABLE');
    expect(error.status).toBe(422);
    expect(error.code).toBe('INSPECTION_REQUIRED_ITEMS_MISSING');
    expect(error.requestId).toBe('req-123');
    expect(error.userMessage).toBe('A inspeção possui itens obrigatórios sem resposta.');
  });

  it('expõe fieldErrors por campo para o formulário', () => {
    const error = capture(422, ERROR_BODY);

    expect(error.hasFieldErrors).toBe(true);
    expect(error.fieldError('responses')).toBe('Existem 2 itens obrigatórios pendentes.');
    expect(error.fieldError('inexistente')).toBeNull();
    expect(error.toFieldErrorMap()).toEqual({
      responses: 'Existem 2 itens obrigatórios pendentes.',
    });
  });

  it('não emite aviso global quando o erro é de campo — quem mostra é o formulário', () => {
    capture(400, { ...ERROR_BODY, status: 400 });

    expect(avisos).toHaveLength(0);
  });

  it('emite aviso global em 400 sem fieldErrors', () => {
    capture(400, { status: 400, message: 'Requisição malformada.' });

    expect(avisos).toHaveLength(1);
    expect(avisos[0].tone).toBe('error');
  });

  it('usa mensagem genérica em 403, sem detalhar o recurso', () => {
    const error = capture(403, { ...ERROR_BODY, status: 403, message: 'Inspeção 42 do cliente X' });

    expect(error.userMessage).toBe('Acesso negado.');
    expect(error.userMessage).not.toContain('42');
    expect(avisos[0].message).toBe('Acesso negado.');
  });

  it('usa mensagem genérica em 404', () => {
    expect(capture(404, ERROR_BODY).userMessage).toBe('Não encontrado.');
  });

  it('nunca expõe a mensagem crua do servidor em 500', () => {
    const error = capture(500, {
      status: 500,
      message: 'NullPointerException at com.fieldops.InspectionService',
    });

    expect(error.userMessage).toBe('Erro interno. Tente novamente em instantes.');
    expect(error.userMessage).not.toContain('NullPointer');
  });

  it('trata 409 como alerta e preserva a mensagem específica', () => {
    const error = capture(409, {
      ...ERROR_BODY,
      status: 409,
      code: 'INSPECTION_VERSION_CONFLICT',
      message: 'A inspeção foi alterada por outra sessão.',
    });

    expect(error.isConflict).toBe(true);
    expect(error.userMessage).toBe('A inspeção foi alterada por outra sessão.');
    // Alerta, não erro: o dado local é preservado e o usuário recarrega (§5.2).
    expect(avisos[0].tone).toBe('warning');
  });

  it('mapeia 413 e 415 do upload de evidência', () => {
    expect(capture(413).kind).toBe('PAYLOAD_TOO_LARGE');
    expect(capture(415).kind).toBe('UNSUPPORTED_MEDIA_TYPE');
  });

  it('trata falha de rede (status 0)', () => {
    const error = capture(0);

    expect(error.kind).toBe('NETWORK');
    expect(error.userMessage).toContain('Sem conexão');
  });

  it('não duplica o tratamento de 401 — quem cuida é o authInterceptor', () => {
    http.get(`${API}/inspections/abc`).subscribe({ error: () => undefined });
    backend
      .expectOne(`${API}/inspections/abc`)
      .flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(avisos).toHaveLength(0);
  });

  it('respeita o pedido de silenciar o aviso', () => {
    http
      .get(`${API}/inspections/abc`, { context: skipErrorNotification() })
      .subscribe({ error: () => undefined });
    backend.expectOne(`${API}/inspections/abc`).flush(null, { status: 500, statusText: 'erro' });

    expect(avisos).toHaveLength(0);
  });

  it('registra requestId no log, sem cabeçalhos nem corpo', () => {
    capture(500, { ...ERROR_BODY, status: 500 });

    expect(console.error).toHaveBeenCalledWith('[api]', {
      requestId: 'req-123',
      status: 500,
      code: 'INSPECTION_REQUIRED_ITEMS_MISSING',
      method: 'GET',
      url: `${API}/inspections/abc`,
    });
  });

  it('sobrevive a um corpo de erro fora do contrato', () => {
    const error = capture(500, '<html>Bad Gateway</html>');

    expect(error.body).toBeNull();
    expect(error.requestId).toBeNull();
    expect(error.userMessage).toBe('Erro interno. Tente novamente em instantes.');
  });
});
