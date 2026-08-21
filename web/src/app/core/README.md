# Core — camada de infraestrutura

Serviços que todas as telas da interface administrativa consomem. Sem
componentes e sem estilo: só HTTP, sessão, autorização e modelos.

Fontes normativas: `docs/contrato-backend-frontend.md` (§5 erros, §6
autenticação, §9 paginação, §10 upload) e `docs/telas-frontend.md` (§2
inventário de telas e perfis).

```
core/
├── auth/
│   ├── auth.guard.ts            authGuard, guestGuard, FORBIDDEN_REDIRECT_URL
│   ├── auth.service.ts          login, logout, refreshToken, getCurrentUser
│   ├── auth.store.ts            estado reativo (Observable + Signal)
│   ├── permissions.ts           mapa rota→perfis e escrita por recurso
│   └── token-storage.service.ts guarda dos tokens
├── http/
│   ├── api.service.ts           get/post/put/patch/delete, paginação, multipart
│   ├── auth.interceptor.ts      Bearer + renovação silenciosa
│   ├── error.interceptor.ts     normalização de erro + aviso ao usuário
│   └── http-context.ts          SKIP_AUTH, RETRIED_AFTER_REFRESH, SKIP_ERROR_NOTIFICATION
├── models/
│   ├── domain.ts                reexporta o contrato de shared/src/domain
│   ├── page.model.ts            Page<T>, PageParams, filtros tipados
│   ├── api-error.model.ts       ApiError normalizado
│   └── session.model.ts         sessão da web (tokens, estado)
├── services/
│   └── resources.ts             contratos de domínio + implementações HTTP
├── mocks/
│   ├── mock-services.ts         implementações fictícias sobre o conjunto compartilhado
│   └── mock-session.ts          andaime de sessão (ver o fim deste arquivo)
├── notifications/               canal de mensagens (sem UI)
└── core.providers.ts            provideCore(), provideResources()
```

## Registro

Já ligado em `app.config.ts`:

```ts
providers: [provideRouter(routes), ...provideCore()]
```

`provideCore()` registra o `HttpClient` com os dois interceptadores **nesta
ordem**: `[errorInterceptor, authInterceptor]`. A ordem não é estética — a
requisição percorre a lista na ordem declarada e a resposta volta na inversa,
então o `authInterceptor` precisa estar mais próximo do backend para ver o
`401` e renovar o token **antes** que o erro vire mensagem. Invertendo, todo
token expirado geraria um aviso indevido de "sessão expirada".

`provideCore()` também registra um inicializador que tenta restaurar a sessão
antes do primeiro render (ver "Onde os tokens ficam") e escolhe entre os
serviços reais e os fictícios (ver "Serviços de domínio").

## ApiService

```ts
// Consulta simples
this.api.get<User>(`/users/${id}`);

// Listagem paginada com filtros tipados
type UserFilters = { name?: string; role?: UserRole; status?: UserStatus };

this.api.getPage<User, UserFilters>('/users', {
  page: 0,
  size: 20,
  sort: { field: 'createdAt', direction: 'desc' },
  role: 'ADMIN',
});
```

Na montagem da query string: `null`, `undefined` e string vazia são omitidos
(filtro em branco não é filtro); `Date` vira ISO 8601; array repete a chave;
`sort` vira `campo,direção`. `page` e `size` são limitados à faixa do contrato
(§9.1: `page ≥ 0`, `1 ≤ size ≤ 100`) para não gastar uma ida ao servidor com
`400` garantido.

Upload de evidência (§10):

```ts
this.api.postMultipart<Evidence>(`/inspections/${id}/evidence`, {
  idempotencyKey: crypto.randomUUID(),
  type: 'PHOTO',
  capturedAtDevice: new Date(),
  file,
});

// Com barra de progresso
this.api.uploadWithProgress<Evidence>(path, form);
```

O `Content-Type` do multipart é deixado para o navegador de propósito: definir
o cabeçalho manualmente omite o `boundary` e o servidor rejeita o corpo.

## Sessão

```ts
const auth = inject(AuthService);
const store = inject(AuthStore);

auth.login({ email, password }).subscribe(() => router.navigate(['/dashboard']));
auth.logout().subscribe();

store.user();            // Signal, para componentes
store.isAuthenticated$;  // Observable, para RxJS
store.snapshot;          // leitura síncrona
```

### Onde os tokens ficam

`arquitetura.md` §11.10 pede que a web evite persistir tokens em locais
desnecessariamente expostos. A divisão adotada:

| Token | Onde | Por quê |
|---|---|---|
| access | memória | some ao recarregar; nunca legível em storage |
| refresh | `sessionStorage` | mínimo para o F5 não derrubar o usuário; morre ao fechar a aba |

Como o access token não sobrevive ao recarregamento, `provideCore()` chama
`restoreSession()` na inicialização: havendo refresh token, a sessão é
reconstruída sem pedir a senha de novo. Falha na renovação apenas resulta em
sessão anônima — o app inicia normalmente.

`TokenStorageService` é o único ponto que conhece o mecanismo. Migrar para
cookie `httpOnly` (mais seguro, quando o backend suportar) muda só esse
arquivo.

### Renovação em 401

`AC-AUTH` exige que a operação original seja repetida **uma única vez** após a
renovação. O `authInterceptor` faz isso e trata os casos de borda: 401 na
requisição já repetida encerra a sessão em vez de renovar de novo, e vários
401 simultâneos compartilham uma única chamada a `/auth/refresh` (a renovação
em voo é reaproveitada em `AuthService`).

`/auth/login` e `/auth/refresh` são marcados com `skipAuth()` e ficam fora do
fluxo — sem isso a renovação chamaria a si mesma.

Nada é registrado em log pelo interceptador de autenticação (RN-007: tokens e
credenciais nunca em log).

## Serviços de domínio

Oito recursos: `UsersService`, `ClientsService`, `SitesService`,
`EquipmentService`, `TemplatesService`, `InspectionsService`,
`NonConformitiesService` e `DashboardService`.

Cada um é declarado como **classe abstrata**, que serve ao mesmo tempo de
contrato e de token de injeção. A tela injeta o contrato e não sabe se está
falando com a API ou com o backend fictício:

```ts
export class InspectionsListComponent {
  private readonly inspections = inject(InspectionsService);

  readonly page = toSignal(this.inspections.list({ status: 'SUBMITTED', size: 20 }));
}
```

A escolha acontece uma vez, em `provideResources()`, pelo `environment.mockApi`:

| `mockApi` | Implementação |
|---|---|
| `true` (desenvolvimento) | `MOCK_RESOURCE_PROVIDERS` — dados de `shared/src/mocks` |
| `false` (produção) | `HTTP_RESOURCE_PROVIDERS` — chamadas reais via `ApiService` |

Os mocks não são apenas leitura: as mutações ficam em memória e a tela reflete
na hora. E recusam o que a API recusaria, para a tela não passar no fictício e
quebrar na integração — QR duplicado responde `409` (RN-011), equipamento
descomissionado em nova inspeção `422` (RN-012), cancelar inspeção aprovada
`409` (RN-030), reprovar sem motivo `422` (RN-080).

Nos testes, injete a latência zero e volte o conjunto ao estado semeado:

```ts
beforeEach(() => {
  resetMockStore();
  TestBed.configureTestingModule({
    providers: [...provideResources(true), { provide: MOCK_LATENCY_MS, useValue: 0 }],
  });
});
```

## Contrato de domínio

`core/models/domain.ts` reexporta `shared/src/domain` — os tipos são os mesmos
que o aplicativo Expo usa. Manter uma cópia aqui já custou divergência:
`UserRole` era declarado nos dois lados e nada garantia que continuassem iguais.

Ficam **fora** desse reexporte, de propósito:

- `Page`/`PageQuery` — a web tem um modelo próprio em `page.model.ts`, com
  filtros tipados e limites do contrato, usado pelo `ApiService`. O envelope é
  compatível com o do pacote compartilhado.
- `ApiError` e os modelos de sessão — específicos desta aplicação
  (interceptador, store, storage de token).

## Erros

Todo erro HTTP vira `ApiError`, com a estrutura de `§5.1`:

```ts
this.api.post('/inspections', payload).subscribe({
  error: (error: ApiError) => {
    if (error.isFormError) {
      form.setErrors(error.toFieldErrorMap());   // 400/422 com fieldErrors
    }
    // demais casos já foram avisados pelo errorInterceptor
  },
});
```

Comportamento por status (§5.2):

| Status | Tratamento |
|---|---|
| 400/422 com `fieldErrors` | **não** emite aviso global — pertence ao formulário |
| 401 | passa direto; quem trata é o `authInterceptor` |
| 403 | mensagem genérica "Acesso negado", sem detalhar o recurso |
| 404 | "Não encontrado", sem revelar se existe para outro usuário |
| 409 | aviso (não erro), mensagem específica; o dado local é preservado |
| 413 / 415 | mensagem de tamanho / formato, para o upload |
| 5xx | "Erro interno" — a mensagem crua do servidor nunca chega ao usuário |
| 0 | falha de rede |

O `requestId` é preservado no `ApiError` e registrado no log para correlação
com o servidor. O log inclui apenas `requestId`, `status`, `code`, método e
URL — nunca cabeçalhos ou corpo.

Para uma tela tratar o erro sozinha, sem aviso global:

```ts
this.api.get('/x', { context: skipErrorNotification() });
```

Os avisos saem por `NotificationService.notifications$`. O shell da aplicação
(ainda não construído) é quem assina esse fluxo e renderiza.

## Autorização de rota

```ts
export const routes: Routes = [
  { path: 'login', canActivate: [guestGuard], loadComponent: ... },
  { path: 'dashboard', canActivate: [authGuard], loadComponent: ... },
  { path: 'users', canActivate: [authGuard], loadChildren: ... },
  {
    path: 'inspections/:inspectionId/review',
    canActivate: [authGuard],
    loadComponent: ...,
  },
];
```

O `authGuard` resolve os perfis pelo mapa de `permissions.ts` (rota →
perfis). Declarar `data: { roles: ['ADMIN'] }` sobrepõe o mapa e é herdado por
rotas-filhas. Para rotas com carregamento tardio, `authGuardMatch` em
`canMatch` evita baixar o chunk de uma área não autorizada.

Resultados:

- sem sessão válida → `/login?returnUrl=...`
- autenticado sem perfil → aviso "Acesso negado" e navegação bloqueada

O bloqueio não redireciona por padrão de propósito: mandar para outra rota
protegida poderia cair em laço (um TECHNICIAN não tem acesso nem ao dashboard).
Quando a tela 403 existir, basta fornecê-la:

```ts
{ provide: FORBIDDEN_REDIRECT_URL, useValue: '/forbidden' }
```

Leitura e escrita são separadas — `/clients` é visível ao SUPERVISOR, mas só o
ADMIN escreve. Use `canWrite` para habilitar botões e formulários:

```ts
readonly podeEditar = computed(() => canWrite('clients', this.store.role()));
```

Isto é conveniência de interface. `perfis-de-usuario.md` §5.3 é explícito:
a UI não é barreira suficiente, a API valida a autorização de novo em cada
requisição.

## Andaime de sessão do modo fictício

`mocks/mock-session.ts` abre uma sessão de supervisor direto no `AuthStore`
quando `mockApi` está ligado.

Existe por um motivo específico: as rotas administrativas são protegidas pelo
`authGuard`, que manda ao `/login` quem não tem sessão — e **FE-W01 ainda não
foi implementada**. Sem isso nenhuma tela protegida renderiza e não dá para
conferir nada localmente. O backend fictício cobre os recursos de domínio, não
os endpoints de `/auth`, então a sessão é aberta sem passar pela rede.

**Não é um caminho de autenticação. Apagar quando FE-W01 entrar.**

## Pendências do contrato que afetam esta camada

Herdadas dos docs; nenhuma bloqueia o uso do core, mas todas pedem decisão
antes da integração real:

- **PEND-01** — `expiresIn` e a política do refresh token (duração, uso único,
  rotação) não são normativos. O core usa o `expiresIn` que o servidor devolver
  e assume refresh reutilizável; se a API adotar rotação, `AuthService` já
  grava o novo refresh a cada renovação, então nada muda.
- **PEND-02/09** — só existe um `code` de erro de negócio documentado
  (`INSPECTION_REQUIRED_ITEMS_MISSING`). O `errorInterceptor` trata qualquer
  `code` desconhecido exibindo `message`, como o próprio documento recomenda.
- **PEND-15** — não há parâmetro de busca textual no contrato. Quando for
  definido (`q`? `search`?), entra como mais um filtro em `PageQuery`.
- **PEND-16** — tamanho máximo de upload não definido. A mensagem de `413` já
  existe; falta o número para validar no cliente antes de enviar.
