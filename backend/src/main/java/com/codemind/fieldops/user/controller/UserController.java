package com.codemind.fieldops.user.controller;

import com.codemind.fieldops.shared.pagination.PageResponse;
import com.codemind.fieldops.shared.pagination.SortFieldValidator;
import com.codemind.fieldops.user.application.UserService;
import com.codemind.fieldops.user.domain.User;
import com.codemind.fieldops.user.domain.UserRole;
import com.codemind.fieldops.user.domain.UserStatus;
import com.codemind.fieldops.user.dto.ResetPasswordResponse;
import com.codemind.fieldops.user.dto.UserCreateRequest;
import com.codemind.fieldops.user.dto.UserResponse;
import com.codemind.fieldops.user.dto.UserStatusUpdateRequest;
import com.codemind.fieldops.user.dto.UserUpdateRequest;
import com.codemind.fieldops.user.mapper.UserMapper;
import jakarta.validation.Valid;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/users")
public class UserController {

	private static final Set<String> SORTABLE_FIELDS = Set.of("name", "email", "role", "status", "createdAt");

	private final UserService userService;
	private final UserMapper userMapper;

	public UserController(UserService userService, UserMapper userMapper) {
		this.userService = userService;
		this.userMapper = userMapper;
	}

	@GetMapping
	@PreAuthorize("hasRole('ADMIN')")
	public PageResponse<UserResponse> list(
			@RequestParam(required = false) String name,
			@RequestParam(required = false) String email,
			@RequestParam(required = false) UserRole role,
			@RequestParam(required = false) UserStatus status,
			@PageableDefault(size = 20) Pageable pageable) {
		SortFieldValidator.validate(pageable.getSort(), SORTABLE_FIELDS);
		Page<User> users = userService.list(name, email, role, status, pageable);
		return PageResponse.from(users.map(userMapper::toResponse));
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	@PreAuthorize("hasRole('ADMIN')")
	public UserResponse create(@Valid @RequestBody UserCreateRequest request) {
		return userMapper.toResponse(userService.create(request));
	}

	@GetMapping("/{id}")
	@PreAuthorize("hasRole('ADMIN')")
	public UserResponse get(@PathVariable UUID id) {
		return userMapper.toResponse(userService.getById(id));
	}

	@PutMapping("/{id}")
	@PreAuthorize("hasRole('ADMIN')")
	public UserResponse update(@PathVariable UUID id, @Valid @RequestBody UserUpdateRequest request) {
		return userMapper.toResponse(userService.update(id, request));
	}

	@PatchMapping("/{id}/status")
	@PreAuthorize("hasRole('ADMIN')")
	public UserResponse updateStatus(@PathVariable UUID id, @Valid @RequestBody UserStatusUpdateRequest request) {
		return userMapper.toResponse(userService.updateStatus(id, request.status()));
	}

	@PostMapping("/{id}/reset-password")
	@PreAuthorize("hasRole('ADMIN')")
	public ResetPasswordResponse resetPassword(@PathVariable UUID id) {
		userService.resetPassword(id);
		return new ResetPasswordResponse("Password reset successfully. The user's active sessions were invalidated.");
	}

}
