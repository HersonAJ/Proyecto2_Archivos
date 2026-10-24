import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auntenticacion/services/auth.service';

const passwordsIguales: ValidatorFn = (grupo: AbstractControl): ValidationErrors | null => {
  const password = grupo.get('password')?.value;
  const confirmar = grupo.get('confirmarPassword')?.value;
  if (!password || !confirmar) return null;
  return password === confirmar ? null : { passwordsDistintas: true };
};

@Component({
  selector: 'app-registro',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
  ],
  templateUrl: './registro.component.html',
  styleUrl: './registro.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistroComponent {
  private readonly autenticacion = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly formulario = inject(FormBuilder).nonNullable.group(
    {
      nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      correo: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
      password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(72)]],
      confirmarPassword: ['', [Validators.required]],
    },
    { validators: passwordsIguales },
  );

  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly mostrarPassword = signal(false);

  protected alternarPassword() {
    this.mostrarPassword.update((v) => !v);
  }

  protected registrar() {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const { nombre, correo, password, confirmarPassword } = this.formulario.getRawValue();

    this.enviando.set(true);
    this.error.set(null);

    this.autenticacion.registro({ nombre, correo, password, confirmarPassword }).subscribe({
      next: () => void this.router.navigate(['/login'], { queryParams: { registrado: '1' } }),
      error: (e: HttpErrorResponse) => {
        this.enviando.set(false);
        this.error.set(
          e.status === 409
            ? 'Ya existe una cuenta con ese correo'
            : e.status === 400
              ? 'Revisa los datos del formulario'
              : 'No se pudo conectar con el servidor',
        );
      },
    });
  }
}