package com.codemind.fieldops.security;

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
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/**
 * aplicativo-mobile.md (lista e detalhe mostram cliente, local e equipamento) + RN-004
 * (técnico só consulta o que é das inspeções atribuídas a ele): o técnico lê {@code GET /clients/{id}},
 * {@code /sites/{id}} e {@code /equipment/{id}} somente quando há uma inspeção atribuída
 * a ele que referencia aquele registro, em qualquer estado. Fora disso, 403 sem dados.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(classes = FieldopsApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("local")
class TechnicianPlaceReadScopeIT {

    @Autowired private MockMvcTester mvc;
    @Autowired private JdbcTemplate jdbcTemplate;
    @Autowired private EquipmentRepository equipmentRepository;
    @Autowired private InspectionRepository inspectionRepository;
    @Autowired private TemplateVersionRepository templateVersionRepository;
    @Autowired private InspectionTemplateRepository templateRepository;
    @Autowired private InspectionSiteRepository siteRepository;
    @Autowired private ClientRepository clientRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtEncoder jwtEncoder;

    private String adminToken;
    private String supervisorToken;
    private String ownerToken;
    private Inspection ownerInspection;
    private Client ownClient;
    private InspectionSite ownSite;
    private Equipment ownEquipment;
    private Equipment unassignedEquipmentAtOwnSite;
    private Client foreignClient;
    private InspectionSite foreignSite;
    private Equipment foreignEquipment;

    @BeforeEach
    void setUp() {
        cleanDatabase();

        User admin = userRepository.save(newUser("Admin", "admin.scope@fieldops.local", UserRole.ADMIN));
        User supervisor = userRepository.save(newUser("Supervisor", "sup.scope@fieldops.local", UserRole.SUPERVISOR));
        User owner = userRepository.save(newUser("Owner Tech", "owner.scope@fieldops.local", UserRole.TECHNICIAN));
        User other = userRepository.save(newUser("Other Tech", "other.scope@fieldops.local", UserRole.TECHNICIAN));
        adminToken = mintAccessToken(admin);
        supervisorToken = mintAccessToken(supervisor);
        ownerToken = mintAccessToken(owner);

        ownClient = clientRepository.save(Client.builder().name("Own Client").status(ClientStatus.ACTIVE).build());
        ownSite = siteRepository.save(
            InspectionSite.builder().client(ownClient).name("Own Site").status(SiteStatus.ACTIVE).build());
        ownEquipment = equipmentRepository.save(newEquipment(ownSite, "Own Equipment", "QR-SCOPE-OWN"));
        unassignedEquipmentAtOwnSite = equipmentRepository.save(
            newEquipment(ownSite, "Unassigned Equipment", "QR-SCOPE-UNASSIGNED"));

        foreignClient = clientRepository.save(
            Client.builder().name("Foreign Client").status(ClientStatus.ACTIVE).build());
        foreignSite = siteRepository.save(
            InspectionSite.builder().client(foreignClient).name("Foreign Site").status(SiteStatus.ACTIVE).build());
        foreignEquipment = equipmentRepository.save(newEquipment(foreignSite, "Foreign Equipment", "QR-SCOPE-FOREIGN"));

        InspectionTemplate template = templateRepository.save(InspectionTemplate.builder()
            .title("Scope Template")
            .category("Testing")
            .status(TemplateStatus.ACTIVE)
            .currentVersion(1)
            .createdBy(admin)
            .build());
        TemplateVersion version = templateVersionRepository.save(TemplateVersion.builder()
            .template(template)
            .versionNumber(1)
            .titleSnapshot("Scope Template")
            .publishedBy(admin)
            .publishedAt(Instant.now())
            .activeForNewInspections(true)
            .build());

        ownerInspection = inspectionRepository.save(newInspection(version, ownClient, ownSite, ownEquipment, owner, admin));
        inspectionRepository.save(newInspection(version, foreignClient, foreignSite, foreignEquipment, other, admin));
    }

    @AfterEach
    void tearDown() {
        cleanDatabase();
    }

    // ---- Dentro do escopo ----

    @Test
    @DisplayName("técnico lê cliente, local e equipamento da própria inspeção")
    void technicianReadsPlaceDataOfOwnInspection() {
        assertThat(get("/clients/" + ownClient.getId(), ownerToken))
            .hasStatusOk().bodyJson().extractingPath("$.name").asString().isEqualTo("Own Client");
        assertThat(get("/sites/" + ownSite.getId(), ownerToken))
            .hasStatusOk().bodyJson().extractingPath("$.name").asString().isEqualTo("Own Site");
        assertThat(get("/equipment/" + ownEquipment.getId(), ownerToken))
            .hasStatusOk().bodyJson().extractingPath("$.name").asString().isEqualTo("Own Equipment");
    }

    @Test
    @DisplayName("escopo vale para inspeção em qualquer estado (histórico aprovado continua legível)")
    void scopeIncludesInspectionsInTerminalStatus() {
        ownerInspection.setStatus(InspectionStatus.APPROVED);
        inspectionRepository.save(ownerInspection);

        assertThat(get("/clients/" + ownClient.getId(), ownerToken)).hasStatusOk();
        assertThat(get("/sites/" + ownSite.getId(), ownerToken)).hasStatusOk();
        assertThat(get("/equipment/" + ownEquipment.getId(), ownerToken)).hasStatusOk();
    }

    // ---- Fora do escopo ----

    @Test
    @DisplayName("RN-004 - técnico não lê cliente, local e equipamento sem inspeção atribuída")
    void technicianCannotReadForeignPlaceData() {
        assertForbiddenWithout(get("/clients/" + foreignClient.getId(), ownerToken), "Foreign Client");
        assertForbiddenWithout(get("/sites/" + foreignSite.getId(), ownerToken), "Foreign Site");
        assertForbiddenWithout(get("/equipment/" + foreignEquipment.getId(), ownerToken), "Foreign Equipment");
    }

    @Test
    @DisplayName("RN-004 - equipamento do mesmo local, mas fora das inspeções do técnico, é recusado")
    void technicianCannotReadEquipmentNotReferencedByOwnInspection() {
        assertForbiddenWithout(get("/equipment/" + unassignedEquipmentAtOwnSite.getId(), ownerToken),
            "Unassigned Equipment");
    }

    @Test
    @DisplayName("técnico continua sem acesso às listagens de cadastro")
    void technicianStillCannotListRegistries() {
        assertThat(get("/clients", ownerToken)).hasStatus(HttpStatus.FORBIDDEN);
        assertThat(get("/sites", ownerToken)).hasStatus(HttpStatus.FORBIDDEN);
        assertThat(get("/equipment", ownerToken)).hasStatus(HttpStatus.FORBIDDEN);
    }

    // ---- Outros perfis inalterados ----

    @Test
    @DisplayName("administrador e supervisor seguem lendo qualquer cadastro")
    void adminAndSupervisorAreNotScoped() {
        for (String token : new String[] {adminToken, supervisorToken}) {
            assertThat(get("/clients/" + foreignClient.getId(), token)).hasStatusOk();
            assertThat(get("/sites/" + foreignSite.getId(), token)).hasStatusOk();
            assertThat(get("/equipment/" + foreignEquipment.getId(), token)).hasStatusOk();
        }
    }

    // ---- Helpers ----

    private MvcTestResult get(String uri, String token) {
        return mvc.get().uri(uri).header("Authorization", "Bearer " + token).exchange();
    }

    private void assertForbiddenWithout(MvcTestResult result, String resourceName) {
        assertThat(result).hasStatus(HttpStatus.FORBIDDEN);
        assertThat(result).bodyJson().extractingPath("$.code").asString().isEqualTo("FORBIDDEN");
        assertThat(result).bodyText().doesNotContain(resourceName);
    }

    private void cleanDatabase() {
        // Clears every table referencing users (templates, inspections...) — ITORDER-001
        jdbcTemplate.execute("TRUNCATE TABLE users CASCADE");
        equipmentRepository.deleteAll();
        siteRepository.deleteAll();
        clientRepository.deleteAll();
    }

    private Equipment newEquipment(InspectionSite site, String name, String qrCode) {
        return Equipment.builder().site(site).name(name).qrCode(qrCode).status(EquipmentStatus.ACTIVE).build();
    }

    private Inspection newInspection(TemplateVersion version, Client client, InspectionSite site,
                                     Equipment equipment, User technician, User createdBy) {
        return Inspection.builder()
            .templateVersion(version)
            .client(client)
            .site(site)
            .equipment(equipment)
            .technician(technician)
            .createdBy(createdBy)
            .priority(InspectionPriority.MEDIUM)
            .status(InspectionStatus.ASSIGNED)
            .scheduledFor(Instant.now().plusSeconds(3600))
            .build();
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

}
