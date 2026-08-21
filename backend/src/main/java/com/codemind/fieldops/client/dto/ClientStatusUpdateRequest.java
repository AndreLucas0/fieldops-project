package com.codemind.fieldops.client.dto;

import com.codemind.fieldops.client.domain.ClientStatus;
import jakarta.validation.constraints.NotNull;

public record ClientStatusUpdateRequest(@NotNull ClientStatus status) {
}
