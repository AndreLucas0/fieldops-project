package com.codemind.fieldops.site.dto;

import com.codemind.fieldops.site.domain.SiteStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record SiteResponse(
    UUID id,
    UUID clientId,
    String name,
    String description,
    String addressLine,
    String city,
    String state,
    String postalCode,
    BigDecimal latitude,
    BigDecimal longitude,
    String contactName,
    String contactPhone,
    SiteStatus status,
    Instant createdAt,
    Instant updatedAt,
    int version) {
}
