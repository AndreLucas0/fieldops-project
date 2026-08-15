package com.codemind.fieldops.inspection.controller;

import static org.assertj.core.api.Assertions.assertThat;

import com.codemind.fieldops.FieldopsApplication;
import com.codemind.fieldops.TestcontainersConfiguration;
import com.codemind.fieldops.client.domain.Client;
import com.codemind.fieldops.client.domain.ClientStatus;
import com.codemind.fieldops.client.repository.ClientRepository;
import com.codemind.fieldops.inspection.repository.InspectionRepository;
import com.codemind.fieldops.inspection.repository.InspectionResponseRepository;
import com.codemind.fieldops.inspection.repository.ItemSnapshotRepository;
import com.codemind.fieldops.nonconformity.repository.NonConformityRepository;
import com.codemind.fieldops.shared.security.JwtClaims;
import com.codemind.fieldops.site.domain.InspectionSite;
import com.codemind.fieldops.site.domain.SiteStatus;
import com.codemind.fieldops.site.repository.InspectionSiteRepository;
import com.codemind.fieldops.template.domain.InspectionTemplate;
import com.codemind.fieldops.template.domain.TemplateStatus;
import com.codemind.fieldops.template.domain.TemplateVersion;
import com.codemind.fieldops.template.domain.TemplateSection;
import com.codemind.fieldops.template.domain.TemplateItem;
import com.codemind.fieldops.template.domain.ResponseType;
import com.codemind.fieldops.template.repository.InspectionTemplateRepository;
import com.codemind.fieldops.template.repository.TemplateVersionRepository;
import com.codemind.fieldops.user.domain.User;
import com.codemind.fieldops.user.domain.UserRole;
import com.codemind.fieldops.user.domain.UserStatus;
import com.codemind.fieldops.user.repository.UserRepository;
import java.time.Instant;
import java.util.List;
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
class InspectionSchedulingControllerIT {

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private InspectionRepository inspectionRepository;

    @Autowired
    private ItemSnapshotRepository itemSnapshotRepository;

    @Autowired
    private InspectionResponseRepository inspectionResponseRepository;

    @Autowired
    private NonConformityRepository nonConformityRepository;

    @Autowired
    private InspectionTemplateRepository templateRepository;

    @Autowired
    private TemplateVersionRepository templateVersionRepository;

    @Autowired
    private InspectionSiteRepository siteRepository;

    @Autowired
    private ClientRepository clientRepository;

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
    private Client testClient;
    private InspectionSite testSite;
    private TemplateVersion activeTemplateVersion;

    @BeforeEach
    void setUp() {
        nonConformityRepository.deleteAll();
        inspectionResponseRepository.deleteAll();
        itemSnapshotRepository.deleteAll();
        inspectionRepository.deleteAll();
        templateVersionRepository.deleteAll();
        templateRepository.deleteAll();
        siteRepository.deleteAll();
        clientRepository.deleteAll();
        userRepository.deleteAll();

        adminUser = userRepository.save(newUser("Admin", "admin.insp@fieldops.local", UserRole.ADMIN));
        technicianUser = userRepository.save(newUser("Technician", "tech.insp@fieldops.local", UserRole.TECHNICIAN));
        adminToken = mintAccessToken(adminUser);
        technicianToken = mintAccessToken(technicianUser);

        testClient = clientRepository.save(Client.builder().name("Insp Client").status(ClientStatus.ACTIVE).build());
        testSite = siteRepository.save(InspectionSite.builder().client(testClient).name("Insp Site").status(SiteStatus.ACTIVE).build());

        // Create a template with an active version
        InspectionTemplate template = templateRepository.save(InspectionTemplate.builder()
            .title("Test Template")
            .description("For tests")
            .category("Testing")
            .status(TemplateStatus.ACTIVE)
            .currentVersion(1)
            .createdBy(adminUser)
            .build());

        TemplateVersion version = TemplateVersion.builder()
            .template(template)
            .versionNumber(1)
            .titleSnapshot("Test Template")
            .descriptionSnapshot("For tests")
            .publishedBy(adminUser)
            .publishedAt(Instant.now())
            .activeForNewInspections(true)
            .build();

        TemplateSection section = TemplateSection.builder()
            .templateVersion(version)
            .title("Section 1")
            .displayOrder(1)
            .build();

        TemplateItem item = TemplateItem.builder()
            .section(section)
            .title("Item 1")
            .responseType(ResponseType.BOOLEAN)
            .required(false)
            .observationRequiredOnFailure(false)
            .evidenceRequiredOnFailure(false)
            .displayOrder(1)
            .build();

        section.setItems(List.of(item));
        version.setSections(List.of(section));
        activeTemplateVersion = templateVersionRepository.save(version);
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

    private String buildCreatePayload(String priority) {
        return """
            {
              "templateVersionId": "%s",
              "clientId": "%s",
              "siteId": "%s",
              "technicianId": "%s",
              "priority": "%s",
              "scheduledFor": "2027-01-15T10:00:00Z"
            }""".formatted(
            activeTemplateVersion.getId(),
            testClient.getId(),
            testSite.getId(),
            technicianUser.getId(),
            priority
        );
    }

    @Test
    void adminCanCreateInspection() {
        String payload = buildCreatePayload("MEDIUM");

        assertThat(mvc.post().uri("/inspections").header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON).content(payload))
            .hasStatus(HttpStatus.CREATED)
            .bodyJson()
            .extractingPath("$.status").asString().isEqualTo("DRAFT");
    }

    @Test
    void technicianCannotCreateInspection() {
        String payload = buildCreatePayload("LOW");

        assertThat(mvc.post().uri("/inspections").header("Authorization", bearer(technicianToken))
            .contentType(MediaType.APPLICATION_JSON).content(payload))
            .hasStatus(HttpStatus.FORBIDDEN);
    }

    @Test
    void createInspectionWithNonExistentTemplateVersionReturnsNotFound() {
        String payload = """
            {
              "templateVersionId": "%s",
              "clientId": "%s",
              "siteId": "%s",
              "technicianId": "%s",
              "priority": "MEDIUM",
              "scheduledFor": "2027-01-15T10:00:00Z"
            }""".formatted(UUID.randomUUID(), testClient.getId(), testSite.getId(), technicianUser.getId());

        assertThat(mvc.post().uri("/inspections").header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON).content(payload))
            .hasStatus(HttpStatus.NOT_FOUND);
    }

    @Test
    void createInspectionWithInactiveTechnicianIsRejected() {
        User inactiveTech = userRepository.save(User.builder()
            .name("Inactive Tech")
            .email("inactive.tech@fieldops.local")
            .passwordHash(passwordEncoder.encode("S3nhaSegura!"))
            .role(UserRole.TECHNICIAN)
            .status(UserStatus.INACTIVE)
            .build());

        String payload = """
            {
              "templateVersionId": "%s",
              "clientId": "%s",
              "siteId": "%s",
              "technicianId": "%s",
              "priority": "HIGH",
              "scheduledFor": "2027-01-15T10:00:00Z"
            }""".formatted(activeTemplateVersion.getId(), testClient.getId(), testSite.getId(), inactiveTech.getId());

        assertThat(mvc.post().uri("/inspections").header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON).content(payload))
            .hasStatus(HttpStatus.UNPROCESSABLE_ENTITY);
    }

    @Test
    void adminCanListInspections() {
        mvc.post().uri("/inspections").header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON).content(buildCreatePayload("LOW")).exchange();

        assertThat(mvc.get().uri("/inspections").header("Authorization", bearer(adminToken)))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.content").asList().isNotEmpty();
    }

    @Test
    void adminCanGetInspectionById() {
        String[] idHolder = {null};
        assertThat(mvc.post().uri("/inspections").header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON).content(buildCreatePayload("MEDIUM")).exchange())
            .hasStatus(HttpStatus.CREATED).bodyJson()
            .extractingPath("$.id").asString().satisfies(s -> idHolder[0] = s);
        String id = idHolder[0];

        assertThat(mvc.get().uri("/inspections/" + id).header("Authorization", bearer(adminToken)))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.id").asString().isEqualTo(id);
    }

    @Test
    void getUnknownInspectionReturnsNotFound() {
        assertThat(mvc.get().uri("/inspections/" + UUID.randomUUID()).header("Authorization", bearer(adminToken)))
            .hasStatus(HttpStatus.NOT_FOUND);
    }

    @Test
    void adminCanAssignInspectionToTechnician() {
        String[] idHolder = {null};
        assertThat(mvc.post().uri("/inspections").header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON).content(buildCreatePayload("MEDIUM")).exchange())
            .hasStatus(HttpStatus.CREATED).bodyJson()
            .extractingPath("$.id").asString().satisfies(s -> idHolder[0] = s);
        String id = idHolder[0];

        User anotherTech = userRepository.save(User.builder()
            .name("Another Tech")
            .email("another.tech@fieldops.local")
            .passwordHash(passwordEncoder.encode("S3nhaSegura!"))
            .role(UserRole.TECHNICIAN)
            .status(UserStatus.ACTIVE)
            .build());

        String assignPayload = """
            {"technicianId":"%s"}""".formatted(anotherTech.getId());

        assertThat(mvc.post().uri("/inspections/" + id + "/assign").header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON).content(assignPayload))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.status").asString().isEqualTo("ASSIGNED");
    }

    @Test
    void adminCanCancelInspection() {
        String[] idHolder = {null};
        assertThat(mvc.post().uri("/inspections").header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON).content(buildCreatePayload("LOW")).exchange())
            .hasStatus(HttpStatus.CREATED).bodyJson()
            .extractingPath("$.id").asString().satisfies(s -> idHolder[0] = s);
        String id = idHolder[0];

        String cancelPayload = """
            {"reason":"Test cancellation"}""";

        assertThat(mvc.post().uri("/inspections/" + id + "/cancel").header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON).content(cancelPayload))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.status").asString().isEqualTo("CANCELED");
    }

    @Test
    void adminCanUpdateInspection() {
        String[] idHolder = {null};
        assertThat(mvc.post().uri("/inspections").header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON).content(buildCreatePayload("LOW")).exchange())
            .hasStatus(HttpStatus.CREATED).bodyJson()
            .extractingPath("$.id").asString().satisfies(s -> idHolder[0] = s);
        String id = idHolder[0];

        String updatePayload = """
            {"title":"Updated Title","priority":"HIGH","scheduledFor":"2027-02-20T14:00:00Z"}""";

        assertThat(mvc.put().uri("/inspections/" + id).header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON).content(updatePayload))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.priority").asString().isEqualTo("HIGH");
    }

    @Test
    void anonymousCannotAccessInspections() {
        assertThat(mvc.get().uri("/inspections"))
            .hasStatus(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void inspectionCreationCreatesSnapshots() {
        String[] idHolder = {null};
        assertThat(mvc.post().uri("/inspections").header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON).content(buildCreatePayload("MEDIUM")).exchange())
            .hasStatus(HttpStatus.CREATED).bodyJson()
            .extractingPath("$.id").asString().satisfies(s -> idHolder[0] = s);
        String id = idHolder[0];

        // Verify snapshots were created
        assertThat(itemSnapshotRepository.findByInspectionIdOrderBySectionOrderAscItemOrderAsc(UUID.fromString(id)))
            .isNotEmpty();
    }

    @Test
    void filterInspectionsByStatus() {
        mvc.post().uri("/inspections").header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON).content(buildCreatePayload("MEDIUM")).exchange();

        assertThat(mvc.get().uri("/inspections?status=DRAFT").header("Authorization", bearer(adminToken)))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.content[*].status").asList().containsOnly("DRAFT");
    }

}
