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
import java.util.Objects;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor
@AllArgsConstructor(access = AccessLevel.PACKAGE)
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
		Objects.requireNonNull(newStatus, "newStatus must not be null");
		this.status = newStatus;
		if (newStatus == UserStatus.BLOCKED) {
			invalidateSessions();
		}
	}

	public void updateProfile(String name, String email, UserRole role, String phone) {
		String requiredName = Objects.requireNonNull(name, "name must not be null");
		String requiredEmail = Objects.requireNonNull(email, "email must not be null");
		UserRole requiredRole = Objects.requireNonNull(role, "role must not be null");
		this.name = requiredName;
		this.email = requiredEmail;
		this.role = requiredRole;
		this.phone = phone;
	}

	public void changePassword(String newPasswordHash) {
		this.passwordHash = Objects.requireNonNull(newPasswordHash, "newPasswordHash must not be null");
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
