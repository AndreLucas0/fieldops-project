package com.codemind.fieldops.equipment.dto;

import com.codemind.fieldops.equipment.domain.EquipmentStatus;
import jakarta.validation.constraints.NotNull;

public record EquipmentStatusUpdateRequest(@NotNull EquipmentStatus status) {
}
