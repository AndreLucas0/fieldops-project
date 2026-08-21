package com.codemind.fieldops.inspection.controller;

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
class InspectionExecutionControllerIT {

    @Autowired private MockMvcTester mvc;
    @Autowired private InspectionRepository inspectionRepository;
    @Autowired private ItemSnapshotRepository itemSnapshotRepository;
    @Autowired private InspectionResponseRepository inspectionResponseRepository;
    @Autowired private NonConformityRepository nonConformityRepository;
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

        adminUser = userRepository.save(newUser("Admin", "admin.exec@fieldops.local", UserRole.ADMIN));
        supervisorUser = userRepository.save(newUser("Supervisor", "supervisor.exec@fieldops.local", UserRole.SUPERVISOR));
        technicianUser = userRepository.save(newUser("Technician", "tech.exec@fieldops.local", UserRole.TECHNICIAN));
        adminToken = mintAccessToken(adminUser);
        supervisorToken = mintAccessToken(supervisorUser);
        technicianToken = mintAccessToken(technicianUser);

        testClient = clientRepository.save(Client.builder().name("Exec Client").status(ClientStatus.ACTIVE).build());
        testSite = siteRepository.save(InspectionSite.builder().client(testClient).name("Exec Site").status(SiteStatus.ACTIVE).build());

        InspectionTemplate template = templateRepository.save(InspectionTemplate.builder()
            .title("Exec Template")
            .description("For exec tests")
            .category("Testing")
            .status(TemplateStatus.ACTIVE)
            .currentVersion(1)
            .createdBy(adminUser)
            .build());

        TemplateVersion version = TemplateVersion.builder()
            .template(template)
            .versionNumber(1)
            .titleSnapshot("Exec Template")
            .descriptionSnapshot("For exec tests")
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
            .title("Required Item")
            .responseType(ResponseType.BOOLEAN)
            .required(true)
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

    private Inspection createDraftInspection() {
        Inspection inspection = Inspection.builder()
            .templateVersion(activeTemplateVersion)
            .client(testClient)
            .site(testSite)
            .technician(technicianUser)
            .createdBy(adminUser)
            .priority(InspectionPriority.MEDIUM)
            .status(InspectionStatus.DRAFT)
            .scheduledFor(Instant.now().plusSeconds(3600))
            .build();
        return inspectionRepository.save(inspection);
    }

    private Inspection createAssignedInspection() {
        Inspection inspection = createDraftInspection();
        inspection.setStatus(InspectionStatus.ASSIGNED);
        return inspectionRepository.save(inspection);
    }

    private Inspection createInProgressInspection() {
        Inspection inspection = createDraftInspection();
        inspection.setStatus(InspectionStatus.IN_PROGRESS);
        inspection.setStartedAtServer(Instant.now());
        return inspectionRepository.save(inspection);
    }

    // ---- START tests ----

    @Test
    void adminCanStartDraftInspection() {
        Inspection inspection = createDraftInspection();

        assertThat(mvc.post().uri("/inspections/" + inspection.getId() + "/start")
            .header("Authorization", bearer(adminToken)))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.status").asString().isEqualTo("IN_PROGRESS");
    }

    @Test
    void supervisorCanStartAssignedInspection() {
        Inspection inspection = createAssignedInspection();

        assertThat(mvc.post().uri("/inspections/" + inspection.getId() + "/start")
            .header("Authorization", bearer(supervisorToken)))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.status").asString().isEqualTo("IN_PROGRESS");
    }

    @Test
    void startNonExistentInspectionReturns404() {
        assertThat(mvc.post().uri("/inspections/" + UUID.randomUUID() + "/start")
            .header("Authorization", bearer(adminToken)))
            .hasStatus(HttpStatus.NOT_FOUND);
    }

    @Test
    void startAlreadyInProgressInspectionReturns422() {
        Inspection inspection = createInProgressInspection();

        assertThat(mvc.post().uri("/inspections/" + inspection.getId() + "/start")
            .header("Authorization", bearer(adminToken)))
            .hasStatus(HttpStatus.UNPROCESSABLE_ENTITY);
    }

    @Test
    void technicianCannotStartInspection() {
        Inspection inspection = createDraftInspection();

        assertThat(mvc.post().uri("/inspections/" + inspection.getId() + "/start")
            .header("Authorization", bearer(technicianToken)))
            .hasStatus(HttpStatus.FORBIDDEN);
    }

    // ---- SUBMIT tests ----

    @Test
    void adminCanSubmitInProgressInspectionWithAllRequiredAnswered() {
        Inspection inspection = createInProgressInspection();

        // Create a snapshot for the inspection and a response for it
        List<ItemSnapshot> snapshots = itemSnapshotRepository
            .findByInspectionIdOrderBySectionOrderAscItemOrderAsc(inspection.getId());

        // If no snapshots exist, create one manually
        if (snapshots.isEmpty()) {
            // Manually insert snapshot for test
            ItemSnapshot snapshot = ItemSnapshot.builder()
                .inspection(inspection)
                .sectionTitle("Section 1")
                .sectionOrder(1)
                .itemTitle("Required Item")
                .responseType("BOOLEAN")
                .required(true)
                .itemOrder(1)
                .build();
            itemSnapshotRepository.save(snapshot);
            snapshots = itemSnapshotRepository.findByInspectionIdOrderBySectionOrderAscItemOrderAsc(inspection.getId());
        }

        // Submit a response for the required snapshot via API
        String snapshotId = snapshots.get(0).getId().toString();
        String responsePayload = """
            {"valueBoolean": true}""";

        mvc.put().uri("/inspections/" + inspection.getId() + "/responses/" + snapshotId)
            .header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON)
            .content(responsePayload)
            .exchange();

        assertThat(mvc.post().uri("/inspections/" + inspection.getId() + "/submit")
            .header("Authorization", bearer(adminToken)))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.status").asString().isEqualTo("SUBMITTED");
    }

    @Test
    void submitInspectionWithMissingRequiredResponseReturns422() {
        Inspection inspection = createInProgressInspection();

        // Create a required snapshot without any response
        ItemSnapshot snapshot = ItemSnapshot.builder()
            .inspection(inspection)
            .sectionTitle("Section 1")
            .sectionOrder(1)
            .itemTitle("Required Item")
            .responseType("BOOLEAN")
            .required(true)
            .itemOrder(1)
            .build();
        itemSnapshotRepository.save(snapshot);

        assertThat(mvc.post().uri("/inspections/" + inspection.getId() + "/submit")
            .header("Authorization", bearer(adminToken)))
            .hasStatus(HttpStatus.UNPROCESSABLE_ENTITY);
    }

    @Test
    void submitNonInProgressInspectionReturns422() {
        Inspection inspection = createDraftInspection();

        assertThat(mvc.post().uri("/inspections/" + inspection.getId() + "/submit")
            .header("Authorization", bearer(adminToken)))
            .hasStatus(HttpStatus.UNPROCESSABLE_ENTITY);
    }

    @Test
    void assignedTechnicianCanSubmitInspection() {
        Inspection inspection = createInProgressInspection();
        // No required snapshots, so submit should work
        // Make sure there are no required snapshots
        itemSnapshotRepository.deleteAll(
            itemSnapshotRepository.findByInspectionIdOrderBySectionOrderAscItemOrderAsc(inspection.getId()));

        assertThat(mvc.post().uri("/inspections/" + inspection.getId() + "/submit")
            .header("Authorization", bearer(technicianToken)))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.status").asString().isEqualTo("SUBMITTED");
    }
}
