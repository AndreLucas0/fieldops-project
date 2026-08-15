package com.codemind.fieldops.site.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record SiteUpdateRequest(
    @NotBlank @Size(max = 150) String name,
    @Size(max = 500) String description,
    @Size(max = 255) String addressLine,
    @Size(max = 100) String city,
    @Size(max = 100) String state,
    @Size(max = 20) String postalCode,
    BigDecimal latitude,
    BigDecimal longitude,
    @Size(max = 150) String contactName,
    @Size(max = 30) String contactPhone) {
}
