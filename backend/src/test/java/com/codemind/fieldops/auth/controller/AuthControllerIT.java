package com.codemind.fieldops.auth.controller;

import static org.assertj.core.api.Assertions.assertThat;

import com.codemind.fieldops.FieldopsApplication;
import com.codemind.fieldops.TestcontainersConfiguration;
import com.codemind.fieldops.shared.security.JwtClaims;
import com.codemind.fieldops.user.domain.User;
import com.codemind.fieldops.user.domain.UserRole;
import com.codemind.fieldops.user.domain.UserStatus;
import com.codemind.fieldops.user.repository.UserRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@Import(TestcontainersConfiguration.class)
@SpringBootTest(classes = FieldopsApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("local")
class AuthControllerIT {

	private static final String RAW_PASSWORD = "S3nhaSegura!";

	@Autowired
	private MockMvcTester mvc;

	@Autowired
	private UserRepository userRepository;

	@Autowired
	private PasswordEncoder passwordEncoder;

	@Autowired
	private JwtEncoder jwtEncoder;

	private User activeUser;

	@BeforeEach
	void setUp() {
		userRepository.deleteAll();
		activeUser = userRepository.save(User.builder()
			.name("Carlos Técnico")
			.email("tecnico.it@fieldops.local")
			.passwordHash(passwordEncoder.encode(RAW_PASSWORD))
			.role(UserRole.TECHNICIAN)
			.status(UserStatus.ACTIVE)
			.build());
	}

	private String mintToken(User user, Instant issuedAt, Instant expiresAt, String tokenUse) {
		JwtClaimsSet claims = JwtClaimsSet.builder()
			.subject(user.getId().toString())
			.issuedAt(issuedAt)
			.expiresAt(expiresAt)
			.claim(JwtClaims.TOKEN_USE, tokenUse)
			.claim(JwtClaims.ROLE, user.getRole().name())
			.claim(JwtClaims.EMAIL, user.getEmail())
			.build();
		JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
		return jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
	}

	@Test
	void loginWithValidCredentialsReturnsTokensAndUserSummary() {
		String payload = """
			{"email":"%s","password":"%s"}""".formatted(activeUser.getEmail(), RAW_PASSWORD);

		assertThat(mvc.post().uri("/auth/login").contentType(MediaType.APPLICATION_JSON).content(payload))
			.hasStatusOk()
			.bodyJson()
			.extractingPath("$.user.email").asString().isEqualTo(activeUser.getEmail());
	}

	@Test
	void loginWithWrongPasswordIsRejectedWithoutRevealingWhichFieldFailed() {
		String wrongPasswordPayload = """
			{"email":"%s","password":"wrong-password"}""".formatted(activeUser.getEmail());
		String unknownEmailPayload = """
			{"email":"unknown@fieldops.local","password":"%s"}""".formatted(RAW_PASSWORD);

		var wrongPasswordResult = mvc.post().uri("/auth/login")
			.contentType(MediaType.APPLICATION_JSON).content(wrongPasswordPayload).exchange();
		var unknownEmailResult = mvc.post().uri("/auth/login")
			.contentType(MediaType.APPLICATION_JSON).content(unknownEmailPayload).exchange();

		assertThat(wrongPasswordResult).hasStatus(HttpStatus.UNAUTHORIZED);
		assertThat(unknownEmailResult).hasStatus(HttpStatus.UNAUTHORIZED);
		String wrongPasswordMessage =
			assertThat(wrongPasswordResult).bodyJson().extractingPath("$.message").asString().actual();
		String unknownEmailMessage =
			assertThat(unknownEmailResult).bodyJson().extractingPath("$.message").asString().actual();
		assertThat(wrongPasswordMessage).isEqualTo(unknownEmailMessage);
	}

	@Test
	void loginWithInactiveUserIsRejectedWithDistinctGuidance() {
		activeUser.changeStatus(UserStatus.INACTIVE);
		userRepository.save(activeUser);
		String payload = """
			{"email":"%s","password":"%s"}""".formatted(activeUser.getEmail(), RAW_PASSWORD);

		assertThat(mvc.post().uri("/auth/login").contentType(MediaType.APPLICATION_JSON).content(payload))
			.hasStatus(HttpStatus.UNAUTHORIZED)
			.bodyJson()
			.extractingPath("$.message").asString().isEqualTo("User is inactive");
	}

	@Test
	void expiredAccessTokenIsRejectedOnProtectedEndpoint() {
		Instant past = Instant.now().minus(1, ChronoUnit.HOURS);
		String expiredAccessToken =
			mintToken(activeUser, past, past.plusSeconds(60), JwtClaims.TOKEN_USE_ACCESS);

		assertThat(mvc.get().uri("/auth/me").header("Authorization", "Bearer " + expiredAccessToken))
			.hasStatus(HttpStatus.UNAUTHORIZED);
	}

	@Test
	void refreshWithValidRefreshTokenIssuesAWorkingNewAccessToken() {
		String loginPayload = """
			{"email":"%s","password":"%s"}""".formatted(activeUser.getEmail(), RAW_PASSWORD);
		var loginResult = mvc.post().uri("/auth/login")
			.contentType(MediaType.APPLICATION_JSON).content(loginPayload).exchange();
		String refreshToken =
			assertThat(loginResult).bodyJson().extractingPath("$.refreshToken").asString().actual();

		String refreshPayload = """
			{"refreshToken":"%s"}""".formatted(refreshToken);
		var refreshResult = mvc.post().uri("/auth/refresh")
			.contentType(MediaType.APPLICATION_JSON).content(refreshPayload).exchange();
		assertThat(refreshResult).hasStatusOk();
		String newAccessToken =
			assertThat(refreshResult).bodyJson().extractingPath("$.accessToken").asString().actual();

		assertThat(mvc.get().uri("/auth/me").header("Authorization", "Bearer " + newAccessToken))
			.hasStatusOk();
	}

	@Test
	void logoutInvalidatesTheAccessTokenThatWasIssuedBeforeIt() throws InterruptedException {
		String loginPayload = """
			{"email":"%s","password":"%s"}""".formatted(activeUser.getEmail(), RAW_PASSWORD);
		var loginResult = mvc.post().uri("/auth/login")
			.contentType(MediaType.APPLICATION_JSON).content(loginPayload).exchange();
		String accessToken =
			assertThat(loginResult).bodyJson().extractingPath("$.accessToken").asString().actual();

		// JWT "iat" is second-precision (RFC 7519 NumericDate), same as
		// session_valid_after — a real gap is needed so logout's invalidation
		// timestamp doesn't truncate to the very same second as the token.
		Thread.sleep(1100);

		assertThat(mvc.post().uri("/auth/logout").header("Authorization", "Bearer " + accessToken))
			.hasStatus(HttpStatus.NO_CONTENT);

		assertThat(mvc.get().uri("/auth/me").header("Authorization", "Bearer " + accessToken))
			.hasStatus(HttpStatus.UNAUTHORIZED);
	}

}
