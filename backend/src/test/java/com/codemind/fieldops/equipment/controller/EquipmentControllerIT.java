package com.codemind.fieldops.equipment.controller;

import static org.assertj.core.api.Assertions.assertThat;

import com.codemind.fieldops.FieldopsApplication;
import com.codemind.fieldops.TestcontainersConfiguration;
import com.codemind.fieldops.client.domain.Client;
import com.codemind.fieldops.client.domain.ClientStatus;
import com.codemind.fieldops.client.repository.ClientRepository;
import com.codemind.fieldops.equipment.domain.Equipment;
import com.codemind.fieldops.equipment.domain.EquipmentStatus;
import com.codemind.fieldops.equipment.repository.EquipmentRepository;
import com.codemind.fieldops.inspection.domain.Inspection;
import com.codemind.fieldops.inspection.domain.InspectionPriority;
import com.codemind.fieldops.inspection.domain.InspectionStatus;
import com.codemind.fieldops.inspection.repository.InspectionRepository;
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
import org.junit.jupiter.api.AfterEach;
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
class EquipmentControllerIT {

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private EquipmentRepository equipmentRepository;

    @Autowired
    private InspectionRepository inspectionRepository;

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

    @BeforeEach
    void setUp() {
        inspectionRepository.deleteAll();
        equipmentRepository.deleteAll();
        templateVersionRepository.deleteAll();
        templateRepository.deleteAll();
        siteRepository.deleteAll();
        clientRepository.deleteAll();
        userRepository.deleteAll();
        adminUser = userRepository.save(newUser("Admin", "admin.equip@fieldops.local", UserRole.ADMIN));
        technicianUser = userRepository.save(newUser("Tech", "tech.equip@fieldops.local", UserRole.TECHNICIAN));
        adminToken = mintAccessToken(adminUser);
        technicianToken = mintAccessToken(technicianUser);
        testClient = clientRepository.save(Client.builder().name("Equip Client").status(ClientStatus.ACTIVE).build());
        testSite = siteRepository.save(InspectionSite.builder().client(testClient).name("Equip Site").status(SiteStatus.ACTIVE).build());
    }

    @AfterEach
    void tearDown() {
        inspectionRepository.deleteAll();
        equipmentRepository.deleteAll();
        templateVersionRepository.deleteAll();
        templateRepository.deleteAll();
        siteRepository.deleteAll();
        clientRepository.deleteAll();
        userRepository.deleteAll();
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

    private Equipment saveEquipment(String name, String qrCode) {
        return equipmentRepository.save(Equipment.builder()
            .site(testSite)
            .name(name)
            .qrCode(qrCode)
            .status(EquipmentStatus.ACTIVE)
            .build());
    }

    @Test
    void adminCanCreateEquipment() {
        String payload = """
            {"siteId":"%s","name":"Boiler A","qrCode":"QR-001","assetNumber":"AST-001"}"""
            .formatted(testSite.getId());

        assertThat(mvc.post().uri("/equipment").header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON).content(payload))
            .hasStatus(HttpStatus.CREATED)
            .bodyJson()
            .extractingPath("$.name").asString().isEqualTo("Boiler A");
    }

    @Test
    void technicianCannotCreateEquipment() {
        String payload = """
            {"siteId":"%s","name":"Boiler B","qrCode":"QR-002"}"""
            .formatted(testSite.getId());

        assertThat(mvc.post().uri("/equipment").header("Authorization", bearer(technicianToken))
            .contentType(MediaType.APPLICATION_JSON).content(payload))
            .hasStatus(HttpStatus.FORBIDDEN);
    }

    @Test
    void createEquipmentWithDuplicateQrCodeIsRejected() {
        saveEquipment("Equipment 1", "QR-DUP-001");

        String payload = """
            {"siteId":"%s","name":"Equipment 2","qrCode":"QR-DUP-001"}"""
            .formatted(testSite.getId());

        assertThat(mvc.post().uri("/equipment").header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON).content(payload))
            .hasStatus(HttpStatus.CONFLICT);
    }

    @Test
    void adminCanListEquipment() {
        saveEquipment("Pump A", "QR-P-001");
        saveEquipment("Pump B", "QR-P-002");

        assertThat(mvc.get().uri("/equipment").header("Authorization", bearer(adminToken)))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.content").asList().hasSizeGreaterThanOrEqualTo(2);
    }

    @Test
    void adminCanGetEquipmentById() {
        Equipment equipment = saveEquipment("Valve X", "QR-V-001");

        assertThat(mvc.get().uri("/equipment/" + equipment.getId()).header("Authorization", bearer(adminToken)))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.name").asString().isEqualTo("Valve X");
    }

    @Test
    void getUnknownEquipmentReturnsNotFound() {
        assertThat(mvc.get().uri("/equipment/" + UUID.randomUUID()).header("Authorization", bearer(adminToken)))
            .hasStatus(HttpStatus.NOT_FOUND);
    }

    @Test
    void adminCanGetEquipmentByQrCode() {
        saveEquipment("QR Equipment", "QR-FIND-001");

        assertThat(mvc.get().uri("/equipment/by-qr/QR-FIND-001").header("Authorization", bearer(adminToken)))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.qrCode").asString().isEqualTo("QR-FIND-001");
    }

    @Test
    void getByQrCodeLongerThanColumnLimitReturns400() {
        // equipment.qr_code is VARCHAR(100), same limit as EquipmentCreateRequest.qrCode
        String tooLong = "Q".repeat(101);

        assertThat(mvc.get().uri("/equipment/by-qr/" + tooLong).header("Authorization", bearer(adminToken)))
            .hasStatus(HttpStatus.BAD_REQUEST)
            .bodyJson()
            .satisfies(json -> {
                assertThat(json).extractingPath("$.code").asString().isEqualTo("VALIDATION_ERROR");
                assertThat(json).extractingPath("$.fieldErrors[0].field").asString().isEqualTo("qrCode");
            });
    }

    @Test
    void getByQrCodeAtColumnLimitIsAcceptedAndReturns404WhenUnknown() {
        assertThat(mvc.get().uri("/equipment/by-qr/" + "Q".repeat(100)).header("Authorization", bearer(adminToken)))
            .hasStatus(HttpStatus.NOT_FOUND);
    }

    @Test
    void technicianCannotGetEquipmentByQrCodeOutOfScope() {
        saveEquipment("QR Equipment Tech", "QR-TECH-001");

        assertThat(mvc.get().uri("/equipment/by-qr/QR-TECH-001").header("Authorization", bearer(technicianToken)))
            .hasStatus(HttpStatus.FORBIDDEN);
    }

    @Test
    void technicianCanGetEquipmentByQrCodeWithActiveInspection() {
        saveEquipment("QR Equipment In Scope", "QR-TECH-INSCOPE");

        InspectionTemplate template = templateRepository.save(InspectionTemplate.builder()
            .title("T").description("D").category("C")
            .status(TemplateStatus.ACTIVE).currentVersion(1).createdBy(adminUser).build());
        TemplateVersion version = templateVersionRepository.save(TemplateVersion.builder()
            .template(template).versionNumber(1).titleSnapshot("T").descriptionSnapshot("D")
            .publishedBy(adminUser).publishedAt(Instant.now()).activeForNewInspections(true).build());
        inspectionRepository.save(Inspection.builder()
            .templateVersion(version).client(testClient).site(testSite).technician(technicianUser)
            .createdBy(adminUser).priority(InspectionPriority.MEDIUM).status(InspectionStatus.IN_PROGRESS)
            .scheduledFor(Instant.now().plusSeconds(3600)).startedAtServer(Instant.now()).build());

        assertThat(mvc.get().uri("/equipment/by-qr/QR-TECH-INSCOPE").header("Authorization", bearer(technicianToken)))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.qrCode").asString().isEqualTo("QR-TECH-INSCOPE");
    }

    @Test
    void technicianCannotGetEquipmentByQrCodeFromDifferentSite() {
        InspectionSite otherSite = siteRepository.save(
            InspectionSite.builder().client(testClient).name("Other Site").status(SiteStatus.ACTIVE).build());
        equipmentRepository.save(Equipment.builder()
            .site(otherSite).name("Other Equipment").qrCode("QR-OTHER-SITE").status(EquipmentStatus.ACTIVE).build());

        InspectionTemplate template = templateRepository.save(InspectionTemplate.builder()
            .title("T").description("D").category("C")
            .status(TemplateStatus.ACTIVE).currentVersion(1).createdBy(adminUser).build());
        TemplateVersion version = templateVersionRepository.save(TemplateVersion.builder()
            .template(template).versionNumber(1).titleSnapshot("T").descriptionSnapshot("D")
            .publishedBy(adminUser).publishedAt(Instant.now()).activeForNewInspections(true).build());
        inspectionRepository.save(Inspection.builder()
            .templateVersion(version).client(testClient).site(testSite).technician(technicianUser)
            .createdBy(adminUser).priority(InspectionPriority.MEDIUM).status(InspectionStatus.IN_PROGRESS)
            .scheduledFor(Instant.now().plusSeconds(3600)).startedAtServer(Instant.now()).build());

        assertThat(mvc.get().uri("/equipment/by-qr/QR-OTHER-SITE").header("Authorization", bearer(technicianToken)))
            .hasStatus(HttpStatus.FORBIDDEN);
    }

    @Test
    void getEquipmentByNonExistentQrCodeReturnsNotFound() {
        assertThat(mvc.get().uri("/equipment/by-qr/NONEXISTENT-QR").header("Authorization", bearer(adminToken)))
            .hasStatus(HttpStatus.NOT_FOUND);
    }

    @Test
    void adminCanUpdateEquipment() {
        Equipment equipment = saveEquipment("Old Equipment", "QR-UPD-001");

        String payload = """
            {"name":"Updated Equipment","qrCode":"QR-UPD-001"}""";

        assertThat(mvc.put().uri("/equipment/" + equipment.getId()).header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON).content(payload))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.name").asString().isEqualTo("Updated Equipment");
    }

    @Test
    void adminCanUpdateEquipmentStatus() {
        Equipment equipment = saveEquipment("Status Equipment", "QR-STS-001");

        String payload = """
            {"status":"DECOMMISSIONED"}""";

        assertThat(mvc.patch().uri("/equipment/" + equipment.getId() + "/status")
            .header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON).content(payload))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.status").asString().isEqualTo("DECOMMISSIONED");
    }

    @Test
    void adminCanFilterEquipmentBySite() {
        saveEquipment("Site Equipment", "QR-SE-001");

        assertThat(mvc.get().uri("/equipment?siteId=" + testSite.getId()).header("Authorization", bearer(adminToken)))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.content[*].siteId").asList().containsOnly(testSite.getId().toString());
    }

    @Test
    void anonymousCannotAccessEquipment() {
        assertThat(mvc.get().uri("/equipment"))
            .hasStatus(HttpStatus.UNAUTHORIZED);
    }

}
