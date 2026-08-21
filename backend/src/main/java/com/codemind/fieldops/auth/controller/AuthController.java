package com.codemind.fieldops.auth.controller;

import com.codemind.fieldops.auth.application.AuthenticationResult;
import com.codemind.fieldops.auth.application.AuthenticationService;
import com.codemind.fieldops.auth.dto.CurrentUserResponse;
import com.codemind.fieldops.auth.dto.LoginRequest;
import com.codemind.fieldops.auth.dto.LoginResponse;
import com.codemind.fieldops.auth.dto.RefreshTokenRequest;
import com.codemind.fieldops.auth.dto.RefreshTokenResponse;
import com.codemind.fieldops.auth.dto.UserSummary;
import com.codemind.fieldops.user.domain.User;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
public class AuthController {

	private final AuthenticationService authenticationService;

	public AuthController(AuthenticationService authenticationService) {
		this.authenticationService = authenticationService;
	}

	@PostMapping("/login")
	public LoginResponse login(@Valid @RequestBody LoginRequest request) {
		AuthenticationResult result = authenticationService.login(request.email(), request.password());
		return toLoginResponse(result);
	}

	@PostMapping("/refresh")
	public RefreshTokenResponse refresh(@Valid @RequestBody RefreshTokenRequest request) {
		AuthenticationResult result = authenticationService.refresh(request.refreshToken());
		return new RefreshTokenResponse(result.accessToken(), result.refreshToken(), result.expiresInSeconds());
	}

	@PostMapping("/logout")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void logout(@AuthenticationPrincipal Jwt jwt) {
		authenticationService.logout(UUID.fromString(jwt.getSubject()));
	}

	@GetMapping("/me")
	public CurrentUserResponse me(@AuthenticationPrincipal Jwt jwt) {
		User user = authenticationService.getCurrentUser(UUID.fromString(jwt.getSubject()));
		return new CurrentUserResponse(user.getId(), user.getName(), user.getEmail(), user.getRole(), user.getStatus(),
			user.getPhone());
	}

	private LoginResponse toLoginResponse(AuthenticationResult result) {
		User user = result.user();
		UserSummary summary = new UserSummary(user.getId(), user.getName(), user.getEmail(), user.getRole());
		return new LoginResponse(result.accessToken(), result.refreshToken(), result.expiresInSeconds(), summary);
	}

}
