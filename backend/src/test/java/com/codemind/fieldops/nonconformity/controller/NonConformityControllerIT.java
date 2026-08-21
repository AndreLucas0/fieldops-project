package com.codemind.fieldops.nonconformity.controller;

import static org.assertj.core.api.Assertions.assertThat;

import com.codemind.fieldops.FieldopsApplication;
import com.codemind.fieldops.TestcontainersConfiguration;
import com.codemind.fieldops.client.domain.Client;
import com.codemind.fieldops.client.domain.ClientStatus;
import com.codemind.fieldops.client.repository.ClientRepository;
import com.codemind.fieldops.inspection.domain.Inspection;
import com.codemind.fieldops.inspection.domain.InspectionPriority;
import com.codemind.fieldops.inspection.domain.InspectionStatus;
import com.codemind.fieldops.inspection.domain.ItemSnapshot;
import com.codemind.fieldops.inspection.repository.InspectionRepository;
import com.codemind.fieldops.inspection.repository.InspectionResponseRepository;
import com.codemind.fieldops.inspection.repository.ItemSnapshotRepository;
import com.codemind.fieldops.nonconformity.repository.NonConformityRepository;
import com.codemind.fieldops.shared.security.JwtClaims;
import com.codemind.fieldops.site.domain.InspectionSite;
import com.codemind.fieldops.site.domain.SiteStatus;
import com.codemind.fieldops.site.repository.InspectionSiteRepository;
import com.codemind.fieldops.template.domain.InspectionTemplate;
import com.codemind.fieldops.template.domain.ResponseType;
import com.codemind.fieldops.template.domain.TemplateItem;
import com.codemind.fieldops.template.domain.TemplateSection;
import com.codemind.fieldops.template.domain.TemplateStatus;
import com.codemind.fieldops.template.domain.TemplateVersion;
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
class NonConformityControllerIT {

    @Autowired private MockMvcTester mvc;
    @Autowired private NonConformityRepository nonConformityRepository;
    @Autowired private InspectionRepository inspectionRepository;
    @Autowired private InspectionResponseRepository inspectionResponseRepository;
    @Autowired private ItemSnapshotRepository itemSnapshotRepository;
    @Autowired private InspectionTemplateRepository templateRepository;
    @Autowired private TemplateVersionRepository templateVersionRepository;
    @Autowired private InspectionSiteRepository siteRepository;
    @Autowired private ClientRepository clientRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtEncoder jwtEncoder;

    private User adminUser;
    private User supervisorUser;
    private User technicianUser;
    private String adminToken;
    private String supervisorToken;
    private String technicianToken;
    private Client testClient;
    private InspectionSite testSite;
    private TemplateVersion activeTemplateVersion;
    private Inspection inProgressInspection;
    private ItemSnapshot testSnapshot;

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

        adminUser = userRepository.save(newUser("Admin", "admin.nc@fieldops.local", UserRole.ADMIN));
        supervisorUser = userRepository.save(newUser("Supervisor", "supervisor.nc@fieldops.local", UserRole.SUPERVISOR));
        technicianUser = userRepository.save(newUser("Technician", "tech.nc@fieldops.local", UserRole.TECHNICIAN));
        adminToken = mintAccessToken(adminUser);
        supervisorToken = mintAccessToken(supervisorUser);
        technicianToken = mintAccessToken(technicianUser);

        testClient = clientRepository.save(Client.builder().name("NC Client").status(ClientStatus.ACTIVE).build());
        testSite = siteRepository.save(InspectionSite.builder().client(testClient).name("NC Site").status(SiteStatus.ACTIVE).build());

        InspectionTemplate template = templateRepository.save(InspectionTemplate.builder()
            .title("NC Template")
            .description("For NC tests")
            .category("Testing")
            .status(TemplateStatus.ACTIVE)
            .currentVersion(1)
            .createdBy(adminUser)
            .build());

        TemplateVersion version = TemplateVersion.builder()
            .template(template)
            .versionNumber(1)
            .titleSnapshot("NC Template")
            .descriptionSnapshot("For NC tests")
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

        inProgressInspection = inspectionRepository.save(Inspection.builder()
            .templateVersion(activeTemplateVersion)
            .client(testClient)
            .site(testSite)
            .technician(technicianUser)
            .createdBy(adminUser)
            .priority(InspectionPriority.MEDIUM)
            .status(InspectionStatus.IN_PROGRESS)
            .scheduledFor(Instant.now().plusSeconds(3600))
            .startedAtServer(Instant.now())
            .build());

        testSnapshot = itemSnapshotRepository.save(ItemSnapshot.builder()
            .inspection(inProgressInspection)
            .sectionTitle("Section 1")
            .sectionOrder(1)
            .itemTitle("Item 1")
            .responseType("BOOLEAN")
            .required(false)
            .itemOrder(1)
            .build());
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

    private String buildCreatePayload(String title, String severity) {
        return """
            {
              "title": "%s",
              "description": "Test description",
              "severity": "%s"
            }""".formatted(title, severity);
    }

    private String buildCreatePayloadWithSnapshot(String title, String severity) {
        return """
            {
              "title": "%s",
              "description": "Test description",
              "severity": "%s",
              "snapshotId": "%s"
            }""".formatted(title, severity, testSnapshot.getId());
    }

    // ---- POST non-conformity ----

    @Test
    void technicianCanCreateNonConformity() {
        String payload = buildCreatePayload("NC Title", "HIGH");

        assertThat(mvc.post().uri("/inspections/" + inProgressInspection.getId() + "/non-conformities")
            .header("Authorization", bearer(technicianToken))
            .contentType(MediaType.APPLICATION_JSON)
            .content(payload))
            .hasStatus(HttpStatus.CREATED)
            .bodyJson()
            .extractingPath("$.status").asString().isEqualTo("OPEN");
    }

    @Test
    void adminCanCreateNonConformity() {
        String payload = buildCreatePayload("NC Title Admin", "CRITICAL");

        assertThat(mvc.post().uri("/inspections/" + inProgressInspection.getId() + "/non-conformities")
            .header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON)
            .content(payload))
            .hasStatus(HttpStatus.CREATED);
    }

    @Test
    void supervisorCanCreateNonConformity() {
        String payload = buildCreatePayload("NC Title Supervisor", "LOW");

        assertThat(mvc.post().uri("/inspections/" + inProgressInspection.getId() + "/non-conformities")
            .header("Authorization", bearer(supervisorToken))
            .contentType(MediaType.APPLICATION_JSON)
            .content(payload))
            .hasStatus(HttpStatus.CREATED);
    }

    @Test
    void createNonConformityWithSnapshotReference() {
        String payload = buildCreatePayloadWithSnapshot("NC with snapshot", "MEDIUM");

        assertThat(mvc.post().uri("/inspections/" + inProgressInspection.getId() + "/non-conformities")
            .header("Authorization", bearer(technicianToken))
            .contentType(MediaType.APPLICATION_JSON)
            .content(payload))
            .hasStatus(HttpStatus.CREATED)
            .bodyJson()
            .extractingPath("$.snapshotId").asString().isEqualTo(testSnapshot.getId().toString());
    }

    @Test
    void createNonConformityForNonExistentInspectionReturns404() {
        String payload = buildCreatePayload("NC Title", "HIGH");

        assertThat(mvc.post().uri("/inspections/" + UUID.randomUUID() + "/non-conformities")
            .header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON)
            .content(payload))
            .hasStatus(HttpStatus.NOT_FOUND);
    }

    @Test
    void createNonConformityWithInvalidSnapshotReturns404() {
        String payload = """
            {
              "title": "NC Title",
              "severity": "HIGH",
              "snapshotId": "%s"
            }""".formatted(UUID.randomUUID());

        assertThat(mvc.post().uri("/inspections/" + inProgressInspection.getId() + "/non-conformities")
            .header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON)
            .content(payload))
            .hasStatus(HttpStatus.NOT_FOUND);
    }

    @Test
    void anonymousCannotCreateNonConformity() {
        String payload = buildCreatePayload("NC Title", "HIGH");

        assertThat(mvc.post().uri("/inspections/" + inProgressInspection.getId() + "/non-conformities")
            .contentType(MediaType.APPLICATION_JSON)
            .content(payload))
            .hasStatus(HttpStatus.UNAUTHORIZED);
    }

    // ---- GET non-conformities ----

    @Test
    void adminCanListNonConformities() {
        // Create one first
        mvc.post().uri("/inspections/" + inProgressInspection.getId() + "/non-conformities")
            .header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON)
            .content(buildCreatePayload("NC for list", "MEDIUM"))
            .exchange();

        assertThat(mvc.get().uri("/inspections/" + inProgressInspection.getId() + "/non-conformities")
            .header("Authorization", bearer(adminToken)))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$").asList().isNotEmpty();
    }

    @Test
    void technicianCanListNonConformities() {
        assertThat(mvc.get().uri("/inspections/" + inProgressInspection.getId() + "/non-conformities")
            .header("Authorization", bearer(technicianToken)))
            .hasStatusOk();
    }

    // ---- GET single non-conformity ----

    @Test
    void adminCanGetNonConformityById() {
        String[] idHolder = {null};
        assertThat(mvc.post().uri("/inspections/" + inProgressInspection.getId() + "/non-conformities")
            .header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON)
            .content(buildCreatePayload("NC to get", "LOW")).exchange())
            .hasStatus(HttpStatus.CREATED).bodyJson()
            .extractingPath("$.id").asString().satisfies(s -> idHolder[0] = s);
        String id = idHolder[0];

        assertThat(mvc.get().uri("/non-conformities/" + id)
            .header("Authorization", bearer(adminToken)))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.id").asString().isEqualTo(id);
    }

    @Test
    void getNonExistentNonConformityReturns404() {
        assertThat(mvc.get().uri("/non-conformities/" + UUID.randomUUID())
            .header("Authorization", bearer(adminToken)))
            .hasStatus(HttpStatus.NOT_FOUND);
    }

    // ---- PATCH status ----

    @Test
    void adminCanUpdateNonConformityStatus() {
        String[] idHolder = {null};
        assertThat(mvc.post().uri("/inspections/" + inProgressInspection.getId() + "/non-conformities")
            .header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON)
            .content(buildCreatePayload("NC to update status", "HIGH")).exchange())
            .hasStatus(HttpStatus.CREATED).bodyJson()
            .extractingPath("$.id").asString().satisfies(s -> idHolder[0] = s);
        String id = idHolder[0];

        String updatePayload = """
            {"status": "IN_PROGRESS"}""";

        assertThat(mvc.patch().uri("/non-conformities/" + id + "/status")
            .header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON)
            .content(updatePayload))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.status").asString().isEqualTo("IN_PROGRESS");
    }

    @Test
    void supervisorCanUpdateNonConformityStatus() {
        String[] idHolder = {null};
        assertThat(mvc.post().uri("/inspections/" + inProgressInspection.getId() + "/non-conformities")
            .header("Authorization", bearer(supervisorToken))
            .contentType(MediaType.APPLICATION_JSON)
            .content(buildCreatePayload("NC supervisor status", "LOW")).exchange())
            .hasStatus(HttpStatus.CREATED).bodyJson()
            .extractingPath("$.id").asString().satisfies(s -> idHolder[0] = s);
        String id = idHolder[0];

        String updatePayload = """
            {"status": "RESOLVED"}""";

        assertThat(mvc.patch().uri("/non-conformities/" + id + "/status")
            .header("Authorization", bearer(supervisorToken))
            .contentType(MediaType.APPLICATION_JSON)
            .content(updatePayload))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.status").asString().isEqualTo("RESOLVED");
    }

    @Test
    void updateStatusOfNonExistentNonConformityReturns404() {
        String updatePayload = """
            {"status": "RESOLVED"}""";

        assertThat(mvc.patch().uri("/non-conformities/" + UUID.randomUUID() + "/status")
            .header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON)
            .content(updatePayload))
            .hasStatus(HttpStatus.NOT_FOUND);
    }
}
