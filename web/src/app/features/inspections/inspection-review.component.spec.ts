import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';

import { INSPECTION_IDS, resetMockStore } from '@fieldops/shared';

import { provideResources } from '../../core/core.providers';
import { MOCK_LATENCY_MS } from '../../core/mocks/mock-services';
import { InspectionReviewComponent } from './inspection-review.component';

describe('InspectionReviewComponent', () => {
  beforeEach(() => {
    resetMockStore();
    TestBed.configureTestingModule({
      imports: [InspectionReviewComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        ...provideResources(true),
        { provide: MOCK_LATENCY_MS, useValue: 0 },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ inspectionId: INSPECTION_IDS.rejected }),
            },
          },
        },
      ],
    });
  });

  it('exibe eventos auditados na revisão', async () => {
    const fixture = TestBed.createComponent(InspectionReviewComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Histórico da inspeção');
    expect(text).toContain('Revisão iniciada');
    expect(text).toContain('Inspeção reprovada');
    expect(text).toContain('Fotos insuficientes');
  });
});
