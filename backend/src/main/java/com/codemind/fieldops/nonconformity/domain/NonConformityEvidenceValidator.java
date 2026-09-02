package com.codemind.fieldops.nonconformity.domain;

import com.codemind.fieldops.shared.error.BusinessRuleViolationException;

/**
 * RN-055 — a CRITICAL non-conformity must have at least one evidence
 * attached; the API enforces this on update rather than only at creation,
 * since evidence can be uploaded after the non-conformity is first reported.
 * Kept dependency-free (no Spring/JPA) so it is directly unit-testable
 * (test-plan.md §5.5: CriticalNonConformityEvidenceTest).
 */
public final class NonConformityEvidenceValidator {

    public static final String CRITICAL_WITHOUT_EVIDENCE_CODE = "NON_CONFORMITY_CRITICAL_REQUIRES_EVIDENCE";

    private NonConformityEvidenceValidator() {
    }

    public static void validate(NonConformitySeverity severity, boolean hasEvidence) {
        if (severity == NonConformitySeverity.CRITICAL && !hasEvidence) {
            throw new BusinessRuleViolationException(CRITICAL_WITHOUT_EVIDENCE_CODE,
                "A CRITICAL non-conformity must have at least one evidence attached");
        }
    }

}
