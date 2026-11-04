import type { Route, Routes } from '@angular/router';

import { authGuard, authGuardChild, guestGuard } from './core/auth/auth.guard';

const ADMIN_FEATURE_ROUTES: Routes = [
  {
    path: 'clients',
    title: 'Clientes — FieldOps',
    loadComponent: () =>
      import('./features/clients/clients-list.component').then(
        (module) => module.ClientsListComponent,
      ),
  },
  {
    path: 'inspections/new',
    title: 'Nova inspeção — FieldOps',
    loadComponent: () =>
      import('./features/inspections/inspection-create.component').then(
        (module) => module.InspectionCreateComponent,
      ),
  },
  {
    path: 'inspections/:inspectionId/review',
    title: 'Revisão da inspeção — FieldOps',
    loadComponent: () =>
      import('./features/inspections/inspection-review.component').then(
        (m) => m.InspectionReviewComponent,
      ),
  },
  {
    path: 'inspections/:inspectionId',
    title: 'Detalhes da inspeção — FieldOps',
    loadComponent: () =>
      import('./features/inspections/inspection-detail.component').then(
        (module) => module.InspectionDetailComponent,
      ),
  },
  {
    path: 'inspections',
    title: 'Inspeções — FieldOps',
    loadComponent: () =>
      import('./features/inspections/inspections-list.component').then(
        (module) => module.InspectionsListComponent,
      ),
  },

  catalogRoute('clients/:clientId/sites', 'Locais do cliente', 'sites'),
  catalogRoute('sites', 'Locais'),
  catalogRoute('sites/:siteId/equipment', 'Equipamentos do local', 'equipment'),
  catalogRoute('equipment', 'Equipamentos'),
  catalogRoute('users', 'Usuários'),
  catalogRoute('non-conformities', 'Não conformidades'),
];

function catalogRoute(path: string, title: string, catalog = path): Route {
  return {
    path,
    title: `${title} — FieldOps`,
    data: { catalog },
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
    canActivateChild: [authGuardChild],
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
        path: 'inspection-templates/new',
        title: 'Novo modelo — FieldOps',
        loadComponent: () =>
          import('./features/templates/template-create.component').then(
            (m) => m.TemplateCreateComponent,
          ),
      },
      {
        path: 'inspection-templates/:templateId/preview',
        title: 'Prévia do modelo — FieldOps',
        loadComponent: () =>
          import('./features/templates/template-preview.component').then(
            (m) => m.TemplatePreviewComponent,
          ),
      },
      {
        path: 'inspection-templates/:templateId/versions',
        title: 'Versões do modelo — FieldOps',
        loadComponent: () =>
          import('./features/templates/template-versions.component').then(
            (m) => m.TemplateVersionsComponent,
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
