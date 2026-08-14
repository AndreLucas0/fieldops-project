package com.codemind.fieldops.auth.domain;

import com.codemind.fieldops.user.domain.UserStatus;
import java.time.Instant;

public final class SessionPolicy {

	private SessionPolicy() {
	}

	/**
	 * RN-001: only ACTIVE users may have a valid session.
	 * RN-008: a token issued before the user's session_valid_after marker
	 * (bumped on password change or blocking) is no longer valid.
	 */
	public static boolean isSessionValid(UserStatus status, Instant sessionValidAfter, Instant tokenIssuedAt) {
		if (status != UserStatus.ACTIVE) {
			return false;
		}
		return !tokenIssuedAt.isBefore(sessionValidAfter);
	}

}
