package com.codemind.fieldops.evidence.controller;

import static org.assertj.core.api.Assertions.assertThat;

import com.codemind.fieldops.FieldopsApplication;
import com.codemind.fieldops.TestcontainersConfiguration;
import com.codemind.fieldops.client.domain.Client;
import com.codemind.fieldops.client.domain.ClientStatus;
import com.codemind.fieldops.client.repository.ClientRepository;
import com.codemind.fieldops.evidence.repository.EvidenceRepository;
import com.codemind.fieldops.inspection.domain.Inspection;
import com.codemind.fieldops.inspection.domain.InspectionPriority;
import com.codemind.fieldops.inspection.domain.InspectionStatus;
import com.codemind.fieldops.inspection.repository.InspectionRepository;
import com.codemind.fieldops.inspection.repository.InspectionResponseRepository;
import com.codemind.fieldops.inspection.repository.ItemSnapshotRepository;
import com.codemind.fieldops.nonconformity.repository.NonConformityRepository;
import com.codemind.fieldops.shared.audit.AuditEventRepository;
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
import org.junit.jupiter.api.BeforeEach;
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
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

@Import({TestcontainersConfiguration.class, EvidenceControllerIT.FakeStorageConfig.class})
@SpringBootTest(classes = FieldopsApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("local")
class EvidenceControllerIT {

    @Autowired private MockMvcTester mvc;
    @Autowired private EvidenceRepository evidenceRepository;
    @Autowired private AuditEventRepository auditEventRepository;
    @Autowired private NonConformityRepository nonConformityRepository;
    @Autowired private InspectionResponseRepository inspectionResponseRepository;
    @Autowired private ItemSnapshotRepository itemSnapshotRepository;
    @Autowired private InspectionRepository inspectionRepository;
    @Autowired private TemplateVersionRepository templateVersionRepository;
    @Autowired private InspectionTemplateRepository templateRepository;
    @Autowired private InspectionSiteRepository siteRepository;
    @Autowired private ClientRepository clientRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtEncoder jwtEncoder;

    private User adminUser;
    private User technicianUser;
    private String adminToken;
    private String technicianToken;
    private Inspection inProgressInspection;
    private Inspection approvedInspection;

    @BeforeEach
    void setUp() {
        auditEventRepository.deleteAll();
        evidenceRepository.deleteAll();
        nonConformityRepository.deleteAll();
        inspectionResponseRepository.deleteAll();
        itemSnapshotRepository.deleteAll();
        inspectionRepository.deleteAll();
        templateVersionRepository.deleteAll();
        templateRepository.deleteAll();
        siteRepository.deleteAll();
        clientRepository.deleteAll();
        userRepository.deleteAll();

        adminUser = userRepository.save(newUser("Admin", "admin.ev@fieldops.local", UserRole.ADMIN));
        technicianUser = userRepository.save(newUser("Technician", "tech.ev@fieldops.local", UserRole.TECHNICIAN));
        adminToken = mintAccessToken(adminUser);
        technicianToken = mintAccessToken(technicianUser);

        Client client = clientRepository.save(Client.builder().name("Evidence Client").status(ClientStatus.ACTIVE).build());
        InspectionSite site = siteRepository
            .save(InspectionSite.builder().client(client).name("Evidence Site").status(SiteStatus.ACTIVE).build());

        InspectionTemplate template = templateRepository.save(InspectionTemplate.builder()
            .title("Evidence Template")
            .description("For evidence tests")
            .category("Testing")
            .status(TemplateStatus.ACTIVE)
            .currentVersion(1)
            .createdBy(adminUser)
            .build());

        TemplateVersion version = templateVersionRepository.save(TemplateVersion.builder()
            .template(template)
            .versionNumber(1)
            .titleSnapshot("Evidence Template")
            .descriptionSnapshot("For evidence tests")
            .publishedBy(adminUser)
            .publishedAt(Instant.now())
            .activeForNewInspections(true)
            .build());

        inProgressInspection = inspectionRepository.save(Inspection.builder()
            .templateVersion(version)
            .client(client)
            .site(site)
            .technician(technicianUser)
            .createdBy(adminUser)
            .priority(InspectionPriority.MEDIUM)
            .status(InspectionStatus.IN_PROGRESS)
            .scheduledFor(Instant.now().plusSeconds(3600))
            .startedAtServer(Instant.now())
            .build());

        approvedInspection = inspectionRepository.save(Inspection.builder()
            .templateVersion(version)
            .client(client)
            .site(site)
            .technician(technicianUser)
            .createdBy(adminUser)
            .priority(InspectionPriority.MEDIUM)
            .status(InspectionStatus.APPROVED)
            .scheduledFor(Instant.now().plusSeconds(3600))
            .startedAtServer(Instant.now())
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

    private MockMultipartFile jpegFile() {
        return new MockMultipartFile("file", "photo.jpg", "image/jpeg", "fake-image-bytes".getBytes());
    }

    // ---- POST evidence ----

    @Test
    void technicianCanUploadEvidence() {
        assertThat(mvc.perform(MockMvcRequestBuilders
                .multipart("/inspections/" + inProgressInspection.getId() + "/evidence")
                .file(jpegFile())
                .param("idempotencyKey", UUID.randomUUID().toString())
                .param("type", "PHOTO")
                .param("capturedAtDevice", Instant.now().toString())
                .header("Authorization", bearer(technicianToken))))
            .hasStatus(HttpStatus.CREATED)
            .bodyJson()
            .extractingPath("$.mimeType").asString().isEqualTo("image/jpeg");
    }

    @Test
    void uploadWithUnsupportedContentTypeReturns415() {
        MockMultipartFile textFile = new MockMultipartFile("file", "note.txt", "text/plain", "hello".getBytes());

        assertThat(mvc.perform(MockMvcRequestBuilders
                .multipart("/inspections/" + inProgressInspection.getId() + "/evidence")
                .file(textFile)
                .param("idempotencyKey", UUID.randomUUID().toString())
                .param("type", "PHOTO")
                .param("capturedAtDevice", Instant.now().toString())
                .header("Authorization", bearer(technicianToken))))
            .hasStatus(HttpStatus.UNSUPPORTED_MEDIA_TYPE);
    }

    @Test
    void resendingSameIdempotencyKeyReturns409() {
        UUID idempotencyKey = UUID.randomUUID();

        mvc.perform(MockMvcRequestBuilders
                .multipart("/inspections/" + inProgressInspection.getId() + "/evidence")
                .file(jpegFile())
                .param("idempotencyKey", idempotencyKey.toString())
                .param("type", "PHOTO")
                .param("capturedAtDevice", Instant.now().toString())
                .header("Authorization", bearer(technicianToken)));

        assertThat(mvc.perform(MockMvcRequestBuilders
                .multipart("/inspections/" + inProgressInspection.getId() + "/evidence")
                .file(jpegFile())
                .param("idempotencyKey", idempotencyKey.toString())
                .param("type", "PHOTO")
                .param("capturedAtDevice", Instant.now().toString())
                .header("Authorization", bearer(technicianToken))))
            .hasStatus(HttpStatus.CONFLICT);
    }

    @Test
    void uploadForNonExistentInspectionReturns404() {
        assertThat(mvc.perform(MockMvcRequestBuilders
                .multipart("/inspections/" + UUID.randomUUID() + "/evidence")
                .file(jpegFile())
                .param("idempotencyKey", UUID.randomUUID().toString())
                .param("type", "PHOTO")
                .param("capturedAtDevice", Instant.now().toString())
                .header("Authorization", bearer(adminToken))))
            .hasStatus(HttpStatus.NOT_FOUND);
    }

    @Test
    void anonymousCannotUploadEvidence() {
        assertThat(mvc.perform(MockMvcRequestBuilders
                .multipart("/inspections/" + inProgressInspection.getId() + "/evidence")
                .file(jpegFile())
                .param("idempotencyKey", UUID.randomUUID().toString())
                .param("type", "PHOTO")
                .param("capturedAtDevice", Instant.now().toString())))
            .hasStatus(HttpStatus.UNAUTHORIZED);
    }

    // ---- GET evidence ----

    @Test
    void adminCanListEvidenceForInspection() {
        mvc.perform(MockMvcRequestBuilders
                .multipart("/inspections/" + inProgressInspection.getId() + "/evidence")
                .file(jpegFile())
                .param("idempotencyKey", UUID.randomUUID().toString())
                .param("type", "PHOTO")
                .param("capturedAtDevice", Instant.now().toString())
                .header("Authorization", bearer(technicianToken)));

        assertThat(mvc.get().uri("/inspections/" + inProgressInspection.getId() + "/evidence")
            .header("Authorization", bearer(adminToken)))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$").asList().isNotEmpty();
    }

    @Test
    void adminCanGetEvidenceById() {
        String[] idHolder = {null};
        mvc.perform(MockMvcRequestBuilders
                .multipart("/inspections/" + inProgressInspection.getId() + "/evidence")
                .file(jpegFile())
                .param("idempotencyKey", UUID.randomUUID().toString())
                .param("type", "PHOTO")
                .param("capturedAtDevice", Instant.now().toString())
                .header("Authorization", bearer(technicianToken)));
        String id = evidenceRepository.findByInspectionId(inProgressInspection.getId()).get(0).getId().toString();
        idHolder[0] = id;

        assertThat(mvc.get().uri("/evidence/" + idHolder[0])
            .header("Authorization", bearer(adminToken)))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.id").asString().isEqualTo(idHolder[0]);
    }

    @Test
    void getNonExistentEvidenceReturns404() {
        assertThat(mvc.get().uri("/evidence/" + UUID.randomUUID())
            .header("Authorization", bearer(adminToken)))
            .hasStatus(HttpStatus.NOT_FOUND);
    }

    // ---- DELETE evidence ----

    @Test
    void technicianCanDeleteEvidence() {
        mvc.perform(MockMvcRequestBuilders
                .multipart("/inspections/" + inProgressInspection.getId() + "/evidence")
                .file(jpegFile())
                .param("idempotencyKey", UUID.randomUUID().toString())
                .param("type", "PHOTO")
                .param("capturedAtDevice", Instant.now().toString())
                .header("Authorization", bearer(technicianToken)));
        String id = evidenceRepository.findByInspectionId(inProgressInspection.getId()).get(0).getId().toString();

        assertThat(mvc.delete().uri("/evidence/" + id)
            .header("Authorization", bearer(technicianToken)))
            .hasStatus(HttpStatus.NO_CONTENT);
    }

    @Test
    void deletingEvidenceOfApprovedInspectionReturns409() {
        var evidence = evidenceRepository.save(com.codemind.fieldops.evidence.domain.Evidence.builder()
            .inspection(approvedInspection)
            .idempotencyKey(UUID.randomUUID())
            .type(com.codemind.fieldops.evidence.domain.EvidenceType.PHOTO)
            .storageKey("evidence/" + approvedInspection.getId() + "/locked.jpg")
            .mimeType("image/jpeg")
            .sizeBytes(10L)
            .capturedAtDevice(Instant.now())
            .createdBy(adminUser)
            .build());

        assertThat(mvc.delete().uri("/evidence/" + evidence.getId())
            .header("Authorization", bearer(adminToken)))
            .hasStatus(HttpStatus.CONFLICT);
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
