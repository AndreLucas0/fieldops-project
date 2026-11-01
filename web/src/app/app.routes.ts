import type { Route, Routes } from '@angular/router';

import { authGuard, guestGuard } from './core/auth/auth.guard';

const ADMIN_FEATURE_ROUTES: Routes = [
  {
    path: 'clients',
    title: 'Clientes — FieldOps',
    loadComponent: () =>
      import('./features/clients/clients-list.component').then(
        (module) => module.ClientsListComponent,
      ),
  },
  catalogRoute('sites', 'Locais'),
  catalogRoute('equipment', 'Equipamentos'),
  catalogRoute('users', 'Usuários'),
  catalogRoute('non-conformities', 'Não conformidades'),
];

function catalogRoute(path: string, title: string): Route {
  return {
    path,
    title: `${title} — FieldOps`,
    data: { catalog: path },
    loadComponent: () =>
      import('./features/catalog-list/catalog-list.component').then(
        (module) => module.CatalogListComponent,
      ),
  };
}

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
      ...ADMIN_FEATURE_ROUTES,
      { path: '**', redirectTo: 'dashboard' },
    ],
  },
];
