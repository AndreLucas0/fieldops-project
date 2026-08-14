package com.codemind.fieldops.auth.application;

import com.codemind.fieldops.user.domain.User;

public record AuthenticationResult(String accessToken, String refreshToken, long expiresInSeconds, User user) {
}
