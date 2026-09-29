package com.codemind.fieldops.template.controller;

import static org.assertj.core.api.Assertions.assertThat;

import com.codemind.fieldops.FieldopsApplication;
import com.codemind.fieldops.TestcontainersConfiguration;
import com.codemind.fieldops.shared.security.JwtClaims;
import com.codemind.fieldops.template.repository.InspectionTemplateRepository;
import com.codemind.fieldops.template.repository.TemplateVersionRepository;
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
class TemplateVersionControllerIT {

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private InspectionTemplateRepository templateRepository;

    @Autowired
    private TemplateVersionRepository versionRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtEncoder jwtEncoder;

    private String adminToken;
    private String supervisorToken;
    private String technicianToken;

    @BeforeEach
    void setUp() {
        versionRepository.deleteAll();
        templateRepository.deleteAll();
        userRepository.deleteAll();

        User adminUser = userRepository.save(newUser("Admin", "admin.tver@fieldops.local", UserRole.ADMIN));
        User supervisorUser = userRepository.save(newUser("Supervisor", "supervisor.tver@fieldops.local", UserRole.SUPERVISOR));
        User technicianUser = userRepository.save(newUser("Technician", "tech.tver@fieldops.local", UserRole.TECHNICIAN));

        adminToken = mintAccessToken(adminUser);
        supervisorToken = mintAccessToken(supervisorUser);
        technicianToken = mintAccessToken(technicianUser);
    }

    private User newUser(String name, String email, UserRole role) {
        return User.builder()
            .name(name)
            .email(email)
            .passwordHash(passwordEncoder.encode("S3nhaSegura!"))
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

    /** Creates a template and publishes it; returns the template UUID string. */
    private String createAndPublishTemplate(String title) {
        String[] idHolder = {null};
        assertThat(mvc.post().uri("/templates")
            .header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"title\":\"" + title + "\",\"category\":\"Test\"}")
            .exchange())
            .hasStatus(HttpStatus.CREATED)
            .bodyJson()
            .extractingPath("$.id").asString().satisfies(s -> idHolder[0] = s);

        String publishPayload = """
            {"sections": [{"title": "S1","displayOrder": 1,"items": [{"title": "I1","responseType": "BOOLEAN","displayOrder": 1}]}]}""";
        mvc.post().uri("/templates/" + idHolder[0] + "/publish")
            .header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON)
            .content(publishPayload)
            .exchange();

        return idHolder[0];
    }

    @Test
    void adminCanListVersionsOfPublishedTemplate() {
        String templateId = createAndPublishTemplate("Version List Template");

        assertThat(mvc.get()
            .uri("/inspection-templates/" + templateId + "/versions")
            .header("Authorization", bearer(adminToken)))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.content").asList().hasSize(1);
    }

    @Test
    void supervisorCanListVersions() {
        String templateId = createAndPublishTemplate("Supervisor Version Template");

        assertThat(mvc.get()
            .uri("/inspection-templates/" + templateId + "/versions")
            .header("Authorization", bearer(supervisorToken)))
            .hasStatusOk();
    }

    @Test
    void technicianCannotListVersions() {
        String templateId = createAndPublishTemplate("Tech Denied Version Template");

        assertThat(mvc.get()
            .uri("/inspection-templates/" + templateId + "/versions")
            .header("Authorization", bearer(technicianToken)))
            .hasStatus(HttpStatus.FORBIDDEN);
    }

    @Test
    void listVersionsForNonExistentTemplateReturns404() {
        assertThat(mvc.get()
            .uri("/inspection-templates/" + UUID.randomUUID() + "/versions")
            .header("Authorization", bearer(adminToken)))
            .hasStatus(HttpStatus.NOT_FOUND);
    }

    @Test
    void adminCanGetVersionDetail() {
        String[] templateIdHolder = {null};
        String[] versionIdHolder = {null};

        assertThat(mvc.post().uri("/templates")
            .header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"title\":\"Detail Version Template\",\"category\":\"Test\"}")
            .exchange())
            .hasStatus(HttpStatus.CREATED)
            .bodyJson()
            .extractingPath("$.id").asString().satisfies(s -> templateIdHolder[0] = s);

        String publishPayload = """
            {"sections": [{"title": "Section A","displayOrder": 1,"items": [{"title": "Item A","responseType": "BOOLEAN","displayOrder": 1}]}]}""";
        assertThat(mvc.post().uri("/templates/" + templateIdHolder[0] + "/publish")
            .header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON)
            .content(publishPayload)
            .exchange())
            .hasStatus(HttpStatus.CREATED)
            .bodyJson()
            .extractingPath("$.id").asString().satisfies(s -> versionIdHolder[0] = s);

        assertThat(mvc.get()
            .uri("/inspection-template-versions/" + versionIdHolder[0])
            .header("Authorization", bearer(adminToken)))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.versionNumber").asNumber().isEqualTo(1);
    }

    @Test
    void technicianCannotGetVersionDetail() {
        String[] versionIdHolder = {null};
        String[] templateIdHolder = {null};

        assertThat(mvc.post().uri("/templates")
            .header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"title\":\"Tech Denied Detail Template\",\"category\":\"Test\"}")
            .exchange())
            .hasStatus(HttpStatus.CREATED)
            .bodyJson()
            .extractingPath("$.id").asString().satisfies(s -> templateIdHolder[0] = s);

        String publishPayload = """
            {"sections": [{"title": "S1","displayOrder": 1,"items": [{"title": "I1","responseType": "BOOLEAN","displayOrder": 1}]}]}""";
        assertThat(mvc.post().uri("/templates/" + templateIdHolder[0] + "/publish")
            .header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON)
            .content(publishPayload)
            .exchange())
            .hasStatus(HttpStatus.CREATED)
            .bodyJson()
            .extractingPath("$.id").asString().satisfies(s -> versionIdHolder[0] = s);

        assertThat(mvc.get()
            .uri("/inspection-template-versions/" + versionIdHolder[0])
            .header("Authorization", bearer(technicianToken)))
            .hasStatus(HttpStatus.FORBIDDEN);
    }

    @Test
    void versionDetailNotFoundReturns404() {
        assertThat(mvc.get()
            .uri("/inspection-template-versions/" + UUID.randomUUID())
            .header("Authorization", bearer(adminToken)))
            .hasStatus(HttpStatus.NOT_FOUND);
    }

}
