import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { catchError, debounceTime, distinctUntilChanged, map, of, switchMap } from 'rxjs';
import { mensajeDeError } from '../../../core/utils/mensaje-error';
import { UsuarioResumen } from '../../../usuarios/models/usuario.model';
import { UsuariosService } from '../../../usuarios/services/usuarios.service';
import { Comparticion, NIVELES, NivelPermiso, TipoRecurso } from '../../models/comparticion.model';
import { ComparticionesService } from '../../service/comparticiones.service';

export interface DatosCompartir {
  tipoRecurso: TipoRecurso;
  recurso: string;
  nombre: string;
}

@Component({
  selector: 'app-compartir-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './compartir-dialog.component.html',
  styleUrl: './compartir-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompartirDialogComponent {
  protected readonly datos = inject<DatosCompartir>(MAT_DIALOG_DATA);
  private readonly comparticionesService = inject(ComparticionesService);
  private readonly usuariosService = inject(UsuariosService);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly niveles = NIVELES;
  protected readonly personas = signal<Comparticion[]>([]); // quien tiene acceso
  protected readonly cargando = signal(true);
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  private readonly encontrados = signal<UsuarioResumen[]>([]);

  protected readonly sugerencias = computed(() => {
    const conAcceso = new Set(this.personas().map((p) => p.destinatario._id));
    return this.encontrados().filter((u) => !conAcceso.has(u._id));
  });

  
  protected readonly buscar = new FormControl<string | UsuarioResumen>('', { nonNullable: true });
  protected readonly nivelNuevo = new FormControl<NivelPermiso>('LECTURA', { nonNullable: true });
  private readonly nivelSeleccionado = toSignal(this.nivelNuevo.valueChanges, {
    initialValue: this.nivelNuevo.value,
  });
  protected readonly descripcionNuevo = computed(
    () => NIVELES.find((n) => n.valor === this.nivelSeleccionado())?.descripcion ?? '',
  );

  constructor() {
    this.cargarPersonas();
    this.buscar.valueChanges
      .pipe(
        map((valor) => (typeof valor === 'string' ? valor.trim() : '')),
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((texto) =>
          texto.length >= 2
            ? this.usuariosService
                .buscarEnDirectorio(texto)
                .pipe(catchError(() => of([] as UsuarioResumen[])))
            : of([] as UsuarioResumen[]),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((lista) => this.encontrados.set(lista));
  }

  protected readonly mostrarUsuario = (valor: string | UsuarioResumen | null): string =>
    typeof valor === 'object' && valor !== null ? valor.correo : (valor ?? '');

  protected compartir() {
    const valor = this.buscar.value;
    const correo = (typeof valor === 'string' ? valor : valor.correo).trim();
    if (!correo) {
      this.error.set('Escribe o elige a quién quieres compartirlo');
      return;
    }

    this.enviando.set(true);
    this.error.set(null);
    this.comparticionesService
      .compartir({
        tipoRecurso: this.datos.tipoRecurso,
        recurso: this.datos.recurso,
        correo,
        nivel: this.nivelNuevo.value,
      })
      .subscribe({
        next: (nueva) => {
          this.enviando.set(false);
          this.personas.update((lista) => [...lista, nueva]);
          this.buscar.setValue('');
          this.encontrados.set([]);
        },
        error: (e: unknown) => {
          this.enviando.set(false);
          this.error.set(mensajeDeError(e, 'No se pudo compartir'));
        },
      });
  }

  protected cambiarNivel(persona: Comparticion, nivel: NivelPermiso) {
    this.comparticionesService.cambiarNivel(persona._id, nivel).subscribe({
      next: (actualizada) =>
        this.personas.update((lista) =>
          lista.map((p) => (p._id === actualizada._id ? actualizada : p)),
        ),
      error: (e: unknown) => {
        this.avisar(mensajeDeError(e, 'No se pudo cambiar el permiso'));
        this.cargarPersonas();
      },
    });
  }

  protected retirar(persona: Comparticion) {
    this.comparticionesService.retirar(persona._id).subscribe({
      next: () => this.personas.update((lista) => lista.filter((p) => p._id !== persona._id)),
      error: (e: unknown) => this.avisar(mensajeDeError(e, 'No se pudo retirar el permiso')),
    });
  }

  private cargarPersonas() {
    this.cargando.set(true);
    this.comparticionesService.quienTieneAcceso(this.datos.tipoRecurso, this.datos.recurso).subscribe({
      next: (lista) => {
        this.personas.set(lista);
        this.cargando.set(false);
      },
      error: (e: unknown) => {
        this.cargando.set(false);
        this.error.set(mensajeDeError(e, 'No se pudo cargar quién tiene acceso'));
      },
    });
  }

  private avisar(mensaje: string) {
    this.snackBar.open(mensaje, 'Cerrar', { duration: 4000 });
  }
}