package com.codemind.fieldops.auth.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.codemind.fieldops.shared.security.JwtProperties;
import com.codemind.fieldops.user.domain.User;
import com.codemind.fieldops.user.domain.UserRole;
import com.codemind.fieldops.user.domain.UserStatus;
import com.codemind.fieldops.user.repository.UserRepository;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;

class AuthenticationServiceTest {

	private static final String RAW_PASSWORD = "correct-password";
	private static final String PASSWORD_HASH = "hashed-password";

	private UserRepository userRepository;
	private PasswordEncoder passwordEncoder;
	private JwtEncoder jwtEncoder;
	private JwtDecoder refreshTokenDecoder;
	private AuthenticationService authenticationService;

	@BeforeEach
	void setUp() {
		userRepository = mock(UserRepository.class);
		passwordEncoder = mock(PasswordEncoder.class);
		jwtEncoder = mock(JwtEncoder.class);
		refreshTokenDecoder = mock(JwtDecoder.class);
		JwtProperties jwtProperties = new JwtProperties("test-secret", 900, 604800);
		authenticationService =
			new AuthenticationService(userRepository, passwordEncoder, jwtEncoder, refreshTokenDecoder, jwtProperties);
	}

	private User activeUser(UserStatus status) {
		Instant past = Instant.now().minusSeconds(3600);
		return User.builder()
			.id(UUID.randomUUID())
			.name("Carlos Técnico")
			.email("tecnico@fieldops.local")
			.passwordHash(PASSWORD_HASH)
			.role(UserRole.TECHNICIAN)
			.status(status)
			.createdAt(past)
			.updatedAt(past)
			.version(0)
			.sessionValidAfter(past)
			.build();
	}

	private Jwt fakeJwt(String tokenValue) {
		Jwt jwt = mock(Jwt.class);
		when(jwt.getTokenValue()).thenReturn(tokenValue);
		return jwt;
	}

	@Test
	void loginWithValidCredentialsIssuesAccessAndRefreshTokensForActiveUser() {
		User user = activeUser(UserStatus.ACTIVE);
		when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
		when(passwordEncoder.matches(RAW_PASSWORD, PASSWORD_HASH)).thenReturn(true);
		Jwt accessJwt = fakeJwt("access-jwt");
		Jwt refreshJwt = fakeJwt("refresh-jwt");
		when(jwtEncoder.encode(any())).thenReturn(accessJwt, refreshJwt);

		AuthenticationResult result = authenticationService.login(user.getEmail(), RAW_PASSWORD);

		assertThat(result.accessToken()).isEqualTo("access-jwt");
		assertThat(result.refreshToken()).isEqualTo("refresh-jwt");
		assertThat(result.expiresInSeconds()).isEqualTo(900);
		assertThat(result.user().getId()).isEqualTo(user.getId());
	}

	@Test
	void loginWithWrongPasswordThrowsBadCredentials() {
		User user = activeUser(UserStatus.ACTIVE);
		when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
		when(passwordEncoder.matches(eq("wrong-password"), eq(PASSWORD_HASH))).thenReturn(false);

		assertThatThrownBy(() -> authenticationService.login(user.getEmail(), "wrong-password"))
			.isInstanceOf(BadCredentialsException.class);
	}

	@Test
	void loginWithUnknownEmailThrowsTheSameBadCredentialsAsWrongPassword() {
		when(userRepository.findByEmail("unknown@fieldops.local")).thenReturn(Optional.empty());

		assertThatThrownBy(() -> authenticationService.login("unknown@fieldops.local", RAW_PASSWORD))
			.isInstanceOf(BadCredentialsException.class)
			.hasMessage(AuthenticationService.INVALID_CREDENTIALS_MESSAGE);
	}

	@Test
	void loginWithCorrectPasswordButInactiveUserThrowsDisabledException() {
		User user = activeUser(UserStatus.INACTIVE);
		when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
		when(passwordEncoder.matches(RAW_PASSWORD, PASSWORD_HASH)).thenReturn(true);

		assertThatThrownBy(() -> authenticationService.login(user.getEmail(), RAW_PASSWORD))
			.isInstanceOf(DisabledException.class);
	}

	@Test
	void loginWithCorrectPasswordButBlockedUserThrowsLockedException() {
		User user = activeUser(UserStatus.BLOCKED);
		when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
		when(passwordEncoder.matches(RAW_PASSWORD, PASSWORD_HASH)).thenReturn(true);

		assertThatThrownBy(() -> authenticationService.login(user.getEmail(), RAW_PASSWORD))
			.isInstanceOf(LockedException.class);
	}

	@Test
	void refreshWithValidRefreshTokenIssuesNewTokenPair() {
		User user = activeUser(UserStatus.ACTIVE);
		Jwt decodedRefreshToken = mock(Jwt.class);
		when(decodedRefreshToken.getSubject()).thenReturn(user.getId().toString());
		when(refreshTokenDecoder.decode("valid-refresh-token")).thenReturn(decodedRefreshToken);
		when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
		Jwt newAccessJwt = fakeJwt("new-access-jwt");
		Jwt newRefreshJwt = fakeJwt("new-refresh-jwt");
		when(jwtEncoder.encode(any())).thenReturn(newAccessJwt, newRefreshJwt);

		AuthenticationResult result = authenticationService.refresh("valid-refresh-token");

		assertThat(result.accessToken()).isEqualTo("new-access-jwt");
		assertThat(result.refreshToken()).isEqualTo("new-refresh-jwt");
		assertThat(result.expiresInSeconds()).isEqualTo(900);
	}

	@Test
	void logoutInvalidatesAllExistingSessionsForTheUser() {
		User user = activeUser(UserStatus.ACTIVE);
		Instant before = user.getSessionValidAfter();
		when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

		authenticationService.logout(user.getId());

		assertThat(user.getSessionValidAfter()).isAfter(before);
	}

}
