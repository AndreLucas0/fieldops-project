package com.codemind.fieldops.review.controller;

import static org.assertj.core.api.Assertions.assertThat;

import com.codemind.fieldops.FieldopsApplication;
import com.codemind.fieldops.TestcontainersConfiguration;
import com.codemind.fieldops.client.domain.Client;
import com.codemind.fieldops.client.domain.ClientStatus;
import com.codemind.fieldops.client.repository.ClientRepository;
import com.codemind.fieldops.inspection.domain.Inspection;
import com.codemind.fieldops.inspection.domain.InspectionPriority;
import com.codemind.fieldops.inspection.domain.InspectionStatus;
import com.codemind.fieldops.inspection.repository.InspectionRepository;
import com.codemind.fieldops.inspection.repository.InspectionResponseRepository;
import com.codemind.fieldops.inspection.repository.ItemSnapshotRepository;
import com.codemind.fieldops.nonconformity.repository.NonConformityRepository;
import com.codemind.fieldops.review.repository.InspectionReviewRepository;
import com.codemind.fieldops.shared.audit.AuditEventRepository;
import com.codemind.fieldops.shared.security.JwtClaims;
import com.codemind.fieldops.site.domain.InspectionSite;
import com.codemind.fieldops.site.domain.SiteStatus;
import com.codemind.fieldops.site.repository.InspectionSiteRepository;
import com.codemind.fieldops.template.domain.InspectionTemplate;
import com.codemind.fieldops.template.domain.TemplateStatus;
import com.codemind.fieldops.template.domain.TemplateVersion;
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

/**
 * AC-REVIEW (begin, approve, reject with/without reason), RN-079 to
 * RN-082, RN-084, UC-16, UC-17.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(classes = FieldopsApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("local")
class ReviewControllerIT {

    @Autowired private MockMvcTester mvc;
    @Autowired private InspectionReviewRepository inspectionReviewRepository;
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
    private String supervisorToken;
    private String adminToken;
    private String technicianToken;
    private Client testClient;
    private InspectionSite testSite;
    private TemplateVersion activeTemplateVersion;

    @BeforeEach
    void setUp() {
        inspectionReviewRepository.deleteAll();
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

        User adminUser = userRepository.save(newUser("Admin", "admin.review@fieldops.local", UserRole.ADMIN));
        User supervisorUser =
            userRepository.save(newUser("Supervisor", "supervisor.review@fieldops.local", UserRole.SUPERVISOR));
        technicianUser = userRepository.save(newUser("Technician", "tech.review@fieldops.local", UserRole.TECHNICIAN));
        adminToken = mintAccessToken(adminUser);
        supervisorToken = mintAccessToken(supervisorUser);
        technicianToken = mintAccessToken(technicianUser);

        testClient = clientRepository.save(Client.builder().name("Review Client").status(ClientStatus.ACTIVE).build());
        testSite = siteRepository
            .save(InspectionSite.builder().client(testClient).name("Review Site").status(SiteStatus.ACTIVE).build());

        InspectionTemplate template = templateRepository.save(InspectionTemplate.builder()
            .title("Review Template")
            .description("For review tests")
            .category("Testing")
            .status(TemplateStatus.ACTIVE)
            .currentVersion(1)
            .createdBy(adminUser)
            .build());

        activeTemplateVersion = templateVersionRepository.save(TemplateVersion.builder()
            .template(template)
            .versionNumber(1)
            .titleSnapshot("Review Template")
            .descriptionSnapshot("For review tests")
            .publishedBy(adminUser)
            .publishedAt(Instant.now())
            .activeForNewInspections(true)
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

    private Inspection inspectionWithStatus(InspectionStatus status) {
        return inspectionRepository.save(Inspection.builder()
            .templateVersion(activeTemplateVersion)
            .client(testClient)
            .site(testSite)
            .technician(technicianUser)
            .createdBy(technicianUser)
            .priority(InspectionPriority.MEDIUM)
            .status(status)
            .scheduledFor(Instant.now().plusSeconds(3600))
            .build());
    }

    // ---- begin-review ----

    @Test
    void supervisorCanBeginReviewOnASubmittedInspection() {
        Inspection inspection = inspectionWithStatus(InspectionStatus.SUBMITTED);

        assertThat(mvc.post().uri("/inspections/" + inspection.getId() + "/begin-review")
            .header("Authorization", bearer(supervisorToken)))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.status").asString().isEqualTo("UNDER_REVIEW");
    }

    @Test
    void beginReviewOnANonSubmittedInspectionReturns422() {
        Inspection inspection = inspectionWithStatus(InspectionStatus.IN_PROGRESS);

        assertThat(mvc.post().uri("/inspections/" + inspection.getId() + "/begin-review")
            .header("Authorization", bearer(supervisorToken)))
            .hasStatus(HttpStatus.UNPROCESSABLE_ENTITY);
    }

    @Test
    void adminCannotBeginReviewBecauseReviewIsExclusiveToSupervisors() {
        Inspection inspection = inspectionWithStatus(InspectionStatus.SUBMITTED);

        assertThat(mvc.post().uri("/inspections/" + inspection.getId() + "/begin-review")
            .header("Authorization", bearer(adminToken)))
            .hasStatus(HttpStatus.FORBIDDEN);
    }

    @Test
    void technicianCannotBeginReview() {
        Inspection inspection = inspectionWithStatus(InspectionStatus.SUBMITTED);

        assertThat(mvc.post().uri("/inspections/" + inspection.getId() + "/begin-review")
            .header("Authorization", bearer(technicianToken)))
            .hasStatus(HttpStatus.FORBIDDEN);
    }

    // ---- approve ----

    @Test
    void supervisorCanApproveAnInspectionUnderReview() {
        Inspection inspection = inspectionWithStatus(InspectionStatus.UNDER_REVIEW);

        assertThat(mvc.post().uri("/inspections/" + inspection.getId() + "/approve")
            .header("Authorization", bearer(supervisorToken))
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"comments": "All good"}"""))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.status").asString().isEqualTo("APPROVED");

        Inspection reloaded = inspectionRepository.findById(inspection.getId()).orElseThrow();
        assertThat(reloaded.getApprovedAt()).isNotNull();
    }

    @Test
    void approvingAnInspectionNotUnderReviewReturns422() {
        Inspection inspection = inspectionWithStatus(InspectionStatus.SUBMITTED);

        assertThat(mvc.post().uri("/inspections/" + inspection.getId() + "/approve")
            .header("Authorization", bearer(supervisorToken)))
            .hasStatus(HttpStatus.UNPROCESSABLE_ENTITY);
    }

    // ---- reject ----

    @Test
    void supervisorCanRejectAnInspectionUnderReviewWithAReason() {
        Inspection inspection = inspectionWithStatus(InspectionStatus.UNDER_REVIEW);

        assertThat(mvc.post().uri("/inspections/" + inspection.getId() + "/reject")
            .header("Authorization", bearer(supervisorToken))
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"reason": "Missing required photo"}"""))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.status").asString().isEqualTo("REJECTED");
    }

    @Test
    void rejectingWithoutAReasonReturns400() {
        Inspection inspection = inspectionWithStatus(InspectionStatus.UNDER_REVIEW);

        assertThat(mvc.post().uri("/inspections/" + inspection.getId() + "/reject")
            .header("Authorization", bearer(supervisorToken))
            .contentType(MediaType.APPLICATION_JSON)
            .content("{}"))
            .hasStatus(HttpStatus.BAD_REQUEST);
    }

    @Test
    void rejectingAnInspectionNotUnderReviewReturns422() {
        Inspection inspection = inspectionWithStatus(InspectionStatus.APPROVED);

        assertThat(mvc.post().uri("/inspections/" + inspection.getId() + "/reject")
            .header("Authorization", bearer(supervisorToken))
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"reason": "reason"}"""))
            .hasStatus(HttpStatus.UNPROCESSABLE_ENTITY);
    }

    // ---- reopen after rejection (fluxo-geral.md 7.7) ----

    @Test
    void reopeningARejectedInspectionMovesItBackToInProgress() {
        Inspection inspection = inspectionWithStatus(InspectionStatus.REJECTED);

        assertThat(mvc.post().uri("/inspections/" + inspection.getId() + "/start")
            .header("Authorization", bearer(adminToken)))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.status").asString().isEqualTo("IN_PROGRESS");
    }

    // ---- list reviews (ordered by cycle, RN-083) ----

    @Test
    void reviewsAreListedInCycleOrderAcrossARejectThenApproveCycle() {
        Inspection inspection = inspectionWithStatus(InspectionStatus.UNDER_REVIEW);

        mvc.post().uri("/inspections/" + inspection.getId() + "/reject")
            .header("Authorization", bearer(supervisorToken))
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"reason": "Fix the gauge reading"}""")
            .exchange();

        mvc.post().uri("/inspections/" + inspection.getId() + "/start")
            .header("Authorization", bearer(adminToken)).exchange();
        mvc.post().uri("/inspections/" + inspection.getId() + "/submit")
            .header("Authorization", bearer(adminToken)).exchange();
        mvc.post().uri("/inspections/" + inspection.getId() + "/begin-review")
            .header("Authorization", bearer(supervisorToken)).exchange();
        mvc.post().uri("/inspections/" + inspection.getId() + "/approve")
            .header("Authorization", bearer(supervisorToken))
            .contentType(MediaType.APPLICATION_JSON)
            .content("{}")
            .exchange();

        assertThat(mvc.get().uri("/inspections/" + inspection.getId() + "/reviews")
            .header("Authorization", bearer(supervisorToken)))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$[*].decision").asList().containsExactly("REJECTED", "APPROVED");

        assertThat(mvc.get().uri("/inspections/" + inspection.getId() + "/reviews")
            .header("Authorization", bearer(supervisorToken)))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$[*].reviewCycle").asList().containsExactly(1, 2);
    }

    @Test
    void anonymousCannotAccessReviewEndpoints() {
        Inspection inspection = inspectionWithStatus(InspectionStatus.SUBMITTED);

        assertThat(mvc.post().uri("/inspections/" + inspection.getId() + "/begin-review"))
            .hasStatus(HttpStatus.UNAUTHORIZED);
    }

}
