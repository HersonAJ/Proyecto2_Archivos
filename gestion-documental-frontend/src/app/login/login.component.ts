import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../auntenticacion/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly autenticacion = inject(AuthService);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);

  protected readonly formulario = inject(FormBuilder).nonNullable.group({
    correo: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
    password: ['', Validators.required],
  });

  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly mensaje = signal<string | null>(null);
  protected readonly mostrarPassword = signal(false);

  constructor() {
    if (this.ruta.snapshot.queryParamMap.get('registrado') === '1') {
      this.mensaje.set('Cuenta creada. Ya puedes iniciar sesión.');
    }
  }

  protected alternarPassword() {
    this.mostrarPassword.update((v) => !v);
  }

  protected ingresar() {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    this.error.set(null);

    const { correo, password } = this.formulario.getRawValue();
    this.autenticacion.login(correo, password).subscribe({
      next: () => void this.router.navigate(['/inicio']),
      error: (e: HttpErrorResponse) => {
        this.enviando.set(false);
        this.error.set(
          e.status === 401
            ? 'Correo o contraseña incorrectos'
            : 'No se pudo conectar con el servidor',
        );
      },
    });
  }
}