package com.codemind.fieldops.equipment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record EquipmentUpdateRequest(
    @NotBlank @Size(max = 150) String name,
    @Size(max = 50) String assetNumber,
    @Size(max = 100) String serialNumber,
    @Size(max = 150) String manufacturer,
    @Size(max = 150) String model,
    @Size(max = 500) String description,
    @NotBlank @Size(max = 100) String qrCode,
    LocalDate installedAt) {
}
