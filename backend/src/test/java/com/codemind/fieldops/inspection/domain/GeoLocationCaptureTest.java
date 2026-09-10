package com.codemind.fieldops.inspection.domain;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.codemind.fieldops.evidence.domain.EvidenceUploadValidator;
import com.codemind.fieldops.shared.error.BusinessRuleViolationException;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

/**
 * RN-062 — GPS capture on evidence is best-effort: it never blocks the
 * upload, but a coordinate pair must be fully present or fully absent.
 */
class GeoLocationCaptureTest {

    @Test
    void missingLocationIsAccepted() {
        assertThatCode(() -> EvidenceUploadValidator.validateLocation(null, null)).doesNotThrowAnyException();
    }

    @Test
    void completeLocationIsAccepted() {
        assertThatCode(() -> EvidenceUploadValidator.validateLocation(
            new BigDecimal("-23.550520"), new BigDecimal("-46.633308")))
            .doesNotThrowAnyException();
    }

    @Test
    void latitudeWithoutLongitudeIsRejected() {
        assertThatThrownBy(() -> EvidenceUploadValidator.validateLocation(new BigDecimal("-23.550520"), null))
            .isInstanceOf(BusinessRuleViolationException.class);
    }

    @Test
    void longitudeWithoutLatitudeIsRejected() {
        assertThatThrownBy(() -> EvidenceUploadValidator.validateLocation(null, new BigDecimal("-46.633308")))
            .isInstanceOf(BusinessRuleViolationException.class);
    }

}
