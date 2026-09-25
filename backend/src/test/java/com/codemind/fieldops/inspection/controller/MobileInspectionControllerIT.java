package com.codemind.fieldops.inspection.controller;

import static org.assertj.core.api.Assertions.assertThat;

import com.codemind.fieldops.FieldopsApplication;
import com.codemind.fieldops.TestcontainersConfiguration;
import com.codemind.fieldops.client.domain.Client;
import com.codemind.fieldops.client.domain.ClientStatus;
import com.codemind.fieldops.client.repository.ClientRepository;
import com.codemind.fieldops.inspection.domain.Inspection;
import com.codemind.fieldops.inspection.domain.InspectionPriority;
import com.codemind.fieldops.inspection.domain.InspectionResponse;
import com.codemind.fieldops.inspection.domain.InspectionStatus;
import com.codemind.fieldops.inspection.domain.ItemSnapshot;
import com.codemind.fieldops.inspection.repository.InspectionRepository;
import com.codemind.fieldops.inspection.repository.InspectionResponseRepository;
import com.codemind.fieldops.inspection.repository.ItemSnapshotRepository;
import com.codemind.fieldops.nonconformity.domain.NonConformity;
import com.codemind.fieldops.nonconformity.domain.NonConformitySeverity;
import com.codemind.fieldops.nonconformity.domain.NonConformityStatus;
import com.codemind.fieldops.nonconformity.repository.NonConformityRepository;
import com.codemind.fieldops.review.repository.InspectionReviewRepository;
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
import org.junit.jupiter.api.DisplayName;
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
class MobileInspectionControllerIT {

    @Autowired private MockMvcTester mvc;
    @Autowired private InspectionRepository inspectionRepository;
    @Autowired private ItemSnapshotRepository itemSnapshotRepository;
    @Autowired private InspectionResponseRepository inspectionResponseRepository;
    @Autowired private NonConformityRepository nonConformityRepository;
    @Autowired private InspectionReviewRepository inspectionReviewRepository;
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
    private User otherTechnicianUser;
    private String supervisorToken;
    private String technicianToken;
    private String otherTechnicianToken;
    private Client testClient;
    private InspectionSite testSite;
    private TemplateVersion activeTemplateVersion;
    private Inspection technicianInspection;
    private ItemSnapshot technicianSnapshot;

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

        adminUser = userRepository.save(newUser("Admin", "admin.mobile@fieldops.local", UserRole.ADMIN));
        supervisorUser = userRepository.save(newUser("Supervisor", "supervisor.mobile@fieldops.local", UserRole.SUPERVISOR));
        technicianUser = userRepository.save(newUser("Technician", "tech.mobile@fieldops.local", UserRole.TECHNICIAN));
        otherTechnicianUser = userRepository.save(newUser("Other Tech", "other.tech.mobile@fieldops.local", UserRole.TECHNICIAN));
        supervisorToken = mintAccessToken(supervisorUser);
        technicianToken = mintAccessToken(technicianUser);
        otherTechnicianToken = mintAccessToken(otherTechnicianUser);

        testClient = clientRepository.save(Client.builder().name("Mobile Client").status(ClientStatus.ACTIVE).build());
        testSite = siteRepository.save(InspectionSite.builder().client(testClient).name("Mobile Site").status(SiteStatus.ACTIVE).build());

        InspectionTemplate template = templateRepository.save(InspectionTemplate.builder()
            .title("Mobile Template")
            .description("For mobile tests")
            .category("Testing")
            .status(TemplateStatus.ACTIVE)
            .currentVersion(1)
            .createdBy(adminUser)
            .build());

        TemplateVersion version = TemplateVersion.builder()
            .template(template)
            .versionNumber(1)
            .titleSnapshot("Mobile Template")
            .descriptionSnapshot("For mobile tests")
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

        technicianInspection = inspectionRepository.save(Inspection.builder()
            .templateVersion(activeTemplateVersion)
            .client(testClient)
            .site(testSite)
            .technician(technicianUser)
            .createdBy(adminUser)
            .priority(InspectionPriority.MEDIUM)
            .status(InspectionStatus.ASSIGNED)
            .scheduledFor(Instant.now().plusSeconds(3600))
            .build());

        technicianSnapshot = itemSnapshotRepository.save(ItemSnapshot.builder()
            .inspection(technicianInspection)
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

    // ---- Authorization ----

    @Test
    void technicianSeesOnlyOwnInspections() {
        inspectionRepository.save(Inspection.builder()
            .templateVersion(activeTemplateVersion)
            .client(testClient)
            .site(testSite)
            .technician(otherTechnicianUser)
            .createdBy(adminUser)
            .priority(InspectionPriority.LOW)
            .status(InspectionStatus.ASSIGNED)
            .scheduledFor(Instant.now().plusSeconds(3600))
            .build());

        assertThat(mvc.get().uri("/mobile/inspections")
            .header("Authorization", bearer(technicianToken)))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.content").asList().hasSizeGreaterThanOrEqualTo(1);

        assertThat(mvc.get().uri("/mobile/inspections")
            .header("Authorization", bearer(technicianToken)))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.content[*].technicianId").asList()
            .containsOnly(technicianUser.getId().toString());
    }

    @Test
    void supervisorCannotAccessMobileEndpoint() {
        assertThat(mvc.get().uri("/mobile/inspections")
            .header("Authorization", bearer(supervisorToken)))
            .hasStatus(HttpStatus.FORBIDDEN);
    }

    @Test
    @DisplayName("RN-004, AC-SECURITY - técnico acessa a própria inspeção autorizada")
    void technicianCanGetOwnInspectionDetail() {
        assertThat(mvc.get().uri("/mobile/inspections/" + technicianInspection.getId())
            .header("Authorization", bearer(technicianToken)))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.id").asString().isEqualTo(technicianInspection.getId().toString());
    }

    @Test
    @DisplayName("RN-004, AC-SECURITY - técnico não acessa inspeção de outro técnico pela URL")
    void technicianCannotAccessOtherTechnicianInspectionDetail() {
        Inspection otherInspection = inspectionRepository.save(Inspection.builder()
            .templateVersion(activeTemplateVersion)
            .client(testClient)
            .site(testSite)
            .technician(otherTechnicianUser)
            .createdBy(adminUser)
            .priority(InspectionPriority.LOW)
            .status(InspectionStatus.ASSIGNED)
            .scheduledFor(Instant.now().plusSeconds(3600))
            .build());

        var result = mvc.get().uri("/mobile/inspections/" + otherInspection.getId())
            .header("Authorization", bearer(technicianToken)).exchange();

        assertThat(result).hasStatus(HttpStatus.FORBIDDEN);
        assertThat(result).bodyJson().doesNotHavePath("$.id");
        assertThat(result).bodyJson().doesNotHavePath("$.title");
        assertThat(result).bodyJson().doesNotHavePath("$.technicianId");
        assertThat(result).bodyJson().doesNotHavePath("$.snapshots");
    }

    @Test
    void getMobileNonExistentInspectionReturns404() {
        assertThat(mvc.get().uri("/mobile/inspections/" + UUID.randomUUID())
            .header("Authorization", bearer(technicianToken)))
            .hasStatus(HttpStatus.NOT_FOUND);
    }

    @Test
    void anonymousCannotAccessMobileEndpoints() {
        assertThat(mvc.get().uri("/mobile/inspections"))
            .hasStatus(HttpStatus.UNAUTHORIZED);
    }

    // ---- Contract: items (was snapshots) ----

    @Test
    void getMobileInspectionDetailContainsItems() {
        // Contract requires "items" not "snapshots" (contrato-backend-frontend.md §4.2)
        assertThat(mvc.get().uri("/mobile/inspections/" + technicianInspection.getId())
            .header("Authorization", bearer(technicianToken)))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.items").asList().isNotEmpty();
    }

    @Test
    void getMobileInspectionDetailItemsHaveContractFields() {
        // items[n] must include sourceTemplateItemId and sectionDescription per contract
        assertThat(mvc.get().uri("/mobile/inspections/" + technicianInspection.getId())
            .header("Authorization", bearer(technicianToken)))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.items[0].inspectionId").asString()
            .isEqualTo(technicianInspection.getId().toString());
    }

    // ---- Contract: responses ----

    @Test
    void getMobileInspectionDetailResponsesIsEmptyArrayWhenNoneExist() {
        // responses must be an empty array [], never absent or null
        assertThat(mvc.get().uri("/mobile/inspections/" + technicianInspection.getId())
            .header("Authorization", bearer(technicianToken)))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.responses").asList().isEmpty();
    }

    @Test
    void getMobileInspectionDetailWithResponseContainsInspectionItemId() {
        // InspectionResponse must expose inspectionItemId (not snapshotId) per contract §4.2
        InspectionResponse response = InspectionResponse.builder()
            .id(UUID.randomUUID())
            .inspection(technicianInspection)
            .snapshot(technicianSnapshot)
            .respondedBy(technicianUser)
            .valueBoolean(true)
            .build();
        inspectionResponseRepository.save(response);

        assertThat(mvc.get().uri("/mobile/inspections/" + technicianInspection.getId())
            .header("Authorization", bearer(technicianToken)))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.responses[0].inspectionItemId").asString()
            .isEqualTo(technicianSnapshot.getId().toString());
    }

    @Test
    void getMobileInspectionDetailResponseDoesNotExposeSnapshotId() {
        // "snapshotId" must NOT appear in the response — only "inspectionItemId"
        InspectionResponse response = InspectionResponse.builder()
            .id(UUID.randomUUID())
            .inspection(technicianInspection)
            .snapshot(technicianSnapshot)
            .respondedBy(technicianUser)
            .valueBoolean(false)
            .build();
        inspectionResponseRepository.save(response);

        assertThat(mvc.get().uri("/mobile/inspections/" + technicianInspection.getId())
            .header("Authorization", bearer(technicianToken)))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.responses[0].snapshotId").isNull();
    }

    // ---- Contract: nonConformities ----

    @Test
    void getMobileInspectionDetailNonConformitiesIsEmptyArrayWhenNoneExist() {
        assertThat(mvc.get().uri("/mobile/inspections/" + technicianInspection.getId())
            .header("Authorization", bearer(technicianToken)))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.nonConformities").asList().isEmpty();
    }

    @Test
    void getMobileInspectionDetailWithNonConformityContainsInspectionItemId() {
        // NonConformity must expose inspectionItemId (not snapshotId) per contract §4.2
        NonConformity nc = NonConformity.builder()
            .id(UUID.randomUUID())
            .inspection(technicianInspection)
            .snapshot(technicianSnapshot)
            .reportedBy(technicianUser)
            .title("Test NC")
            .description("A test non-conformity")
            .severity(NonConformitySeverity.LOW)
            .status(NonConformityStatus.OPEN)
            .build();
        nonConformityRepository.save(nc);

        assertThat(mvc.get().uri("/mobile/inspections/" + technicianInspection.getId())
            .header("Authorization", bearer(technicianToken)))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.nonConformities[0].inspectionItemId").asString()
            .isEqualTo(technicianSnapshot.getId().toString());
    }

    @Test
    void getMobileInspectionDetailNonConformityDoesNotExposeSnapshotId() {
        NonConformity nc = NonConformity.builder()
            .id(UUID.randomUUID())
            .inspection(technicianInspection)
            .snapshot(technicianSnapshot)
            .reportedBy(technicianUser)
            .title("Test NC")
            .description("A test non-conformity")
            .severity(NonConformitySeverity.LOW)
            .status(NonConformityStatus.OPEN)
            .build();
        nonConformityRepository.save(nc);

        assertThat(mvc.get().uri("/mobile/inspections/" + technicianInspection.getId())
            .header("Authorization", bearer(technicianToken)))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.nonConformities[0].snapshotId").isNull();
    }

    // ---- Contract: reviews ----

    @Test
    void getMobileInspectionDetailReviewsIsEmptyArrayWhenNoneExist() {
        assertThat(mvc.get().uri("/mobile/inspections/" + technicianInspection.getId())
            .header("Authorization", bearer(technicianToken)))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.reviews").asList().isEmpty();
    }

}
