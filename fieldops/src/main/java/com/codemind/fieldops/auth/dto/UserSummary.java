package com.codemind.fieldops.auth.dto;

import com.codemind.fieldops.user.domain.UserRole;
import java.util.UUID;

public record UserSummary(UUID id, String name, String email, UserRole role) {
}
