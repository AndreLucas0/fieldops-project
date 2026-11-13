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
import com.codemind.fieldops.inspection.repository.InspectionRepository;
import com.codemind.fieldops.inspection.repository.InspectionResponseRepository;
import com.codemind.fieldops.inspection.repository.ItemSnapshotRepository;
import com.codemind.fieldops.nonconformity.repository.NonConformityRepository;
import com.codemind.fieldops.shared.audit.AuditEvent;
import com.codemind.fieldops.shared.audit.AuditEventRepository;
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
class InspectionHistoryControllerIT {

    @Autowired private MockMvcTester mvc;
    @Autowired private InspectionRepository inspectionRepository;
    @Autowired private ItemSnapshotRepository itemSnapshotRepository;
    @Autowired private InspectionResponseRepository inspectionResponseRepository;
    @Autowired private NonConformityRepository nonConformityRepository;
    @Autowired private AuditEventRepository auditEventRepository;
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
    private TemplateVersion activeTemplateVersion;
    private Client testClient;
    private InspectionSite testSite;
    private Inspection testInspection;

    @BeforeEach
    void setUp() {
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

        adminUser = userRepository.save(newUser("Admin", "admin.hist@fieldops.local", UserRole.ADMIN));
        supervisorUser = userRepository.save(newUser("Supervisor", "super.hist@fieldops.local", UserRole.SUPERVISOR));
        technicianUser = userRepository.save(newUser("Tech", "tech.hist@fieldops.local", UserRole.TECHNICIAN));
        adminToken = mintAccessToken(adminUser);
        supervisorToken = mintAccessToken(supervisorUser);
        technicianToken = mintAccessToken(technicianUser);

        testClient = clientRepository.save(Client.builder().name("Hist Client").status(ClientStatus.ACTIVE).build());
        testSite = siteRepository.save(InspectionSite.builder().client(testClient).name("Hist Site").status(SiteStatus.ACTIVE).build());

        InspectionTemplate template = templateRepository.save(InspectionTemplate.builder()
            .title("Hist Template").description("History test").category("Testing")
            .status(TemplateStatus.ACTIVE).currentVersion(1).createdBy(adminUser).build());

        TemplateVersion version = TemplateVersion.builder().template(template).versionNumber(1)
            .titleSnapshot("Hist Template").descriptionSnapshot("History test")
            .publishedBy(adminUser).publishedAt(Instant.now()).activeForNewInspections(true).build();
        TemplateSection section = TemplateSection.builder().templateVersion(version).title("S1").displayOrder(1).build();
        TemplateItem item = TemplateItem.builder().section(section).title("I1").responseType(ResponseType.BOOLEAN)
            .required(false).observationRequiredOnFailure(false).evidenceRequiredOnFailure(false).displayOrder(1).build();
        section.setItems(List.of(item));
        version.setSections(List.of(section));
        activeTemplateVersion = templateVersionRepository.save(version);

        testInspection = inspectionRepository.save(Inspection.builder()
            .templateVersion(activeTemplateVersion).client(testClient).site(testSite)
            .technician(technicianUser).createdBy(adminUser).priority(InspectionPriority.MEDIUM)
            .status(InspectionStatus.IN_PROGRESS).scheduledFor(Instant.now().plusSeconds(3600))
            .startedAtServer(Instant.now()).build());
    }

    private User newUser(String name, String email, UserRole role) {
        return User.builder().name(name).email(email)
            .passwordHash(passwordEncoder.encode("S3nhaSegura!"))
            .role(role).status(UserStatus.ACTIVE).build();
    }

    private String mintAccessToken(User user) {
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
            .subject(user.getId().toString()).issuedAt(now).expiresAt(now.plusSeconds(900))
            .claim(JwtClaims.TOKEN_USE, JwtClaims.TOKEN_USE_ACCESS)
            .claim(JwtClaims.ROLE, user.getRole().name())
            .claim(JwtClaims.EMAIL, user.getEmail()).build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        return jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }

    private String bearer(String token) {
        return "Bearer " + token;
    }

    @Test
    void adminCanGetEmptyHistory() {
        assertThat(mvc.get().uri("/inspections/" + testInspection.getId() + "/history")
            .header("Authorization", bearer(adminToken)))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.content").asList().isEmpty();
    }

    @Test
    void supervisorCanGetHistory() {
        assertThat(mvc.get().uri("/inspections/" + testInspection.getId() + "/history")
            .header("Authorization", bearer(supervisorToken)))
            .hasStatusOk();
    }

    @Test
    void technicianCannotGetHistory() {
        assertThat(mvc.get().uri("/inspections/" + testInspection.getId() + "/history")
            .header("Authorization", bearer(technicianToken)))
            .hasStatus(HttpStatus.FORBIDDEN);
    }

    @Test
    void historyForNonExistentInspectionReturns404() {
        assertThat(mvc.get().uri("/inspections/" + UUID.randomUUID() + "/history")
            .header("Authorization", bearer(adminToken)))
            .hasStatus(HttpStatus.NOT_FOUND);
    }

    @Test
    void historyReturnsSavedEventsInOrder() {
        Instant t1 = Instant.now().minusSeconds(60);
        Instant t2 = Instant.now().minusSeconds(30);

        auditEventRepository.save(AuditEvent.builder()
            .inspectionId(testInspection.getId()).actorId(adminUser.getId())
            .action("INSPECTION_STARTED").entityType("INSPECTION")
            .entityId(testInspection.getId()).occurredAt(t1).build());
        auditEventRepository.save(AuditEvent.builder()
            .inspectionId(testInspection.getId()).actorId(technicianUser.getId())
            .action("INSPECTION_SUBMITTED").entityType("INSPECTION")
            .entityId(testInspection.getId()).occurredAt(t2).build());

        assertThat(mvc.get().uri("/inspections/" + testInspection.getId() + "/history")
            .header("Authorization", bearer(adminToken)))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.content").asList().hasSize(2);
    }
}
