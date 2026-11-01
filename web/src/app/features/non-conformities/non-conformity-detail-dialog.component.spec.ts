import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';

import type { Evidence, InspectionDetail, NonConformity } from '../../core/models/domain';
import { InspectionsService, NonConformitiesService } from '../../core/services/resources';
import { NonConformityDetailDialogComponent } from './non-conformity-detail-dialog.component';

describe('NonConformityDetailDialogComponent', () => {
  const nonConformity: NonConformity = {
    id: 'nc-1',
    inspectionId: 'inspection-1',
    inspectionItemId: 'item-1',
    title: 'Cabo de aço',
    description: 'Fios rompidos próximos ao tambor.',
    severity: 'CRITICAL',
    status: 'OPEN',
    createdAtDevice: '2026-11-01T10:00:00Z',
    createdAt: '2026-11-01T10:00:01Z',
    updatedAt: '2026-11-01T10:00:01Z',
    version: 1,
  };
  const inspection = {
    id: 'inspection-1',
    title: 'Inspeção da ponte rolante',
    priority: 'HIGH',
    status: 'SUBMITTED',
    scheduledFor: '2026-11-01T09:00:00Z',
    templateVersionId: 'v1',
    clientId: 'c1',
    siteId: 's1',
    technicianId: 'u1',
    createdAt: '2026-11-01T08:00:00Z',
    updatedAt: '2026-11-01T10:00:01Z',
    version: 1,
    items: [
      {
        id: 'item-1',
        inspectionId: 'inspection-1',
        itemTitle: 'Cabo sem fios rompidos',
        sectionTitle: 'Cabos',
        sectionOrder: 1,
        itemOrder: 1,
        responseType: 'CONFORMITY',
        required: true,
        createdAt: '2026-11-01T08:00:00Z',
      },
    ],
  } as InspectionDetail;
  const evidence: Evidence[] = [
    {
      id: 'e1',
      inspectionId: 'inspection-1',
      nonConformityId: 'nc-1',
      type: 'PHOTO',
      mimeType: 'image/jpeg',
      sizeBytes: 12,
      capturedAtDevice: '2026-11-01T10:00:00Z',
      createdAt: '2026-11-01T10:00:01Z',
    },
  ];

  it('loads the inspection and related evidence, showing the item associated with the NC', async () => {
    const inspections = {
      get: vi.fn(() => of(inspection)),
      listEvidence: vi.fn(() => of(evidence)),
    };
    const nonConformities = { get: vi.fn(() => of(nonConformity)) };
    TestBed.configureTestingModule({
      imports: [NonConformityDetailDialogComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: MAT_DIALOG_DATA, useValue: { nonConformity } },
        { provide: MatDialogRef, useValue: { close: vi.fn() } },
        { provide: NonConformitiesService, useValue: nonConformities },
        { provide: InspectionsService, useValue: inspections },
      ],
    });
    const fixture = TestBed.createComponent(NonConformityDetailDialogComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(nonConformities.get).toHaveBeenCalledWith(nonConformity.id);
    expect(inspections.get).toHaveBeenCalledWith(nonConformity.inspectionId);
    expect(inspections.listEvidence).toHaveBeenCalledWith(nonConformity.inspectionId);
    expect(text).toContain('Cabo sem fios rompidos');
    expect(text).toContain('Inspeção da ponte rolante');
    expect(text).toContain('1 evidência');
  });
});
