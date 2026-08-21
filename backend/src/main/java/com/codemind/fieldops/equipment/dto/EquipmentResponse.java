package com.codemind.fieldops.equipment.dto;

import com.codemind.fieldops.equipment.domain.EquipmentStatus;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record EquipmentResponse(
    UUID id,
    UUID siteId,
    String name,
    String assetNumber,
    String serialNumber,
    String manufacturer,
    String model,
    String description,
    String qrCode,
    EquipmentStatus status,
    LocalDate installedAt,
    Instant createdAt,
    Instant updatedAt,
    int version) {
}
