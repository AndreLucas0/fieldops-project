package com.codemind.fieldops.shared.error;

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

/**
 * Malformed requests and unknown routes must follow api-rest.md §12.3
 * (400 "requisição malformada", 404 "recurso não encontrado") with the §12.2
 * error body, instead of falling into the catch-all 500.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(classes = FieldopsApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("local")
class GlobalExceptionHandlerIT {

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private JwtEncoder jwtEncoder;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private String adminToken;

    @BeforeEach
    void setUp() {
        // The session validator requires the token subject to be a real user; a unique email
        // avoids wiping the users table (see decisions.md ITORDER-001).
        User admin = userRepository.save(User.builder()
            .name("Admin Errors")
            .email("admin.err." + UUID.randomUUID() + "@fieldops.local")
            .passwordHash(passwordEncoder.encode("S3nhaSegura!"))
            .role(UserRole.ADMIN)
            .status(UserStatus.ACTIVE)
            .build());
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
            .subject(admin.getId().toString())
            .issuedAt(now)
            .expiresAt(now.plusSeconds(900))
            .claim(JwtClaims.TOKEN_USE, JwtClaims.TOKEN_USE_ACCESS)
            .claim(JwtClaims.ROLE, admin.getRole().name())
            .claim(JwtClaims.EMAIL, admin.getEmail())
            .build();
        adminToken = jwtEncoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
            .getTokenValue();
    }

    private String bearer() {
        return "Bearer " + adminToken;
    }

    @Test
    void unknownRouteReturns404WithErrorBody() {
        assertThat(mvc.get().uri("/this-route-does-not-exist").header("Authorization", bearer()))
            .hasStatus(HttpStatus.NOT_FOUND)
            .bodyJson()
            .satisfies(json -> {
                assertThat(json).extractingPath("$.status").asNumber().isEqualTo(404);
                assertThat(json).extractingPath("$.code").asString().isEqualTo("ROUTE_NOT_FOUND");
                assertThat(json).extractingPath("$.path").asString().endsWith("/this-route-does-not-exist");
            });
    }

    @Test
    void unknownRouteWithoutTokenStillReturns401() {
        assertThat(mvc.get().uri("/this-route-does-not-exist"))
            .hasStatus(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void malformedJsonReturns400() {
        assertThat(mvc.post().uri("/inspection-templates").header("Authorization", bearer())
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"title\": \"Unclosed"))
            .hasStatus(HttpStatus.BAD_REQUEST)
            .bodyJson()
            .satisfies(json -> {
                assertThat(json).extractingPath("$.status").asNumber().isEqualTo(400);
                assertThat(json).extractingPath("$.code").asString().isEqualTo("MALFORMED_REQUEST");
            });
    }

    @Test
    void missingRequiredBodyReturns400() {
        assertThat(mvc.post().uri("/inspection-templates").header("Authorization", bearer())
            .contentType(MediaType.APPLICATION_JSON))
            .hasStatus(HttpStatus.BAD_REQUEST)
            .bodyJson()
            .extractingPath("$.code").asString().isEqualTo("MALFORMED_REQUEST");
    }

    @Test
    void invalidUuidInPathReturns400() {
        assertThat(mvc.get().uri("/inspection-templates/not-a-uuid").header("Authorization", bearer()))
            .hasStatus(HttpStatus.BAD_REQUEST)
            .bodyJson()
            .satisfies(json -> {
                assertThat(json).extractingPath("$.code").asString().isEqualTo("INVALID_PARAMETER");
                assertThat(json).extractingPath("$.fieldErrors[0].field").asString().isEqualTo("id");
            });
    }

}
