import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FormularioFiltros, ValoresFiltros, hayFiltrosActivos } from '../../models/filtros-archivo.model';

@Component({
  selector: 'app-archivo-filtros',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './archivo-filtros.component.html',
  styleUrl: './archivo-filtros.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArchivoFiltrosComponent {
  readonly formulario = input.required<FormularioFiltros>();
  readonly valores = input.required<ValoresFiltros>();
  readonly etiquetas = input<string[]>([]);

  protected readonly hayFiltros = computed(() => hayFiltrosActivos(this.valores()));
  protected readonly hayFechas = computed(() => Boolean(this.valores().desde || this.valores().hasta));

  protected quitarBusqueda() {
    this.formulario().controls.q.setValue('');
  }

  protected quitarTipo() {
    this.formulario().controls.tipo.setValue('');
  }

  protected quitarEtiqueta() {
    this.formulario().controls.etiqueta.setValue('');
  }

  protected quitarFechas() {
    this.formulario().patchValue({ desde: null, hasta: null });
  }

  protected limpiar() {
    this.formulario().reset();
  }
}