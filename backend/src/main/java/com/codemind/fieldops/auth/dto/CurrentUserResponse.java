package com.codemind.fieldops.auth.dto;

import com.codemind.fieldops.user.domain.UserRole;
import com.codemind.fieldops.user.domain.UserStatus;
import java.util.UUID;

public record CurrentUserResponse(
	UUID id, String name, String email, UserRole role, UserStatus status, String phone) {
}
