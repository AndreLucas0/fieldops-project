package com.codemind.fieldops.synchronization.controller;

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
import com.codemind.fieldops.shared.audit.AuditEventRepository;
import com.codemind.fieldops.shared.security.JwtClaims;
import com.codemind.fieldops.site.domain.InspectionSite;
import com.codemind.fieldops.site.domain.SiteStatus;
import com.codemind.fieldops.site.repository.InspectionSiteRepository;
import com.codemind.fieldops.synchronization.repository.SyncOperationRepository;
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

/**
 * AC-SYNC via {@code POST /mobile/sync/push}: successful send, idempotent
 * resend, partial-batch failure and version conflict (RN-067, RN-068,
 * RN-069, RN-070, RN-073, RN-075, RN-076, RN-078, UC-14).
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(classes = FieldopsApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("local")
class SyncPushControllerIT {

    @Autowired private MockMvcTester mvc;
    @Autowired private SyncOperationRepository syncOperationRepository;
    @Autowired private AuditEventRepository auditEventRepository;
    @Autowired private NonConformityRepository nonConformityRepository;
    @Autowired private InspectionResponseRepository inspectionResponseRepository;
    @Autowired private ItemSnapshotRepository itemSnapshotRepository;
    @Autowired private InspectionRepository inspectionRepository;
    @Autowired private InspectionTemplateRepository templateRepository;
    @Autowired private TemplateVersionRepository templateVersionRepository;
    @Autowired private InspectionSiteRepository siteRepository;
    @Autowired private ClientRepository clientRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtEncoder jwtEncoder;

    private User technicianUser;
    private User otherTechnicianUser;
    private String technicianToken;
    private String adminToken;
    private Client testClient;
    private InspectionSite testSite;
    private TemplateVersion activeTemplateVersion;
    private Inspection draftInspection;
    private ItemSnapshot requiredSnapshot;

    @BeforeEach
    void setUp() {
        syncOperationRepository.deleteAll();
        auditEventRepository.deleteAll();
        nonConformityRepository.deleteAll();
        inspectionResponseRepository.deleteAll();
        itemSnapshotRepository.deleteAll();
        inspectionRepository.deleteAll();
        templateVersionRepository.deleteAll();
        templateRepository.deleteAll();
        siteRepository.deleteAll();
        clientRepository.deleteAll();
        userRepository.deleteAll();

        User adminUser = userRepository.save(newUser("Admin", "admin.sync@fieldops.local", UserRole.ADMIN));
        technicianUser = userRepository.save(newUser("Technician", "tech.sync@fieldops.local", UserRole.TECHNICIAN));
        otherTechnicianUser =
            userRepository.save(newUser("Other Technician", "other.sync@fieldops.local", UserRole.TECHNICIAN));
        adminToken = mintAccessToken(adminUser);
        technicianToken = mintAccessToken(technicianUser);

        testClient = clientRepository.save(Client.builder().name("Sync Client").status(ClientStatus.ACTIVE).build());
        testSite =
            siteRepository.save(InspectionSite.builder().client(testClient).name("Sync Site").status(SiteStatus.ACTIVE).build());

        InspectionTemplate template = templateRepository.save(InspectionTemplate.builder()
            .title("Sync Template")
            .description("For sync tests")
            .category("Testing")
            .status(TemplateStatus.ACTIVE)
            .currentVersion(1)
            .createdBy(adminUser)
            .build());

        TemplateVersion version = TemplateVersion.builder()
            .template(template)
            .versionNumber(1)
            .titleSnapshot("Sync Template")
            .descriptionSnapshot("For sync tests")
            .publishedBy(adminUser)
            .publishedAt(Instant.now())
            .activeForNewInspections(true)
            .build();

        TemplateSection section =
            TemplateSection.builder().templateVersion(version).title("Section 1").displayOrder(1).build();

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

        draftInspection = inspectionRepository.save(Inspection.builder()
            .templateVersion(activeTemplateVersion)
            .client(testClient)
            .site(testSite)
            .technician(technicianUser)
            .createdBy(adminUser)
            .priority(InspectionPriority.MEDIUM)
            .status(InspectionStatus.DRAFT)
            .scheduledFor(Instant.now().plusSeconds(3600))
            .build());

        requiredSnapshot = itemSnapshotRepository.save(ItemSnapshot.builder()
            .inspection(draftInspection)
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

    private String pushPayload(String operationId, String entityType, String entityId, String operationType,
            String baseVersion, String payloadJson) {
        return """
            {
              "deviceId": "%s",
              "operations": [
                {
                  "operationId": "%s",
                  "entityType": "%s",
                  "entityId": "%s",
                  "operationType": "%s",
                  "baseVersion": %s,
                  "payload": %s
                }
              ]
            }""".formatted(UUID.randomUUID(), operationId, entityType, entityId, operationType, baseVersion,
            payloadJson);
    }

    // ---- Successful push (RN-069, RN-073) ----

    @Test
    void startTransitionSentThroughPushIsAppliedAndInspectionMovesToInProgress() {
        String operationId = UUID.randomUUID().toString();
        String payload = pushPayload(operationId, "INSPECTION", draftInspection.getId().toString(), "UPSERT", "null",
            """
            {"status": "IN_PROGRESS", "startedAtDevice": "2026-08-26T10:00:00Z"}""");

        assertThat(mvc.post().uri("/mobile/sync/push")
            .header("Authorization", bearer(technicianToken))
            .contentType(MediaType.APPLICATION_JSON)
            .content(payload))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.results[0].status").asString().isEqualTo("APPLIED");

        Inspection reloaded = inspectionRepository.findById(draftInspection.getId()).orElseThrow();
        assertThat(reloaded.getStatus()).isEqualTo(InspectionStatus.IN_PROGRESS);
    }

    // ---- Idempotent resend (RN-067, RN-068) ----

    @Test
    void resendingTheSameOperationIdReturnsAlreadyAppliedAndDoesNotReapply() {
        String operationId = UUID.randomUUID().toString();
        String payload = pushPayload(operationId, "INSPECTION", draftInspection.getId().toString(), "UPSERT", "null",
            """
            {"status": "IN_PROGRESS", "startedAtDevice": "2026-08-26T10:00:00Z"}""");

        mvc.post().uri("/mobile/sync/push")
            .header("Authorization", bearer(technicianToken))
            .contentType(MediaType.APPLICATION_JSON)
            .content(payload)
            .exchange();

        assertThat(mvc.post().uri("/mobile/sync/push")
            .header("Authorization", bearer(technicianToken))
            .contentType(MediaType.APPLICATION_JSON)
            .content(payload))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.results[0].status").asString().isEqualTo("ALREADY_APPLIED");

        assertThat(syncOperationRepository.count()).isEqualTo(1);
    }

    // ---- Partial batch failure (RN-070) ----

    @Test
    void oneOperationRejectedInABatchDoesNotRollBackOthersAlreadyApplied() {
        String firstOperationId = UUID.randomUUID().toString();
        String secondOperationId = UUID.randomUUID().toString();
        String batchPayload = """
            {
              "deviceId": "%s",
              "operations": [
                {
                  "operationId": "%s",
                  "entityType": "INSPECTION",
                  "entityId": "%s",
                  "operationType": "UPSERT",
                  "payload": {"status": "IN_PROGRESS", "startedAtDevice": "2026-08-26T10:00:00Z"}
                },
                {
                  "operationId": "%s",
                  "entityType": "INSPECTION",
                  "entityId": "%s",
                  "operationType": "DELETE",
                  "payload": {}
                }
              ]
            }""".formatted(UUID.randomUUID(), firstOperationId, draftInspection.getId(), secondOperationId,
            draftInspection.getId());

        assertThat(mvc.post().uri("/mobile/sync/push")
            .header("Authorization", bearer(technicianToken))
            .contentType(MediaType.APPLICATION_JSON)
            .content(batchPayload))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.results[0].status").asString().isEqualTo("APPLIED");

        Inspection reloaded = inspectionRepository.findById(draftInspection.getId()).orElseThrow();
        assertThat(reloaded.getStatus()).isEqualTo(InspectionStatus.IN_PROGRESS);
    }

    // ---- Version conflict (RN-075, RN-076) ----

    @Test
    void staleBaseVersionOnInspectionResponseIsReportedAsConflict() {
        String firstOperationId = UUID.randomUUID().toString();
        String upsertPayload = pushPayload(firstOperationId, "INSPECTION_RESPONSE", requiredSnapshot.getId().toString(),
            "UPSERT", "null",
            """
            {"inspectionId": "%s", "valueBoolean": true}""".formatted(draftInspection.getId()));

        mvc.post().uri("/mobile/sync/push")
            .header("Authorization", bearer(technicianToken))
            .contentType(MediaType.APPLICATION_JSON)
            .content(upsertPayload)
            .exchange();

        String conflictingOperationId = UUID.randomUUID().toString();
        String conflictingPayload = pushPayload(conflictingOperationId, "INSPECTION_RESPONSE",
            requiredSnapshot.getId().toString(), "UPSERT", "99",
            """
            {"inspectionId": "%s", "valueBoolean": false}""".formatted(draftInspection.getId()));

        assertThat(mvc.post().uri("/mobile/sync/push")
            .header("Authorization", bearer(technicianToken))
            .contentType(MediaType.APPLICATION_JSON)
            .content(conflictingPayload))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.results[0].status").asString().isEqualTo("CONFLICT");
    }

    // ---- Ownership / evidence-not-supported (RN-078) ----

    @Test
    void technicianCannotPushOperationsForAnInspectionTheyDoNotOwn() {
        String operationId = UUID.randomUUID().toString();
        String payload = pushPayload(operationId, "INSPECTION", draftInspection.getId().toString(), "UPSERT", "null",
            """
            {"status": "IN_PROGRESS"}""");

        assertThat(mvc.post().uri("/mobile/sync/push")
            .header("Authorization", bearer(mintAccessToken(otherTechnicianUser)))
            .contentType(MediaType.APPLICATION_JSON)
            .content(payload))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.results[0].status").asString().isEqualTo("REJECTED");
    }

    @Test
    void evidenceEntityTypeIsRejectedBecauseItMustTravelThroughTheUploadEndpoint() {
        String operationId = UUID.randomUUID().toString();
        String payload = pushPayload(operationId, "EVIDENCE", UUID.randomUUID().toString(), "UPSERT", "null", "{}");

        assertThat(mvc.post().uri("/mobile/sync/push")
            .header("Authorization", bearer(technicianToken))
            .contentType(MediaType.APPLICATION_JSON)
            .content(payload))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.results[0].status").asString().isEqualTo("REJECTED");
    }

    @Test
    void adminCannotUsePushEndpointReservedForMobileTechnicians() {
        String operationId = UUID.randomUUID().toString();
        String payload = pushPayload(operationId, "INSPECTION", draftInspection.getId().toString(), "UPSERT", "null",
            """
            {"status": "IN_PROGRESS"}""");

        assertThat(mvc.post().uri("/mobile/sync/push")
            .header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON)
            .content(payload))
            .hasStatus(HttpStatus.FORBIDDEN);
    }

    @Test
    void anonymousCannotPush() {
        String operationId = UUID.randomUUID().toString();
        String payload = pushPayload(operationId, "INSPECTION", draftInspection.getId().toString(), "UPSERT", "null",
            """
            {"status": "IN_PROGRESS"}""");

        assertThat(mvc.post().uri("/mobile/sync/push")
            .contentType(MediaType.APPLICATION_JSON)
            .content(payload))
            .hasStatus(HttpStatus.UNAUTHORIZED);
    }

}
