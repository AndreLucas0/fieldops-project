package com.codemind.fieldops.user.dto;

import com.codemind.fieldops.user.domain.UserRole;
import com.codemind.fieldops.user.domain.UserStatus;
import java.time.Instant;
import java.util.UUID;

public record UserResponse(
	UUID id,
	String name,
	String email,
	UserRole role,
	UserStatus status,
	String phone,
	Instant createdAt,
	Instant updatedAt,
	int version) {
}
