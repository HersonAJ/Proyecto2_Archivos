import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, signal, viewChild, } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Observable } from 'rxjs';
import { mensajeDeError } from '../../../core/utils/mensaje-error';
import { TamanoPipe } from '../../../shared/pipes/tamano.pipe';

const TAMANO_MAXIMO_BYTES = 100 * 1024 * 1024;

export interface DatosArchivoForm {
    titulo: string;
    boton: string;
    guardar: (archivo: File, etiquetas: string) => Observable<unknown>;
}

@Component({
    selector: 'app-archivo-form',
    imports: [
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatIconModule,
        TamanoPipe,
    ],
    templateUrl: './archivo-form.component.html',
    styleUrl: './archivo-form.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArchivoFormComponent {
    protected readonly datos = inject<DatosArchivoForm>(MAT_DIALOG_DATA);
    private readonly dialogRef = inject<MatDialogRef<ArchivoFormComponent, boolean>>(MatDialogRef);
    private readonly destroyRef = inject(DestroyRef);

    protected readonly formulario = inject(FormBuilder).nonNullable.group({
        etiquetas: [''],
    });

    protected readonly archivoSeleccionado = signal<File | null>(null);
    protected readonly enviando = signal(false);
    protected readonly error = signal<string | null>(null);
    protected readonly arrastrando = signal(false);

    protected readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

    protected seleccionarArchivo() {
        this.fileInput()?.nativeElement.click();
    }

    protected onTeclado(event: Event) {
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        this.seleccionarArchivo();
    }

    protected onFileChange(event: Event) {
        const input = event.target as HTMLInputElement;
        const archivo = input.files?.[0];
        if (archivo) this.procesarArchivo(archivo);
        input.value = '';
    }

    protected onDragOver(event: DragEvent) {
        event.preventDefault(); //elemento para soltar 
        this.arrastrando.set(true);
    }

    protected onDragLeave() {
        this.arrastrando.set(false);
    }

    protected onDrop(event: DragEvent) {
        event.preventDefault();
        this.arrastrando.set(false);
        const archivo = event.dataTransfer?.files?.[0];
        if (archivo) this.procesarArchivo(archivo);
    }

    protected limpiarArchivo(event: Event) {
        event.stopPropagation();
        this.archivoSeleccionado.set(null);
        this.error.set(null);
    }

    protected guardar() {
        const archivo = this.archivoSeleccionado();
        if (!archivo) {
            this.error.set('Debes seleccionar un archivo válido');
            return;
        }

        this.enviando.set(true);
        this.error.set(null);

        const etiquetas = this.formulario.controls.etiquetas.value.trim();

        this.datos
            .guardar(archivo, etiquetas)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => this.dialogRef.close(true),
                error: (e: unknown) => {
                    this.enviando.set(false);
                    this.error.set(mensajeDeError(e, 'Error al subir el archivo'));
                },
            });
    }

    private procesarArchivo(archivo: File) {
        const nombre = archivo.name.toLowerCase();
        if (!nombre.endsWith('.txt') && !nombre.endsWith('.md')) {
            this.rechazar('Solo se permiten archivos con extensión .txt o .md');
            return;
        }
        if (archivo.size > TAMANO_MAXIMO_BYTES) {
            this.rechazar('El archivo supera el tamaño máximo permitido (100 MB)');
            return;
        }
        this.error.set(null);
        this.archivoSeleccionado.set(archivo);
    }

    private rechazar(mensaje: string) {
        this.error.set(mensaje);
        this.archivoSeleccionado.set(null);
    }
}