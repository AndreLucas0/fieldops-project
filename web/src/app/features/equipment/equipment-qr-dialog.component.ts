import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { encodeQR } from 'qr';

import type { Equipment } from '../../core/models/domain';

export interface EquipmentQrDialogData {
  equipment: Equipment;
}

@Component({
  selector: 'app-equipment-qr-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>QR Code do equipamento</h2>
    <mat-dialog-content>
      <p class="equipment-name">{{ data.equipment.name }}</p>
      @if (imageUrl()) {
        <img class="qr-image" [src]="imageUrl()" [alt]="'QR Code de ' + data.equipment.name" />
      } @else {
        <p class="qr-error" role="alert">Não foi possível gerar a imagem do QR Code.</p>
      }
      <code>{{ data.equipment.qrCode }}</code>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton mat-dialog-close type="button">Fechar</button>
    </mat-dialog-actions>
  `,
  styles: `
    :host {
      display: block;
    }
    mat-dialog-content {
      display: grid;
      justify-items: center;
      gap: 1rem;
    }
    .equipment-name {
      margin: 0;
      font-weight: 600;
      text-align: center;
    }
    .qr-image {
      display: block;
      width: min(16rem, 70vw);
      aspect-ratio: 1;
      image-rendering: pixelated;
    }
    code {
      padding: 0.5rem 0.75rem;
      border-radius: 0.35rem;
      background: var(--mat-sys-surface-container);
    }
    .qr-error {
      color: var(--mat-sys-error);
    }
  `,
})
export class EquipmentQrDialogComponent {
  readonly data = inject<EquipmentQrDialogData>(MAT_DIALOG_DATA);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly imageUrl = signal<string | null>(null);

  constructor() {
    try {
      const svg = encodeQR(this.data.equipment.qrCode, 'svg', { ecc: 'high' });
      const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
      this.imageUrl.set(url);
      this.destroyRef.onDestroy(() => URL.revokeObjectURL(url));
    } catch {
      this.imageUrl.set(null);
    }
  }
}
