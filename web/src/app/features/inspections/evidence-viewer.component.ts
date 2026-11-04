import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  inject,
  signal,
} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import type { Evidence } from '../../core/models/domain';

export interface EvidenceViewerData {
  images: readonly Evidence[];
  initialIndex: number;
}

@Component({
  selector: 'app-evidence-viewer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule],
  template: `<h2 mat-dialog-title>{{ current()?.description || 'Evidência da inspeção' }}</h2>
    <mat-dialog-content>
      <div class="toolbar" aria-label="Controles da imagem">
        <button
          matButton
          (click)="previous()"
          [disabled]="index() === 0"
          aria-label="Foto anterior"
        >
          Anterior
        </button>
        <span aria-live="polite"
          >Foto {{ images.length ? index() + 1 : 0 }} de {{ images.length }}</span
        >
        <button
          matButton
          (click)="next()"
          [disabled]="index() >= images.length - 1"
          aria-label="Próxima foto"
        >
          Próxima
        </button>
        <button matButton (click)="zoomOut()" [disabled]="zoom() <= 1" aria-label="Diminuir zoom">
          −
        </button>
        <button matButton (click)="zoom.set(1)">{{ zoom() * 100 }}%</button>
        <button matButton (click)="zoomIn()" [disabled]="zoom() >= 4" aria-label="Aumentar zoom">
          +
        </button>
      </div>
      @if (failed()) {
        <p role="alert">
          Não foi possível carregar a foto. Atualize a lista para obter um novo acesso à evidência.
        </p>
      }
      <div class="viewport">
        @if (current(); as image) {
          <img
            [src]="image.accessUrl"
            [alt]="image.description || 'Evidência da inspeção'"
            [style.transform]="'scale(' + zoom() + ')'"
            (error)="failed.set(true)"
          />
        }
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end"
      ><button matButton mat-dialog-close>Fechar</button></mat-dialog-actions
    >`,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 0.25rem;
    }
    .toolbar span {
      font-size: 0.8rem;
    }
    .viewport {
      height: 55vh;
      overflow: auto;
      background: var(--mat-sys-surface-container-lowest);
      border-radius: 0.5rem;
    }
    .viewport img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
      transform-origin: top left;
    }
    p[role='alert'] {
      color: var(--mat-sys-error);
    }
    @media (max-width: 480px) {
      .toolbar {
        gap: 0;
      }
      .viewport {
        height: 45vh;
      }
    }
  `,
})
export class EvidenceViewerComponent {
  private readonly data = inject<EvidenceViewerData>(MAT_DIALOG_DATA);
  readonly images = this.data.images.filter(
    (image) => image.mimeType.startsWith('image/') && image.accessUrl,
  );
  readonly index = signal(Math.max(0, Math.min(this.data.initialIndex, this.images.length - 1)));
  readonly zoom = signal(1);
  readonly failed = signal(false);
  readonly current = computed<Evidence | undefined>(() => this.images[this.index()]);
  zoomIn(): void {
    this.zoom.update((value) => Math.min(4, value + 0.25));
  }
  zoomOut(): void {
    this.zoom.update((value) => Math.max(1, value - 0.25));
  }
  next(): void {
    this.change(Math.min(this.images.length - 1, this.index() + 1));
  }
  previous(): void {
    this.change(Math.max(0, this.index() - 1));
  }
  private change(index: number): void {
    if (index === this.index()) return;
    this.index.set(index);
    this.zoom.set(1);
    this.failed.set(false);
  }
  @HostListener('keydown.arrowright', ['$event']) onRight(event: Event): void {
    event.preventDefault();
    this.next();
  }
  @HostListener('keydown.arrowleft', ['$event']) onLeft(event: Event): void {
    event.preventDefault();
    this.previous();
  }
}
