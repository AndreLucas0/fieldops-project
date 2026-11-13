package com.codemind.fieldops.security;

import static org.assertj.core.api.Assertions.assertThat;

import com.codemind.fieldops.FieldopsApplication;
import com.codemind.fieldops.TestcontainersConfiguration;
import com.codemind.fieldops.client.domain.Client;
import com.codemind.fieldops.client.domain.ClientStatus;
import com.codemind.fieldops.client.repository.ClientRepository;
import com.codemind.fieldops.equipment.repository.EquipmentRepository;
import com.codemind.fieldops.evidence.repository.EvidenceRepository;
import com.codemind.fieldops.inspection.domain.Inspection;
import com.codemind.fieldops.inspection.domain.InspectionPriority;
import com.codemind.fieldops.inspection.domain.InspectionStatus;
import com.codemind.fieldops.inspection.repository.InspectionRepository;
import com.codemind.fieldops.nonconformity.domain.NonConformity;
import com.codemind.fieldops.nonconformity.domain.NonConformitySeverity;
import com.codemind.fieldops.nonconformity.domain.NonConformityStatus;
import com.codemind.fieldops.nonconformity.repository.NonConformityRepository;
import com.codemind.fieldops.shared.security.JwtClaims;
import com.codemind.fieldops.shared.storage.EvidenceStorageClient;
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
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

/**
 * AC-SECURITY / RN-004 (test-plan.md §5.8): a technician cannot read or change evidence and
 * non-conformities of an inspection assigned to another technician by addressing it by URL.
 * Denials are 403 and must not reveal resource data.
 */
@Import({TestcontainersConfiguration.class, AuthorizationBoundaryIT.FakeStorageConfig.class})
@SpringBootTest(classes = FieldopsApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("local")
class AuthorizationBoundaryIT {

    @Autowired private MockMvcTester mvc;
    @Autowired private JdbcTemplate jdbcTemplate;
    @Autowired private EvidenceRepository evidenceRepository;
    @Autowired private EquipmentRepository equipmentRepository;
    @Autowired private NonConformityRepository nonConformityRepository;
    @Autowired private InspectionRepository inspectionRepository;
    @Autowired private TemplateVersionRepository templateVersionRepository;
    @Autowired private InspectionTemplateRepository templateRepository;
    @Autowired private InspectionSiteRepository siteRepository;
    @Autowired private ClientRepository clientRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtEncoder jwtEncoder;

    private String adminToken;
    private String ownerToken;
    private String otherTechnicianToken;
    private Inspection ownerInspection;
    private NonConformity ownerNonConformity;
    private String ownerEvidenceId;

    @BeforeEach
    void setUp() {
        cleanDatabase();

        User admin = userRepository.save(newUser("Admin", "admin.boundary@fieldops.local", UserRole.ADMIN));
        User owner = userRepository.save(newUser("Owner Tech", "owner.boundary@fieldops.local", UserRole.TECHNICIAN));
        User otherTechnician = userRepository.save(
            newUser("Other Tech", "other.boundary@fieldops.local", UserRole.TECHNICIAN));
        adminToken = mintAccessToken(admin);
        ownerToken = mintAccessToken(owner);
        otherTechnicianToken = mintAccessToken(otherTechnician);

        Client client = clientRepository.save(Client.builder().name("Boundary Client").status(ClientStatus.ACTIVE).build());
        InspectionSite site = siteRepository
            .save(InspectionSite.builder().client(client).name("Boundary Site").status(SiteStatus.ACTIVE).build());
        InspectionTemplate template = templateRepository.save(InspectionTemplate.builder()
            .title("Boundary Template")
            .category("Testing")
            .status(TemplateStatus.ACTIVE)
            .currentVersion(1)
            .createdBy(admin)
            .build());
        TemplateVersion version = templateVersionRepository.save(TemplateVersion.builder()
            .template(template)
            .versionNumber(1)
            .titleSnapshot("Boundary Template")
            .publishedBy(admin)
            .publishedAt(Instant.now())
            .activeForNewInspections(true)
            .build());

        ownerInspection = inspectionRepository.save(Inspection.builder()
            .templateVersion(version)
            .client(client)
            .site(site)
            .technician(owner)
            .createdBy(admin)
            .priority(InspectionPriority.MEDIUM)
            .status(InspectionStatus.IN_PROGRESS)
            .scheduledFor(Instant.now().plusSeconds(3600))
            .startedAtServer(Instant.now())
            .build());

        ownerNonConformity = nonConformityRepository.save(NonConformity.builder()
            .id(UUID.randomUUID())
            .inspection(ownerInspection)
            .reportedBy(owner)
            .title("Owner NC")
            .description("Reported by the assigned technician")
            .severity(NonConformitySeverity.LOW)
            .status(NonConformityStatus.OPEN)
            .build());

        MvcTestResult upload = uploadEvidence(ownerToken);
        assertThat(upload).hasStatus(HttpStatus.CREATED);
        ownerEvidenceId = evidenceRepository.findAll().getFirst().getId().toString();
    }

    @AfterEach
    void tearDown() {
        cleanDatabase();
    }

    private void cleanDatabase() {
        // Clears every table referencing users (templates, inspections, evidence, NCs...) — ITORDER-001
        jdbcTemplate.execute("TRUNCATE TABLE users CASCADE");
        equipmentRepository.deleteAll();
        siteRepository.deleteAll();
        clientRepository.deleteAll();
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

    private MvcTestResult uploadEvidence(String token) {
        return mvc.perform(MockMvcRequestBuilders
            .multipart("/inspections/" + ownerInspection.getId() + "/evidence")
            .file(new MockMultipartFile("file", "photo.jpg", "image/jpeg", "fake-image-bytes".getBytes()))
            .param("idempotencyKey", UUID.randomUUID().toString())
            .param("type", "PHOTO")
            .param("capturedAtDevice", Instant.now().toString())
            .header("Authorization", bearer(token)));
    }

    private void assertForbiddenWithoutResourceData(MvcTestResult result) {
        assertThat(result).hasStatus(HttpStatus.FORBIDDEN);
        assertThat(result).bodyJson().extractingPath("$.code").asString().isEqualTo("FORBIDDEN");
        // The error body's "path" echoes the requested URL (ids the caller already sent), so check
        // for resource content instead: NC title, evidence file name and storage access URL.
        assertThat(result).bodyText()
            .doesNotContain("Owner NC")
            .doesNotContain("photo.jpg")
            .doesNotContain("fake-storage.local");
    }

    // ---- Evidence ----

    @Test
    @DisplayName("RN-004 - técnico não lista evidências da inspeção de outro técnico")
    void otherTechnicianCannotListEvidence() {
        assertForbiddenWithoutResourceData(mvc.get().uri("/inspections/" + ownerInspection.getId() + "/evidence")
            .header("Authorization", bearer(otherTechnicianToken)).exchange());
    }

    @Test
    @DisplayName("RN-004 - técnico não consulta evidência de outro técnico pelo id")
    void otherTechnicianCannotGetEvidenceById() {
        assertForbiddenWithoutResourceData(mvc.get().uri("/evidence/" + ownerEvidenceId)
            .header("Authorization", bearer(otherTechnicianToken)).exchange());
    }

    @Test
    @DisplayName("AC-SECURITY - técnico não envia evidência para inspeção de outro técnico")
    void otherTechnicianCannotUploadEvidence() {
        assertForbiddenWithoutResourceData(uploadEvidence(otherTechnicianToken));
        assertThat(evidenceRepository.count()).isEqualTo(1);
    }

    @Test
    @DisplayName("RN-004 - técnico atribuído consulta as próprias evidências")
    void ownerCanListAndGetOwnEvidence() {
        assertThat(mvc.get().uri("/inspections/" + ownerInspection.getId() + "/evidence")
            .header("Authorization", bearer(ownerToken)))
            .hasStatusOk()
            .bodyJson().extractingPath("$").asList().hasSize(1);
        assertThat(mvc.get().uri("/evidence/" + ownerEvidenceId).header("Authorization", bearer(ownerToken)))
            .hasStatusOk();
    }

    // ---- Non-conformities ----

    @Test
    @DisplayName("RN-004 - técnico não lista não conformidades da inspeção de outro técnico")
    void otherTechnicianCannotListNonConformities() {
        assertForbiddenWithoutResourceData(
            mvc.get().uri("/inspections/" + ownerInspection.getId() + "/non-conformities")
                .header("Authorization", bearer(otherTechnicianToken)).exchange());
    }

    @Test
    @DisplayName("RN-004 - técnico não consulta não conformidade de outro técnico pelo id")
    void otherTechnicianCannotGetNonConformityById() {
        assertForbiddenWithoutResourceData(mvc.get().uri("/non-conformities/" + ownerNonConformity.getId())
            .header("Authorization", bearer(otherTechnicianToken)).exchange());
    }

    @Test
    @DisplayName("AC-SECURITY - técnico não registra não conformidade na inspeção de outro técnico")
    void otherTechnicianCannotCreateNonConformity() {
        assertForbiddenWithoutResourceData(
            mvc.post().uri("/inspections/" + ownerInspection.getId() + "/non-conformities")
                .header("Authorization", bearer(otherTechnicianToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"Intruder NC\",\"description\":\"x\",\"severity\":\"LOW\"}")
                .exchange());
        assertThat(nonConformityRepository.count()).isEqualTo(1);
    }

    @Test
    @DisplayName("AC-SECURITY - técnico não altera não conformidade de outro técnico")
    void otherTechnicianCannotUpdateNonConformity() {
        assertForbiddenWithoutResourceData(mvc.put().uri("/non-conformities/" + ownerNonConformity.getId())
            .header("Authorization", bearer(otherTechnicianToken))
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"title\":\"Tampered\",\"description\":\"x\",\"severity\":\"LOW\"}")
            .exchange());
        assertThat(nonConformityRepository.findById(ownerNonConformity.getId()).orElseThrow().getTitle())
            .isEqualTo("Owner NC");
    }

    @Test
    @DisplayName("AC-SECURITY - técnico não altera o status de não conformidade de outro técnico")
    void otherTechnicianCannotUpdateNonConformityStatus() {
        assertForbiddenWithoutResourceData(mvc.patch().uri("/non-conformities/" + ownerNonConformity.getId() + "/status")
            .header("Authorization", bearer(otherTechnicianToken))
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"status\":\"OPEN\"}")
            .exchange());
    }

    @Test
    @DisplayName("RN-004 - técnico atribuído consulta, registra e altera as próprias não conformidades")
    void ownerCanReadCreateAndUpdateOwnNonConformities() {
        assertThat(mvc.get().uri("/inspections/" + ownerInspection.getId() + "/non-conformities")
            .header("Authorization", bearer(ownerToken)))
            .hasStatusOk();
        assertThat(mvc.get().uri("/non-conformities/" + ownerNonConformity.getId())
            .header("Authorization", bearer(ownerToken)))
            .hasStatusOk();
        assertThat(mvc.post().uri("/inspections/" + ownerInspection.getId() + "/non-conformities")
            .header("Authorization", bearer(ownerToken))
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"title\":\"Second NC\",\"description\":\"x\",\"severity\":\"LOW\"}"))
            .hasStatus(HttpStatus.CREATED);
        assertThat(mvc.put().uri("/non-conformities/" + ownerNonConformity.getId())
            .header("Authorization", bearer(ownerToken))
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"title\":\"Edited\",\"description\":\"x\",\"severity\":\"LOW\"}"))
            .hasStatusOk();
        assertThat(mvc.patch().uri("/non-conformities/" + ownerNonConformity.getId() + "/status")
            .header("Authorization", bearer(ownerToken))
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"status\":\"OPEN\"}"))
            .hasStatusOk();
    }

    @Test
    @DisplayName("RN-004 não restringe administradores")
    void adminIsNotRestrictedByTechnicianOwnership() {
        assertThat(mvc.get().uri("/inspections/" + ownerInspection.getId() + "/evidence")
            .header("Authorization", bearer(adminToken)))
            .hasStatusOk();
        assertThat(mvc.get().uri("/non-conformities/" + ownerNonConformity.getId())
            .header("Authorization", bearer(adminToken)))
            .hasStatusOk();
    }

    @TestConfiguration
    static class FakeStorageConfig {

        @Bean
        @Primary
        EvidenceStorageClient fakeEvidenceStorageClient() {
            return new EvidenceStorageClient() {
                private final Map<String, byte[]> store = new ConcurrentHashMap<>();

                @Override
                public String upload(byte[] content, String key, String contentType) {
                    store.put(key, content);
                    return key;
                }

                @Override
                public String generateTemporaryUrl(String key) {
                    return "https://fake-storage.local/" + key;
                }

                @Override
                public void delete(String key) {
                    store.remove(key);
                }
            };
        }

    }

}
