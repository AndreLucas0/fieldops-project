package com.codemind.fieldops.inspection.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record InspectionResponseCreateRequest(
    String valueText,
    BigDecimal valueNumber,
    Boolean valueBoolean,
    LocalDate valueDate,
    String valueChoice,
    String observation) {
}
