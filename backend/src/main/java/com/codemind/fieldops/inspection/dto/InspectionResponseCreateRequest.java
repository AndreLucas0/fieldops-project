package com.codemind.fieldops.inspection.dto;

import jakarta.validation.constraints.Pattern;
import java.math.BigDecimal;
import java.time.LocalDate;

public record InspectionResponseCreateRequest(
    String valueText,
    BigDecimal valueNumber,
    Boolean valueBoolean,
    LocalDate valueDate,
    String valueChoice,
    String observation,
    @Pattern(regexp = "NOT_APPLICABLE|CONFORMING|NON_CONFORMING",
             message = "conformity must be NOT_APPLICABLE, CONFORMING, or NON_CONFORMING")
    String conformity) {
}
