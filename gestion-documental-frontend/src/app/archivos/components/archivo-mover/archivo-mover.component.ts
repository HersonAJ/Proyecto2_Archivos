import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { mensajeDeError } from '../../../core/utils/mensaje-error';
import { SelectorCarpetaComponent } from '../../../shared/components/selector-carpeta/selector-carpeta.component';
import { Archivo } from '../../models/archivo.model';
import { ArchivosService } from '../../service/archivos.service';

export interface DatosArchivoMover {
  archivo: Archivo;
}

@Component({
  selector: 'app-archivo-mover',
  imports: [MatDialogModule, MatButtonModule, SelectorCarpetaComponent],
  templateUrl: './archivo-mover.component.html',
  styleUrl: './archivo-mover.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArchivoMoverComponent {
  protected readonly datos = inject<DatosArchivoMover>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<ArchivoMoverComponent, boolean>>(MatDialogRef);
  private readonly archivosService = inject(ArchivosService);

  protected readonly destino = signal<string | null>(null);
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly puedeMover = computed(() => this.destino() !== this.datos.archivo.carpeta);

  protected mover() {
    this.enviando.set(true);
    this.error.set(null);
    this.archivosService.mover(this.datos.archivo._id, this.destino()).subscribe({
      next: () => this.dialogRef.close(true),
      error: (e: unknown) => {
        this.enviando.set(false);
        this.error.set(mensajeDeError(e, 'No se pudo mover el archivo'));
      },
    });
  }
}