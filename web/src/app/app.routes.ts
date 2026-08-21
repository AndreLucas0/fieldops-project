import type { Routes } from '@angular/router';

import { authGuard } from './core/auth/auth.guard';

/**
 * Rotas da interface administrativa.
 *
 * O `authGuard` resolve os perfis pelo mapa de `core/auth/permissions.ts`
 * (`/dashboard` → ADMIN e SUPERVISOR), então a rota não precisa repetir a
 * lista. Carregamento tardio: cada tela vira um pedaço próprio do pacote.
 */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    title: 'Painel — FieldOps',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  // As demais telas entram aqui conforme forem implementadas. Enquanto isso,
  // um destino desconhecido volta para o painel em vez de deixar a tela vazia.
  { path: '**', redirectTo: 'dashboard' },
];
