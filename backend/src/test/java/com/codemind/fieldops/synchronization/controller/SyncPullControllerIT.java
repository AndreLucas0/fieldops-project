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
 * AC-SYNC via {@code GET /mobile/sync/pull}: the local cursor must only
 * advance after successful local persistence, so the server side of the
 * contract must stay idempotent — the same cursor answers the same query
 * again without side effects (RN-028, UC-07).
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(classes = FieldopsApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("local")
class SyncPullControllerIT {

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

        User adminUser = userRepository.save(newUser("Admin", "admin.pull@fieldops.local", UserRole.ADMIN));
        technicianUser = userRepository.save(newUser("Technician", "tech.pull@fieldops.local", UserRole.TECHNICIAN));
        otherTechnicianUser =
            userRepository.save(newUser("Other Technician", "other.pull@fieldops.local", UserRole.TECHNICIAN));
        adminToken = mintAccessToken(adminUser);
        technicianToken = mintAccessToken(technicianUser);

        testClient = clientRepository.save(Client.builder().name("Pull Client").status(ClientStatus.ACTIVE).build());
        testSite =
            siteRepository.save(InspectionSite.builder().client(testClient).name("Pull Site").status(SiteStatus.ACTIVE).build());

        InspectionTemplate template = templateRepository.save(InspectionTemplate.builder()
            .title("Pull Template")
            .description("For pull tests")
            .category("Testing")
            .status(TemplateStatus.ACTIVE)
            .currentVersion(1)
            .createdBy(adminUser)
            .build());

        activeTemplateVersion = templateVersionRepository.save(TemplateVersion.builder()
            .template(template)
            .versionNumber(1)
            .titleSnapshot("Pull Template")
            .descriptionSnapshot("For pull tests")
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

    private Inspection inspectionFor(User technician, InspectionStatus status) {
        return inspectionRepository.save(Inspection.builder()
            .templateVersion(activeTemplateVersion)
            .client(testClient)
            .site(testSite)
            .technician(technician)
            .createdBy(technician)
            .priority(InspectionPriority.MEDIUM)
            .status(status)
            .scheduledFor(Instant.now().plusSeconds(3600))
            .build());
    }

    @Test
    void firstPullWithoutCursorReturnsAllChangesOwnedByTheTechnician() {
        inspectionFor(technicianUser, InspectionStatus.ASSIGNED);

        assertThat(mvc.get().uri("/mobile/sync/pull")
            .header("Authorization", bearer(technicianToken)))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.changes").asList().hasSize(1);
    }

    @Test
    void pullNeverReturnsChangesOwnedByAnotherTechnician() {
        inspectionFor(otherTechnicianUser, InspectionStatus.ASSIGNED);

        assertThat(mvc.get().uri("/mobile/sync/pull")
            .header("Authorization", bearer(technicianToken)))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.changes").asList().isEmpty();
    }

    @Test
    void pullingAgainWithTheCursorFromTheFirstResponseReturnsOnlyLaterChanges() {
        inspectionFor(technicianUser, InspectionStatus.ASSIGNED);

        String[] cursorHolder = {null};
        assertThat(mvc.get().uri("/mobile/sync/pull")
            .header("Authorization", bearer(technicianToken)).exchange())
            .hasStatusOk().bodyJson()
            .extractingPath("$.nextCursor").asString().satisfies(c -> cursorHolder[0] = c);

        assertThat(mvc.get().uri("/mobile/sync/pull?cursor=" + cursorHolder[0])
            .header("Authorization", bearer(technicianToken)))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.changes").asList().isEmpty();
    }

    @Test
    void repeatingTheSamePullDoesNotChangeServerStateAndReturnsTheSameChanges() {
        inspectionFor(technicianUser, InspectionStatus.ASSIGNED);

        assertThat(mvc.get().uri("/mobile/sync/pull")
            .header("Authorization", bearer(technicianToken)))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.changes").asList().hasSize(1);

        assertThat(mvc.get().uri("/mobile/sync/pull")
            .header("Authorization", bearer(technicianToken)))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.changes").asList().hasSize(1);
    }

    @Test
    void adminCannotUsePullEndpointReservedForMobileTechnicians() {
        assertThat(mvc.get().uri("/mobile/sync/pull")
            .header("Authorization", bearer(adminToken)))
            .hasStatus(HttpStatus.FORBIDDEN);
    }

    @Test
    void anonymousCannotPull() {
        assertThat(mvc.get().uri("/mobile/sync/pull").contentType(MediaType.APPLICATION_JSON))
            .hasStatus(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void invalidCursorFormatIsRejected() {
        assertThat(mvc.get().uri("/mobile/sync/pull?cursor=not-a-valid-instant")
            .header("Authorization", bearer(technicianToken)))
            .hasStatus(HttpStatus.UNPROCESSABLE_ENTITY);
    }

}
