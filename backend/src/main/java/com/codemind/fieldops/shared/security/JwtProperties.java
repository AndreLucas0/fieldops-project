package com.codemind.fieldops.shared.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "fieldops.security.jwt")
public record JwtProperties(String secret, long accessTokenExpirationSeconds, long refreshTokenExpirationSeconds) {
}
