import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { catchError, of, switchMap, tap } from 'rxjs';
import { AuthService } from '../../../auntenticacion/services/auth.service';
import { NivelAcceso, tieneNivel } from '../../../comparticiones/models/comparticion.model';
import { mensajeDeError } from '../../../core/utils/mensaje-error';
import { ConfirmarComponent } from '../../../shared/components/confirmar/confirmar.component';
import { Comentario } from '../../models/comentario.model';
import { ComentariosService } from '../../service/comentarios.service';

@Component({
  selector: 'app-comentario-list',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './comentario-list.component.html',
  styleUrl: './comentario-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComentarioListComponent {
  private readonly comentariosService = inject(ComentariosService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly idPropio = inject(AuthService).usuario()?.id;

  readonly archivoId = input.required<string>();
  readonly nivel = input<NivelAcceso>('PROPIETARIO');

  protected readonly comentarios = signal<Comentario[]>([]);
  protected readonly cargando = signal(true);
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly puedeComentar = computed(() => tieneNivel(this.nivel(), 'COMENTAR'));
  protected readonly texto = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(/\S/), Validators.maxLength(1000)],
  });

  constructor() {
    toObservable(this.archivoId)
      .pipe(
        tap(() => {
          this.cargando.set(true);
          this.error.set(null);
        }),
        switchMap((id) =>
          this.comentariosService.listar(id).pipe(
            catchError((e: unknown) => {
              this.error.set(mensajeDeError(e, 'No se pudieron cargar los comentarios'));
              return of([] as Comentario[]);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((lista) => {
        this.comentarios.set(lista);
        this.cargando.set(false);
      });
  }

  protected puedeBorrar(comentario: Comentario): boolean {
    return comentario.autor._id === this.idPropio || this.nivel() === 'PROPIETARIO';
  }

  protected enviar() {
    if (this.texto.invalid) return;
    this.enviando.set(true);
    this.comentariosService.crear(this.archivoId(), this.texto.value.trim()).subscribe({
      next: (nuevo) => {
        this.enviando.set(false);
        this.comentarios.update((lista) => [...lista, nuevo]);
        this.texto.reset(); // vuelve al valor inicial: texto vacío
      },
      error: (e: unknown) => {
        this.enviando.set(false);
        this.avisar(mensajeDeError(e, 'No se pudo enviar el comentario'));
      },
    });
  }

  protected borrar(comentario: Comentario) {
    this.dialog
      .open(ConfirmarComponent, {
        width: '420px',
        data: {
          titulo: 'Borrar comentario',
          mensaje: 'El comentario se eliminará para todos.',
          boton: 'Borrar',
          peligro: true,
        },
      })
      .afterClosed()
      .subscribe((confirmado) => {
        if (!confirmado) return;
        this.comentariosService.eliminar(comentario._id).subscribe({
          next: () => this.comentarios.update((lista) => lista.filter((c) => c._id !== comentario._id)),
          error: (e: unknown) => this.avisar(mensajeDeError(e, 'No se pudo borrar el comentario')),
        });
      });
  }

  private avisar(mensaje: string) {
    this.snackBar.open(mensaje, 'Cerrar', { duration: 4000 });
  }
}