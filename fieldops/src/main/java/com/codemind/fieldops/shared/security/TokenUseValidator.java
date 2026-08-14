package com.codemind.fieldops.shared.security;

import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;

/**
 * Rejects a JWT unless its "token_use" claim matches the expected value —
 * prevents a refresh token from being accepted as an access token and vice versa.
 */
public class TokenUseValidator implements OAuth2TokenValidator<Jwt> {

	private static final OAuth2Error WRONG_TOKEN_USE =
		new OAuth2Error("invalid_token", "Token is not valid for this operation", null);

	private final String expectedTokenUse;

	public TokenUseValidator(String expectedTokenUse) {
		this.expectedTokenUse = expectedTokenUse;
	}

	@Override
	public OAuth2TokenValidatorResult validate(Jwt token) {
		if (expectedTokenUse.equals(token.getClaimAsString(JwtClaims.TOKEN_USE))) {
			return OAuth2TokenValidatorResult.success();
		}
		return OAuth2TokenValidatorResult.failure(WRONG_TOKEN_USE);
	}

}
