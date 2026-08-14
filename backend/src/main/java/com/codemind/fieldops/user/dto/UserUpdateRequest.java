package com.codemind.fieldops.user.dto;

import com.codemind.fieldops.user.domain.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UserUpdateRequest(
	@NotBlank @Size(max = 150) String name,
	@NotBlank @Email @Size(max = 255) String email,
	@NotNull UserRole role,
	String phone) {
}
