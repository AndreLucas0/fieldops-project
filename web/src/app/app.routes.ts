import type { Route, Routes } from '@angular/router';

import { authGuard, guestGuard } from './core/auth/auth.guard';

function placeholderRoute(path: string, title: string, subtitle: string): Route {
  return {
    path,
    title: `${title} — FieldOps`,
    data: { title, subtitle },
    loadComponent: () =>
      import('./features/feature-placeholder/feature-placeholder.component').then(
        (module) => module.FeaturePlaceholderComponent,
      ),
  };
}

const PLACEHOLDER_ROUTES: Routes = [
  placeholderRoute('clients', 'Clientes', 'Empresas atendidas e seus locais.'),
  placeholderRoute('sites', 'Locais', 'Locais vinculados aos clientes.'),
  placeholderRoute('equipment', 'Equipamentos', 'Equipamentos vinculados aos locais.'),
  placeholderRoute('users', 'Usuários', 'Acessos administrativos e operacionais.'),
  placeholderRoute(
    'non-conformities',
    'Não conformidades',
    'Desvios registrados durante as inspeções.',
  ),
];

/** Rotas públicas e a área autenticada do painel administrativo. */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'login',
    canActivate: [guestGuard],
    title: 'Entrar — FieldOps',
    loadComponent: () =>
      import('./features/login/login.component').then((module) => module.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/shell/admin-shell.component').then((module) => module.AdminShellComponent),
    children: [
      {
        path: 'dashboard',
        title: 'Painel — FieldOps',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (module) => module.DashboardComponent,
          ),
      },
      {
        path: 'inspection-templates',
        title: 'Modelos de inspeção — FieldOps',
        loadComponent: () =>
          import('./features/templates/templates-list.component').then(
            (module) => module.TemplatesListComponent,
          ),
      },
      {
        path: 'inspection-templates/:templateId/edit',
        title: 'Construtor de modelo — FieldOps',
        loadComponent: () =>
          import('./features/templates/template-builder.component').then(
            (module) => module.TemplateBuilderComponent,
          ),
      },
      ...PLACEHOLDER_ROUTES,
      { path: '**', redirectTo: 'dashboard' },
    ],
  },
];
