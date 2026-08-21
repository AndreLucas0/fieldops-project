package com.codemind.fieldops.nonconformity.dto;

import com.codemind.fieldops.nonconformity.domain.NonConformityStatus;
import jakarta.validation.constraints.NotNull;

public record NonConformityStatusUpdateRequest(@NotNull NonConformityStatus status) {
}
