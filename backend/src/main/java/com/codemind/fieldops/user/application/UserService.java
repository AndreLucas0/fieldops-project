package com.codemind.fieldops.user.application;

import com.codemind.fieldops.shared.error.ResourceConflictException;
import com.codemind.fieldops.shared.error.ResourceNotFoundException;
import com.codemind.fieldops.user.domain.User;
import com.codemind.fieldops.user.domain.UserRole;
import com.codemind.fieldops.user.domain.UserStatus;
import com.codemind.fieldops.user.dto.UserCreateRequest;
import com.codemind.fieldops.user.dto.UserUpdateRequest;
import com.codemind.fieldops.user.repository.UserRepository;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

	private static final String USER_NOT_FOUND_CODE = "USER_NOT_FOUND";
	private static final String USER_EMAIL_ALREADY_REGISTERED_CODE = "USER_EMAIL_ALREADY_REGISTERED";
	private static final SecureRandom SECURE_RANDOM = new SecureRandom();

	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder;

	public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
		this.userRepository = userRepository;
		this.passwordEncoder = passwordEncoder;
	}

	@Transactional(readOnly = true)
	public Page<User> list(String name, String email, UserRole role, UserStatus status, Pageable pageable) {
		Specification<User> specification = Specification
			.where(UserSpecifications.nameContains(name))
			.and(UserSpecifications.emailContains(email))
			.and(UserSpecifications.hasRole(role))
			.and(UserSpecifications.hasStatus(status));
		return userRepository.findAll(specification, pageable);
	}

	@Transactional(readOnly = true)
	public User getById(UUID id) {
		return userRepository.findById(id)
			.orElseThrow(() -> new ResourceNotFoundException(USER_NOT_FOUND_CODE, "User not found"));
	}

	@Transactional
	public User create(UserCreateRequest request) {
		requireEmailAvailable(request.email(), null);
		User user = User.builder()
			.name(request.name())
			.email(request.email())
			.passwordHash(passwordEncoder.encode(request.password()))
			.role(request.role())
			.status(UserStatus.ACTIVE)
			.phone(request.phone())
			.build();
		return userRepository.save(user);
	}

	@Transactional
	public User update(UUID id, UserUpdateRequest request) {
		User user = getById(id);
		requireEmailAvailable(request.email(), id);
		user.setName(request.name());
		user.setEmail(request.email());
		user.setRole(request.role());
		user.setPhone(request.phone());
		return userRepository.save(user);
	}

	@Transactional
	public User updateStatus(UUID id, UserStatus status) {
		User user = getById(id);
		user.changeStatus(status);
		return userRepository.save(user);
	}

	@Transactional
	public void resetPassword(UUID id) {
		User user = getById(id);
		user.changePassword(passwordEncoder.encode(generateTemporaryPassword()));
		userRepository.save(user);
	}

	private void requireEmailAvailable(String email, UUID excludingUserId) {
		userRepository.findByEmail(email)
			.filter(existing -> !existing.getId().equals(excludingUserId))
			.ifPresent(existing -> {
				throw new ResourceConflictException(USER_EMAIL_ALREADY_REGISTERED_CODE, "Email is already registered");
			});
	}

	/**
	 * The initial/rotated password itself is never returned or logged (RN-007)
	 * — see ResetPasswordResponse (openapi.yaml) and PEND-01 in
	 * docs/contrato-backend-frontend.md, which leaves the delivery channel for
	 * this temporary password an open product decision.
	 */
	private String generateTemporaryPassword() {
		byte[] randomBytes = new byte[18];
		SECURE_RANDOM.nextBytes(randomBytes);
		return Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
	}

}
