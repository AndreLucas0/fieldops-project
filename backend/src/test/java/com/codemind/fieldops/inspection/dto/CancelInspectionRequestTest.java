package com.codemind.fieldops.inspection.dto;

import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CancelInspectionRequestTest {

    @Test
    void requiresNonBlankReasonWithAtMost500Characters() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();

            for (String invalid : new String[] {null, "", " \t\n", "a".repeat(501)}) {
                assertThat(validator.validate(new CancelInspectionRequest(invalid)))
                    .extracting(violation -> violation.getPropertyPath().toString())
                    .containsExactly("reason");
            }

            assertThat(validator.validate(new CancelInspectionRequest("a"))).isEmpty();
            assertThat(validator.validate(new CancelInspectionRequest("a".repeat(500)))).isEmpty();
        }
    }
}
