package com.codemind.fieldops.user.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNullPointerException;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class UserStatusTransitionTest {

	private User newActiveUser() {
		Instant past = Instant.now().minus(1, ChronoUnit.DAYS);
		return User.builder()
			.id(UUID.randomUUID())
			.name("Carlos Técnico")
			.email("tecnico@fieldops.local")
			.passwordHash("hash")
			.role(UserRole.TECHNICIAN)
			.status(UserStatus.ACTIVE)
			.createdAt(past)
			.updatedAt(past)
			.version(0)
			.sessionValidAfter(past)
			.build();
	}

	@Test
	void blockingUserInvalidatesExistingSessions() {
		User user = newActiveUser();
		Instant before = user.getSessionValidAfter();

		user.changeStatus(UserStatus.BLOCKED);

		assertThat(user.getStatus()).isEqualTo(UserStatus.BLOCKED);
		assertThat(user.getSessionValidAfter()).isAfter(before);
	}

	@Test
	void deactivatingUserDoesNotInvalidateExistingSessions() {
		User user = newActiveUser();
		Instant before = user.getSessionValidAfter();

		user.changeStatus(UserStatus.INACTIVE);

		assertThat(user.getStatus()).isEqualTo(UserStatus.INACTIVE);
		assertThat(user.getSessionValidAfter()).isEqualTo(before);
	}

	@Test
	void reactivatingUserDoesNotInvalidateExistingSessions() {
		User user = newActiveUser();
		Instant before = user.getSessionValidAfter();

		user.changeStatus(UserStatus.ACTIVE);

		assertThat(user.getStatus()).isEqualTo(UserStatus.ACTIVE);
		assertThat(user.getSessionValidAfter()).isEqualTo(before);
	}

	@Test
	void deactivatingUserPreservesHistoricalFields() {
		User user = newActiveUser();
		String originalName = user.getName();
		String originalEmail = user.getEmail();
		Instant originalCreatedAt = user.getCreatedAt();

		user.changeStatus(UserStatus.INACTIVE);

		assertThat(user.getName()).isEqualTo(originalName);
		assertThat(user.getEmail()).isEqualTo(originalEmail);
		assertThat(user.getCreatedAt()).isEqualTo(originalCreatedAt);
	}

	@Test
	void changingPasswordInvalidatesExistingSessions() {
		User user = newActiveUser();
		Instant before = user.getSessionValidAfter();

		user.changePassword("new-hash");

		assertThat(user.getPasswordHash()).isEqualTo("new-hash");
		assertThat(user.getSessionValidAfter()).isAfter(before);
	}

	@Test
	void updatingProfileChangesEditableFieldsWithoutChangingCredentialsOrStatus() {
		User user = newActiveUser();
		String originalPasswordHash = user.getPasswordHash();

		user.updateProfile("Maria Técnica", "maria@fieldops.local", UserRole.SUPERVISOR, null);

		assertThat(user.getName()).isEqualTo("Maria Técnica");
		assertThat(user.getEmail()).isEqualTo("maria@fieldops.local");
		assertThat(user.getRole()).isEqualTo(UserRole.SUPERVISOR);
		assertThat(user.getPhone()).isNull();
		assertThat(user.getPasswordHash()).isEqualTo(originalPasswordHash);
		assertThat(user.getStatus()).isEqualTo(UserStatus.ACTIVE);
	}

	@Test
	void profileCannotBeUpdatedWithMissingRequiredFields() {
		User user = newActiveUser();

		assertThatNullPointerException()
			.isThrownBy(() -> user.updateProfile(null, "maria@fieldops.local", UserRole.SUPERVISOR, null));
		assertThatNullPointerException()
			.isThrownBy(() -> user.updateProfile("Maria", null, UserRole.SUPERVISOR, null));
		assertThatNullPointerException()
			.isThrownBy(() -> user.updateProfile("Maria", "maria@fieldops.local", null, null));
	}

	@Test
	void changingPasswordRequiresAHash() {
		User user = newActiveUser();

		assertThatNullPointerException().isThrownBy(() -> user.changePassword(null));
	}

}
