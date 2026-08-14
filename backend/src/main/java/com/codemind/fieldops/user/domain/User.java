package com.codemind.fieldops.user.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

	@Id
	private UUID id;

	@Column(nullable = false, length = 150)
	private String name;

	@Column(nullable = false, unique = true, length = 255)
	private String email;

	@Column(name = "password_hash", nullable = false, length = 255)
	private String passwordHash;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private UserRole role;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private UserStatus status;

	@Column(length = 30)
	private String phone;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	@Version
	@Column(nullable = false)
	private Integer version;

	@Column(name = "session_valid_after", nullable = false)
	private Instant sessionValidAfter;

	@PrePersist
	void onCreate() {
		Instant now = Instant.now();
		if (id == null) {
			id = UUID.randomUUID();
		}
		createdAt = now;
		updatedAt = now;
		if (sessionValidAfter == null) {
			sessionValidAfter = now.truncatedTo(ChronoUnit.SECONDS);
		}
	}

	@PreUpdate
	void onUpdate() {
		updatedAt = Instant.now();
	}

	public void changeStatus(UserStatus newStatus) {
		this.status = newStatus;
		if (newStatus == UserStatus.BLOCKED) {
			invalidateSessions();
		}
	}

	public void changePassword(String newPasswordHash) {
		this.passwordHash = newPasswordHash;
		invalidateSessions();
	}

	/**
	 * Truncated to whole seconds to match JWT "iat" precision (RFC 7519
	 * NumericDate) — otherwise a token minted in the same second as this call
	 * can compare as issued "before" this instant purely due to sub-second
	 * truncation, rejecting a session that was never actually invalidated.
	 */
	public void invalidateSessions() {
		this.sessionValidAfter = Instant.now().truncatedTo(ChronoUnit.SECONDS);
	}

}
