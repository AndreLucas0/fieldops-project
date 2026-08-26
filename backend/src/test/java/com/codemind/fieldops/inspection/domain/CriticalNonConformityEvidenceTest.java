package com.codemind.fieldops.inspection.domain;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.codemind.fieldops.nonconformity.domain.NonConformityEvidenceValidator;
import com.codemind.fieldops.nonconformity.domain.NonConformitySeverity;
import com.codemind.fieldops.shared.error.BusinessRuleViolationException;
import org.junit.jupiter.api.Test;

/**
 * RN-039 / RN-055 — a CRITICAL non-conformity must always be backed by at
 * least one evidence; lower severities never require one.
 */
class CriticalNonConformityEvidenceTest {

    @Test
    void criticalWithoutEvidenceIsRejected() {
        assertThatThrownBy(() -> NonConformityEvidenceValidator.validate(NonConformitySeverity.CRITICAL, false))
            .isInstanceOf(BusinessRuleViolationException.class)
            .satisfies(ex -> {
                BusinessRuleViolationException violation = (BusinessRuleViolationException) ex;
                if (!NonConformityEvidenceValidator.CRITICAL_WITHOUT_EVIDENCE_CODE.equals(violation.getCode())) {
                    throw new AssertionError("Unexpected error code: " + violation.getCode());
                }
            });
    }

    @Test
    void criticalWithEvidenceIsAccepted() {
        assertThatCode(() -> NonConformityEvidenceValidator.validate(NonConformitySeverity.CRITICAL, true))
            .doesNotThrowAnyException();
    }

    @Test
    void lowSeverityWithoutEvidenceIsAccepted() {
        assertThatCode(() -> NonConformityEvidenceValidator.validate(NonConformitySeverity.LOW, false))
            .doesNotThrowAnyException();
    }

    @Test
    void highSeverityWithoutEvidenceIsAccepted() {
        assertThatCode(() -> NonConformityEvidenceValidator.validate(NonConformitySeverity.HIGH, false))
            .doesNotThrowAnyException();
    }

}
