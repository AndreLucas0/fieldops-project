import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, RouterOutlet, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { AuthService } from './auth.service';
import { AuthStore } from './auth.store';

@Component({ imports: [RouterOutlet], template: '<router-outlet />' })
class ShellForTest {}
@Component({ template: 'Página autorizada' })
class PageForTest {}

describe('Autorização entre páginas da mesma sessão', () => {
  it('liga a criação e o histórico de modelos aos componentes próprios', async () => {
    const children = routes.find((route) => route.children)?.children ?? [];
    const create = children.find((route) => route.path === 'inspection-templates/new');
    const versions = children.find(
      (route) => route.path === 'inspection-templates/:templateId/versions',
    );

    expect(await create?.loadComponent?.()).toBe(
      (await import('../../features/templates/template-create.component')).TemplateCreateComponent,
    );
    expect(await versions?.loadComponent?.()).toBe(
      (await import('../../features/templates/template-versions.component')).TemplateVersionsComponent,
    );
  });

  it('supervisor que entrou no painel não consegue depois abrir usuários pela URL', async () => {
    const shell = routes.find((route) => route.children)!;
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: {} },
        provideRouter([
          {
            ...shell,
            loadComponent: undefined,
            component: ShellForTest,
            children: [
              { path: 'dashboard', component: PageForTest },
              { path: 'users', component: PageForTest },
            ],
          },
        ]),
      ],
    });
    TestBed.inject(AuthStore).setSession({
      accessToken: 't',
      refreshToken: 'r',
      expiresAt: Date.now() + 60000,
      user: { id: 'u1', name: 'Supervisor', email: 's@test.local', role: 'SUPERVISOR' },
    });
    await RouterTestingHarness.create('/dashboard');
    const router = TestBed.inject(Router);
    expect(await router.navigateByUrl('/users')).toBe(false);
    expect(router.url).toBe('/dashboard');
  });
});
