import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { mensajeDeError } from '../../../core/utils/mensaje-error';
import { SelectorCarpetaComponent } from '../../../shared/components/selector-carpeta/selector-carpeta.component';
import { Carpeta } from '../../models/carpetas.model';
import { CarpetasService } from '../../service/carpetas.service';

export interface DatosCarpetaMover {
  carpeta: Carpeta;
}

@Component({
  selector: 'app-carpeta-mover',
  imports: [MatDialogModule, MatButtonModule, SelectorCarpetaComponent],
  templateUrl: './carpeta-mover.component.html',
  styleUrl: './carpeta-mover.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarpetaMoverComponent {
  protected readonly datos = inject<DatosCarpetaMover>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<CarpetaMoverComponent, boolean>>(MatDialogRef);
  private readonly carpetasService = inject(CarpetasService);

  protected readonly destino = signal<string | null>(null);
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly puedeMover = computed(() => this.destino() !== this.datos.carpeta.carpetaPadre);

  protected mover() {
    this.enviando.set(true);
    this.error.set(null);
    this.carpetasService.mover(this.datos.carpeta._id, this.destino()).subscribe({
      next: () => this.dialogRef.close(true),
      error: (e: unknown) => {
        this.enviando.set(false);
        this.error.set(mensajeDeError(e));
      },
    });
  }
}