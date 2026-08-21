package com.codemind.fieldops.template.controller;

import static org.assertj.core.api.Assertions.assertThat;

import com.codemind.fieldops.FieldopsApplication;
import com.codemind.fieldops.TestcontainersConfiguration;
import com.codemind.fieldops.shared.security.JwtClaims;
import com.codemind.fieldops.template.domain.InspectionTemplate;
import com.codemind.fieldops.template.domain.TemplateStatus;
import com.codemind.fieldops.template.repository.InspectionTemplateRepository;
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
class InspectionTemplateControllerIT {

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private InspectionTemplateRepository templateRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtEncoder jwtEncoder;

    private User adminUser;
    private User supervisorUser;
    private User technicianUser;
    private String adminToken;
    private String supervisorToken;
    private String technicianToken;

    @BeforeEach
    void setUp() {
        templateRepository.deleteAll();
        userRepository.deleteAll();
        adminUser = userRepository.save(newUser("Admin", "admin.tmpl@fieldops.local", UserRole.ADMIN));
        supervisorUser = userRepository.save(newUser("Supervisor", "supervisor.tmpl@fieldops.local", UserRole.SUPERVISOR));
        technicianUser = userRepository.save(newUser("Technician", "tech.tmpl@fieldops.local", UserRole.TECHNICIAN));
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

    @Test
    void adminCanCreateTemplate() {
        String payload = """
            {"title":"Safety Inspection","description":"Monthly safety check","category":"Safety"}""";

        assertThat(mvc.post().uri("/templates").header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON).content(payload))
            .hasStatus(HttpStatus.CREATED)
            .bodyJson()
            .extractingPath("$.title").asString().isEqualTo("Safety Inspection");
    }

    @Test
    void supervisorCanCreateTemplate() {
        String payload = """
            {"title":"Equipment Check","category":"Maintenance"}""";

        assertThat(mvc.post().uri("/templates").header("Authorization", bearer(supervisorToken))
            .contentType(MediaType.APPLICATION_JSON).content(payload))
            .hasStatus(HttpStatus.CREATED);
    }

    @Test
    void technicianCannotCreateTemplate() {
        String payload = """
            {"title":"Tech Template","category":"Test"}""";

        assertThat(mvc.post().uri("/templates").header("Authorization", bearer(technicianToken))
            .contentType(MediaType.APPLICATION_JSON).content(payload))
            .hasStatus(HttpStatus.FORBIDDEN);
    }

    @Test
    void newTemplateStartsAsDraft() {
        String payload = """
            {"title":"Draft Template","category":"Draft"}""";

        assertThat(mvc.post().uri("/templates").header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON).content(payload))
            .hasStatus(HttpStatus.CREATED)
            .bodyJson()
            .extractingPath("$.status").asString().isEqualTo("DRAFT");
    }

    @Test
    void adminCanListTemplates() {
        createTemplateViaApi("Template A", "Cat A");
        createTemplateViaApi("Template B", "Cat B");

        assertThat(mvc.get().uri("/templates").header("Authorization", bearer(adminToken)))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.content").asList().hasSizeGreaterThanOrEqualTo(2);
    }

    @Test
    void adminCanGetTemplateById() {
        String[] idHolder = {null};
        assertThat(mvc.post().uri("/templates").header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"title\":\"Get Test\",\"category\":\"Test\"}").exchange())
            .hasStatus(HttpStatus.CREATED).bodyJson()
            .extractingPath("$.id").asString().satisfies(s -> idHolder[0] = s);
        String id = idHolder[0];

        assertThat(mvc.get().uri("/templates/" + id).header("Authorization", bearer(adminToken)))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.title").asString().isEqualTo("Get Test");
    }

    @Test
    void getUnknownTemplateReturnsNotFound() {
        assertThat(mvc.get().uri("/templates/" + UUID.randomUUID()).header("Authorization", bearer(adminToken)))
            .hasStatus(HttpStatus.NOT_FOUND);
    }

    @Test
    void adminCanUpdateDraftTemplate() {
        String[] idHolder = {null};
        assertThat(mvc.post().uri("/templates").header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"title\":\"Original Title\",\"category\":\"Original\"}").exchange())
            .hasStatus(HttpStatus.CREATED).bodyJson()
            .extractingPath("$.id").asString().satisfies(s -> idHolder[0] = s);
        String id = idHolder[0];

        String updatePayload = """
            {"title":"Updated Title","category":"Updated Category"}""";

        assertThat(mvc.put().uri("/templates/" + id).header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON).content(updatePayload))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.title").asString().isEqualTo("Updated Title");
    }

    @Test
    void adminCanPublishTemplateWithSections() {
        String[] idHolder = {null};
        assertThat(mvc.post().uri("/templates").header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"title\":\"Publishable Template\",\"category\":\"Test\"}").exchange())
            .hasStatus(HttpStatus.CREATED).bodyJson()
            .extractingPath("$.id").asString().satisfies(s -> idHolder[0] = s);
        String id = idHolder[0];

        String publishPayload = """
            {
              "sections": [
                {
                  "title": "Section 1",
                  "displayOrder": 1,
                  "items": [
                    {
                      "title": "Item 1",
                      "responseType": "BOOLEAN",
                      "displayOrder": 1,
                      "required": true
                    }
                  ]
                }
              ]
            }""";

        assertThat(mvc.post().uri("/templates/" + id + "/publish").header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON).content(publishPayload))
            .hasStatus(HttpStatus.CREATED)
            .bodyJson()
            .extractingPath("$.versionNumber").asNumber().isEqualTo(1);
    }

    @Test
    void publishedTemplateBecomeActive() {
        String[] idHolder = {null};
        assertThat(mvc.post().uri("/templates").header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"title\":\"Active Template\",\"category\":\"Test\"}").exchange())
            .hasStatus(HttpStatus.CREATED).bodyJson()
            .extractingPath("$.id").asString().satisfies(s -> idHolder[0] = s);
        String id = idHolder[0];

        String publishPayload = """
            {"sections": [{"title": "S1","displayOrder": 1,"items": [{"title": "I1","responseType": "TEXT_SHORT","displayOrder": 1}]}]}""";

        mvc.post().uri("/templates/" + id + "/publish").header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON).content(publishPayload).exchange();

        assertThat(mvc.get().uri("/templates/" + id).header("Authorization", bearer(adminToken)))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.status").asString().isEqualTo("ACTIVE");
    }

    @Test
    void publishTemplateWithNoSectionsIsRejected() {
        String[] idHolder = {null};
        assertThat(mvc.post().uri("/templates").header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"title\":\"No Sections\",\"category\":\"Test\"}").exchange())
            .hasStatus(HttpStatus.CREATED).bodyJson()
            .extractingPath("$.id").asString().satisfies(s -> idHolder[0] = s);
        String id = idHolder[0];

        String publishPayload = """
            {"sections": []}""";

        assertThat(mvc.post().uri("/templates/" + id + "/publish").header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON).content(publishPayload))
            .hasStatus(HttpStatus.BAD_REQUEST);
    }

    @Test
    void adminCanGetActiveVersionOfTemplate() {
        String[] idHolder = {null};
        assertThat(mvc.post().uri("/templates").header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"title\":\"Version Template\",\"category\":\"Test\"}").exchange())
            .hasStatus(HttpStatus.CREATED).bodyJson()
            .extractingPath("$.id").asString().satisfies(s -> idHolder[0] = s);
        String id = idHolder[0];

        String publishPayload = """
            {"sections": [{"title": "S1","displayOrder": 1,"items": [{"title": "I1","responseType": "BOOLEAN","displayOrder": 1}]}]}""";
        mvc.post().uri("/templates/" + id + "/publish").header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON).content(publishPayload).exchange();

        assertThat(mvc.get().uri("/templates/" + id + "/active-version").header("Authorization", bearer(adminToken)))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.versionNumber").asNumber().isEqualTo(1);
    }

    @Test
    void anonymousCannotAccessTemplates() {
        assertThat(mvc.get().uri("/templates"))
            .hasStatus(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void createTemplateWithBlankTitleIsRejected() {
        String payload = """
            {"title":"","category":"Test"}""";

        assertThat(mvc.post().uri("/templates").header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON).content(payload))
            .hasStatus(HttpStatus.BAD_REQUEST);
    }

    private void createTemplateViaApi(String title, String category) {
        mvc.post().uri("/templates").header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"title\":\"" + title + "\",\"category\":\"" + category + "\"}")
            .exchange();
    }

}
