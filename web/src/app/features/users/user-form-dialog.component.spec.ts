import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';

import { ApiError } from '../../core/models/api-error.model';
import { UsersService } from '../../core/services/resources';
import { UserFormDialogComponent } from './user-form-dialog.component';

describe('UserFormDialogComponent', () => {
  const user = {
    id: 'user-1',
    name: 'Técnica',
    email: 'tecnica@example.test',
    role: 'TECHNICIAN' as const,
    status: 'ACTIVE' as const,
    phone: '11999990000',
    createdAt: '2026-11-01T12:00:00Z',
    updatedAt: '2026-11-01T12:00:00Z',
    version: 1,
  };

  function setup(data: { user?: typeof user | null } = {}) {
    const service = { create: vi.fn(), update: vi.fn() };
    const close = vi.fn();
    TestBed.configureTestingModule({
      imports: [UserFormDialogComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: { close } },
        { provide: UsersService, useValue: service },
      ],
    });
    const fixture = TestBed.createComponent(UserFormDialogComponent);
    fixture.detectChanges();
    return { fixture, service, close };
  }

  it('requires password with minimum of eight characters on create', () => {
    const { fixture } = setup();
    const component = fixture.componentInstance as unknown as {
      form: { controls: { password: { setValue(value: string): void; valid: boolean } } };
      save(): void;
    };
    component.form.controls.password.setValue('1234567');
    component.save();
    expect(component.form.controls.password.valid).toBe(false);
  });

  it('creates user with trimmed email and initial password', () => {
    const { fixture, service, close } = setup();
    service.create.mockReturnValue(of(user));
    const component = fixture.componentInstance as unknown as {
      form: {
        setValue(value: {
          name: string;
          email: string;
          password: string;
          role: string;
          phone: string;
        }): void;
      };
      save(): void;
    };
    component.form.setValue({
      name: ' Nova Pessoa ',
      email: ' NOVA@example.test ',
      password: '12345678',
      role: 'TECHNICIAN',
      phone: ' ',
    });
    component.save();

    expect(service.create).toHaveBeenCalledWith({
      name: 'Nova Pessoa',
      email: 'nova@example.test',
      role: 'TECHNICIAN',
      phone: undefined,
      password: '12345678',
    });
    expect(close).toHaveBeenCalledWith(true);
  });

  it('updates without sending a password', () => {
    const { fixture, service, close } = setup({ user });
    service.update.mockReturnValue(of(user));
    const component = fixture.componentInstance as unknown as {
      form: { controls: { name: { setValue(value: string): void } } };
      save(): void;
    };
    component.form.controls.name.setValue('Nome atualizado');
    component.save();

    expect(service.update).toHaveBeenCalledWith(user.id, {
      name: 'Nome atualizado',
      email: user.email,
      role: user.role,
      phone: user.phone,
    });
    expect(service.update.mock.calls[0][1]).not.toHaveProperty('password');
    expect(close).toHaveBeenCalledWith(true);
  });

  it('shows API conflict when the email is already registered', () => {
    const { fixture, service } = setup();
    service.create.mockReturnValue(
      throwError(
        () =>
          new ApiError({
            kind: 'CONFLICT',
            status: 409,
            code: 'EMAIL_ALREADY_EXISTS',
            userMessage: 'E-mail já cadastrado.',
          }),
      ),
    );
    const component = fixture.componentInstance as unknown as {
      form: {
        setValue(value: {
          name: string;
          email: string;
          password: string;
          role: string;
          phone: string;
        }): void;
      };
      save(): void;
      apiError: () => ApiError | null;
    };
    component.form.setValue({
      name: 'Pessoa',
      email: 'existe@example.test',
      password: '12345678',
      role: 'TECHNICIAN',
      phone: '',
    });
    component.save();

    expect(component.apiError()?.status).toBe(409);
  });
});
