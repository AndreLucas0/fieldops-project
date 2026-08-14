package com.codemind.fieldops.user.dto;

import com.codemind.fieldops.user.domain.UserStatus;
import jakarta.validation.constraints.NotNull;

public record UserStatusUpdateRequest(@NotNull UserStatus status) {
}
