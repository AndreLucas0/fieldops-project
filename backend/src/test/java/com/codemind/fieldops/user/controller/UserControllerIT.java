package com.codemind.fieldops.user.controller;

import static org.assertj.core.api.Assertions.assertThat;

import com.codemind.fieldops.FieldopsApplication;
import com.codemind.fieldops.TestcontainersConfiguration;
import com.codemind.fieldops.shared.security.JwtClaims;
import com.codemind.fieldops.user.domain.User;
import com.codemind.fieldops.user.domain.UserRole;
import com.codemind.fieldops.user.domain.UserStatus;
import com.codemind.fieldops.user.repository.UserRepository;
import java.time.Instant;
import java.util.UUID;
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
class UserControllerIT {

	private static final String RAW_PASSWORD = "S3nhaSegura!";

	@Autowired
	private MockMvcTester mvc;

	@Autowired
	private UserRepository userRepository;

	@Autowired
	private PasswordEncoder passwordEncoder;

	@Autowired
	private JwtEncoder jwtEncoder;

	private User adminUser;
	private User technicianUser;
	private String adminToken;
	private String technicianToken;
	private String supervisorToken;

	@BeforeEach
	void setUp() {
		userRepository.deleteAll();
		adminUser = userRepository.save(newUser("Ana Administradora", "admin.it@fieldops.local", UserRole.ADMIN));
		technicianUser =
			userRepository.save(newUser("Carlos Técnico", "tecnico.it@fieldops.local", UserRole.TECHNICIAN));
		User supervisorUser =
			userRepository.save(newUser("Marina Supervisora", "supervisor.it@fieldops.local", UserRole.SUPERVISOR));
		adminToken = mintAccessToken(adminUser);
		technicianToken = mintAccessToken(technicianUser);
		supervisorToken = mintAccessToken(supervisorUser);
	}

	private User newUser(String name, String email, UserRole role) {
		return User.builder()
			.name(name)
			.email(email)
			.passwordHash(passwordEncoder.encode(RAW_PASSWORD))
			.role(role)
			.status(UserStatus.ACTIVE)
			.build();
	}

	private String mintAccessToken(User user) {
		Instant now = Instant.now();
		JwtClaimsSet claims = JwtClaimsSet.builder()
			.subject(user.getId().toString())
			.issuedAt(now)
			.expiresAt(now.plusSeconds(900))
			.claim(JwtClaims.TOKEN_USE, JwtClaims.TOKEN_USE_ACCESS)
			.claim(JwtClaims.ROLE, user.getRole().name())
			.claim(JwtClaims.EMAIL, user.getEmail())
			.build();
		JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
		return jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
	}

	private String bearer(String token) {
		return "Bearer " + token;
	}

	@Test
	void adminCanCreateUser() {
		String payload = """
			{"name":"Roberta Técnica","email":"roberta.it@fieldops.local","password":"OutraSenha1!","role":"TECHNICIAN"}""";

		assertThat(mvc.post().uri("/users").header("Authorization", bearer(adminToken))
			.contentType(MediaType.APPLICATION_JSON).content(payload))
			.hasStatus(HttpStatus.CREATED)
			.bodyJson()
			.extractingPath("$.email").asString().isEqualTo("roberta.it@fieldops.local");
	}

	@Test
	void createdUserResponseNeverExposesThePassword() {
		String payload = """
			{"name":"Roberta Técnica","email":"roberta2.it@fieldops.local","password":"OutraSenha1!","role":"TECHNICIAN"}""";

		var result = mvc.post().uri("/users").header("Authorization", bearer(adminToken))
			.contentType(MediaType.APPLICATION_JSON).content(payload).exchange();

		assertThat(result).bodyJson().doesNotHavePath("$.passwordHash");
		assertThat(result).bodyJson().doesNotHavePath("$.password");
	}

	@Test
	void creatingUserWithDuplicateEmailIsRejectedWithConflict() {
		String payload = """
			{"name":"Duplicado","email":"%s","password":"OutraSenha1!","role":"TECHNICIAN"}"""
			.formatted(technicianUser.getEmail());

		assertThat(mvc.post().uri("/users").header("Authorization", bearer(adminToken))
			.contentType(MediaType.APPLICATION_JSON).content(payload))
			.hasStatus(HttpStatus.CONFLICT);
	}

	@Test
	void creatingUserWithInvalidPayloadIsRejectedAsBadRequest() {
		String payload = """
			{"name":"","email":"not-an-email","password":"123","role":"TECHNICIAN"}""";

		assertThat(mvc.post().uri("/users").header("Authorization", bearer(adminToken))
			.contentType(MediaType.APPLICATION_JSON).content(payload))
			.hasStatus(HttpStatus.BAD_REQUEST);
	}

	@Test
	void technicianCannotAccessUserManagementEndpoints() {
		assertThat(mvc.get().uri("/users").header("Authorization", bearer(technicianToken)))
			.hasStatus(HttpStatus.FORBIDDEN);
	}

	@Test
	void supervisorCannotManageUsersWithoutThatPermissionAssigned() {
		assertThat(mvc.get().uri("/users").header("Authorization", bearer(supervisorToken)))
			.hasStatus(HttpStatus.FORBIDDEN);
	}

	@Test
	void anonymousRequestIsRejectedAsUnauthorized() {
		assertThat(mvc.get().uri("/users")).hasStatus(HttpStatus.UNAUTHORIZED);
	}

	@Test
	void adminCanListAndFilterUsersWithPagination() {
		assertThat(mvc.get().uri("/users?role=TECHNICIAN&page=0&size=10").header("Authorization", bearer(adminToken)))
			.hasStatusOk()
			.bodyJson()
			.extractingPath("$.content[0].role").asString().isEqualTo("TECHNICIAN");
	}

	@Test
	void gettingUnknownUserReturnsNotFound() {
		assertThat(mvc.get().uri("/users/" + UUID.randomUUID()).header("Authorization", bearer(adminToken)))
			.hasStatus(HttpStatus.NOT_FOUND);
	}

	@Test
	void adminCanUpdateUserData() {
		String payload = """
			{"name":"Carlos Técnico Sênior","email":"%s","role":"TECHNICIAN","phone":"+55 11 90000-0009"}"""
			.formatted(technicianUser.getEmail());

		assertThat(mvc.put().uri("/users/" + technicianUser.getId()).header("Authorization", bearer(adminToken))
			.contentType(MediaType.APPLICATION_JSON).content(payload))
			.hasStatusOk()
			.bodyJson()
			.extractingPath("$.name").asString().isEqualTo("Carlos Técnico Sênior");
	}

	@Test
	void updatingUserWithAnotherUsersEmailIsRejectedWithConflict() {
		String payload = """
			{"name":"Carlos","email":"%s","role":"TECHNICIAN"}""".formatted(adminUser.getEmail());

		assertThat(mvc.put().uri("/users/" + technicianUser.getId()).header("Authorization", bearer(adminToken))
			.contentType(MediaType.APPLICATION_JSON).content(payload))
			.hasStatus(HttpStatus.CONFLICT);
	}

	@Test
	void deactivatingUserKeepsItsHistoricalIdentityInsteadOfDeletingIt() {
		String payload = """
			{"status":"INACTIVE"}""";

		assertThat(mvc.patch().uri("/users/" + technicianUser.getId() + "/status")
			.header("Authorization", bearer(adminToken))
			.contentType(MediaType.APPLICATION_JSON).content(payload))
			.hasStatusOk()
			.bodyJson()
			.extractingPath("$.status").asString().isEqualTo("INACTIVE");

		assertThat(userRepository.findById(technicianUser.getId())).isPresent();
	}

	@Test
	void deactivatingUserImmediatelyInvalidatesItsActiveSession() {
		String payload = """
			{"status":"INACTIVE"}""";

		mvc.patch().uri("/users/" + technicianUser.getId() + "/status")
			.header("Authorization", bearer(adminToken))
			.contentType(MediaType.APPLICATION_JSON).content(payload).exchange();

		assertThat(mvc.get().uri("/auth/me").header("Authorization", bearer(technicianToken)))
			.hasStatus(HttpStatus.UNAUTHORIZED);
	}

	@Test
	void resettingPasswordInvalidatesTheUsersActiveSession() throws InterruptedException {
		// JWT "iat" is second-precision (RFC 7519 NumericDate) — a real gap is
		// needed so the invalidation timestamp doesn't truncate to the same
		// second as the token minted in setUp().
		Thread.sleep(1100);

		assertThat(mvc.post().uri("/users/" + technicianUser.getId() + "/reset-password")
			.header("Authorization", bearer(adminToken)))
			.hasStatusOk()
			.bodyJson()
			.extractingPath("$.message").asString().isNotEmpty();

		assertThat(mvc.get().uri("/auth/me").header("Authorization", bearer(technicianToken)))
			.hasStatus(HttpStatus.UNAUTHORIZED);
	}

	@Test
	void resettingPasswordForUnknownUserReturnsNotFound() {
		assertThat(mvc.post().uri("/users/" + UUID.randomUUID() + "/reset-password")
			.header("Authorization", bearer(adminToken)))
			.hasStatus(HttpStatus.NOT_FOUND);
	}

}
