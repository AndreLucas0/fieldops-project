import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { EvidenceViewerComponent } from './evidence-viewer.component';

describe('Visualização de evidências — TS-22-02', () => {
  it('permite zoom e navegação sem manter o zoom da foto anterior', () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            images: [
              {
                id: 'e1',
                accessUrl: 'https://example.test/1.jpg',
                mimeType: 'image/jpeg',
                description: 'Foto 1',
              },
              {
                id: 'e2',
                accessUrl: 'https://example.test/2.jpg',
                mimeType: 'image/jpeg',
                description: 'Foto 2',
              },
            ],
            initialIndex: 0,
          },
        },
        { provide: MatDialogRef, useValue: { close: vi.fn() } },
      ],
    });
    const component = TestBed.createComponent(EvidenceViewerComponent).componentInstance;
    component.zoomIn();
    expect(component.zoom()).toBeGreaterThan(1);
    component.next();
    expect(component.current()?.id).toBe('e2');
    expect(component.zoom()).toBe(1);
    component.next();
    expect(component.current()?.id).toBe('e2');
    component.previous();
    expect(component.current()?.id).toBe('e1');
    for (let i = 0; i < 20; i++) component.zoomOut();
    expect(component.zoom()).toBe(1);
  });
});
