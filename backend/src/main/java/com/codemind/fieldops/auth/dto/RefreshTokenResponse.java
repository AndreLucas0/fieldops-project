package com.codemind.fieldops.auth.dto;

public record RefreshTokenResponse(String accessToken, String refreshToken, long expiresIn) {
}
