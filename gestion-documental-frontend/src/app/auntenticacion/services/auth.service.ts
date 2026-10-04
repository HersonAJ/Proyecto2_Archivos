import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { ApiService } from '../../core/service/api.service';
import { RespuestaLogin } from '../../core/modelos/sesion.model';

const CLAVE_SESION = 'sesion-gestion-documental';

@Injectable({ providedIn: 'root' })
export class AuthService extends ApiService {
  private readonly router = inject(Router);

  private readonly sesion = signal<RespuestaLogin | null>(this.leerSesion());

  readonly usuario = computed(() => this.sesion()?.usuario ?? null);
  readonly token = computed(() => this.sesion()?.accessToken ?? null);
  readonly estaAutenticado = computed(() => this.sesion() !== null);
  readonly esAdmin = computed(() => this.usuario()?.rol === 'ADMIN');

  login(correo: string, password: string) {
    return this.http
      .post<RespuestaLogin>(`${this.baseUrl}/auth/login`, { correo, password })
      .pipe(
        tap((respuesta) => {
          this.sesion.set(respuesta);
          localStorage.setItem(CLAVE_SESION, JSON.stringify(respuesta));
        }),
      );
  }

  cerrarSesion() {
    this.sesion.set(null);
    localStorage.removeItem(CLAVE_SESION);
    void this.router.navigate(['/login']);
  }

  private leerSesion(): RespuestaLogin | null {
    try {
      const texto = localStorage.getItem(CLAVE_SESION);
      return texto ? (JSON.parse(texto) as RespuestaLogin) : null;
    } catch {
      return null;
    }
  }
}