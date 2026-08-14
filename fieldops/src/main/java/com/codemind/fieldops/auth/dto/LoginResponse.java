package com.codemind.fieldops.auth.dto;

public record LoginResponse(String accessToken, String refreshToken, long expiresIn, UserSummary user) {
}
