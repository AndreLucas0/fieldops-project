package com.codemind.fieldops.auth.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.codemind.fieldops.user.domain.UserStatus;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.junit.jupiter.api.Test;

class SessionPolicyTest {

	private static final Instant SESSION_VALID_AFTER = Instant.parse("2026-01-01T00:00:00Z");

	@Test
	void activeUserWithTokenIssuedAfterSessionValidAfterHasValidSession() {
		Instant tokenIssuedAt = SESSION_VALID_AFTER.plus(1, ChronoUnit.MINUTES);

		boolean valid = SessionPolicy.isSessionValid(UserStatus.ACTIVE, SESSION_VALID_AFTER, tokenIssuedAt);

		assertThat(valid).isTrue();
	}

	@Test
	void tokenIssuedExactlyAtSessionValidAfterHasValidSession() {
		boolean valid = SessionPolicy.isSessionValid(UserStatus.ACTIVE, SESSION_VALID_AFTER, SESSION_VALID_AFTER);

		assertThat(valid).isTrue();
	}

	@Test
	void tokenIssuedBeforeSessionValidAfterIsRejected() {
		Instant tokenIssuedAt = SESSION_VALID_AFTER.minus(1, ChronoUnit.MINUTES);

		boolean valid = SessionPolicy.isSessionValid(UserStatus.ACTIVE, SESSION_VALID_AFTER, tokenIssuedAt);

		assertThat(valid).isFalse();
	}

	@Test
	void inactiveUserSessionIsNeverValidEvenWithFreshToken() {
		Instant tokenIssuedAt = SESSION_VALID_AFTER.plus(1, ChronoUnit.MINUTES);

		boolean valid = SessionPolicy.isSessionValid(UserStatus.INACTIVE, SESSION_VALID_AFTER, tokenIssuedAt);

		assertThat(valid).isFalse();
	}

	@Test
	void blockedUserSessionIsNeverValidEvenWithFreshToken() {
		Instant tokenIssuedAt = SESSION_VALID_AFTER.plus(1, ChronoUnit.MINUTES);

		boolean valid = SessionPolicy.isSessionValid(UserStatus.BLOCKED, SESSION_VALID_AFTER, tokenIssuedAt);

		assertThat(valid).isFalse();
	}

}
