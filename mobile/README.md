# FieldOps — Aplicativo Mobile

Aplicativo de campo do FieldOps, em Expo (SDK 57) + expo-router.

Esta fase entrega **apresentação, login e a barreira da área protegida**. A
autenticação usa um serviço simulado com o mesmo formato de
`POST /api/v1/auth/login` (`docs/api-rest.md` §12.4), para que a troca pelo
cliente HTTP real não exija mudança nas telas.

## Como rodar

```bash
npm install
npm start          # abre o Expo; use "a" para Android
npm run android    # abre direto no emulador/dispositivo Android
```

## Verificações

```bash
npm test           # Jest + Testing Library
npm run typecheck  # tsc --noEmit
npm run lint       # ESLint
```

## Contas de demonstração

Enquanto a API não está conectada, o login aceita as contas de
`src/features/auth/auth-service.ts`:

| E-mail | Senha | Resultado |
|---|---|---|
| `tecnico@fieldops.local` | `fieldops123` | entra como Técnico |
| `supervisor@fieldops.local` | `fieldops123` | entra como Supervisor |
| `inativo@fieldops.local` | `fieldops123` | recusado: usuário inativo (RN-001) |

Qualquer outra combinação retorna a mesma mensagem genérica de credencial
inválida — AC-AUTH exige não revelar se o e-mail existe.

Para simular a falta de rede em um teste ou demonstração:

```ts
import { configureMockAuth } from '@/features/auth/auth-service';

configureMockAuth({ online: false });
```

## Estrutura

```
app/
├── _layout.tsx              # fontes, sessão e Stack raiz
├── (public)/
│   ├── index.tsx            # apresentação (rota "/")
│   └── login.tsx            # login
├── (protected)/
│   ├── _layout.tsx          # barreira de rota
│   └── inicio.tsx           # início provisório
└── +not-found.tsx

src/
├── design-system/           # tokens e componentes (Screen, Button, Field, …)
├── domain/auth.ts           # regras puras: validação, sessão, perfis
├── features/auth/           # serviço, armazenamento seguro e contexto
├── features/onboarding/     # conteúdo da apresentação
└── test-utils/              # helpers de teste (router mockado, render)
```

## Decisões que valem registro

- **Sem cadastro e sem login social.** Contas são criadas pelo administrador
  (`docs/perfis-de-usuario.md`), e a API só expõe `login`, `refresh`, `logout`
  e `me`. O protótipo mostrava "Criar conta" e "Continuar com Google"; ambos
  ficaram de fora por não terem contrato correspondente.
- **A sessão fica no SecureStore**, nunca em armazenamento comum. Na web (só
  desenvolvimento) ela vive em memória, porque o SecureStore não existe ali.
- **Estado nunca é comunicado apenas por cor** (`docs/aplicativo-mobile.md`
  §13.9): todo aviso traz rótulo textual.
- **A barreira de rota é conveniência de interface.** A autorização real é da
  API (`docs/perfis-de-usuario.md` §5.3).

## Próximo passo

Substituir `mockAuthService` por um cliente HTTP que implemente a mesma
interface `AuthService` e apontar para a API. Nada mais precisa mudar nas
telas.
