package com.codemind.fieldops.shared.security;

import com.codemind.fieldops.auth.domain.SessionPolicy;
import com.codemind.fieldops.user.repository.UserRepository;
import java.util.UUID;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;

/**
 * Applies SessionPolicy (RN-001, RN-008) to a decoded JWT: the subject must
 * resolve to an ACTIVE user whose session_valid_after is not after the
 * token's issued-at.
 */
public class SessionTokenValidator implements OAuth2TokenValidator<Jwt> {

	private static final OAuth2Error INVALID_SESSION =
		new OAuth2Error("invalid_token", "Session is no longer valid", null);

	private final UserRepository userRepository;

	public SessionTokenValidator(UserRepository userRepository) {
		this.userRepository = userRepository;
	}

	@Override
	public OAuth2TokenValidatorResult validate(Jwt token) {
		UUID userId = parseUserId(token.getSubject());
		if (userId == null) {
			return OAuth2TokenValidatorResult.failure(INVALID_SESSION);
		}

		return userRepository.findById(userId)
			.filter(user -> SessionPolicy.isSessionValid(user.getStatus(), user.getSessionValidAfter(), token.getIssuedAt()))
			.map(user -> OAuth2TokenValidatorResult.success())
			.orElseGet(() -> OAuth2TokenValidatorResult.failure(INVALID_SESSION));
	}

	private UUID parseUserId(String subject) {
		try {
			return UUID.fromString(subject);
		} catch (IllegalArgumentException | NullPointerException ex) {
			return null;
		}
	}

}
