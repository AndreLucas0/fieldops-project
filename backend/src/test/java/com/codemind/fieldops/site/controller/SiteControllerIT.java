package com.codemind.fieldops.site.controller;

import static org.assertj.core.api.Assertions.assertThat;

import com.codemind.fieldops.FieldopsApplication;
import com.codemind.fieldops.TestcontainersConfiguration;
import com.codemind.fieldops.client.domain.Client;
import com.codemind.fieldops.client.domain.ClientStatus;
import com.codemind.fieldops.client.repository.ClientRepository;
import com.codemind.fieldops.equipment.domain.Equipment;
import com.codemind.fieldops.equipment.domain.EquipmentStatus;
import com.codemind.fieldops.equipment.repository.EquipmentRepository;
import com.codemind.fieldops.shared.security.JwtClaims;
import com.codemind.fieldops.site.domain.InspectionSite;
import com.codemind.fieldops.site.domain.SiteStatus;
import com.codemind.fieldops.site.repository.InspectionSiteRepository;
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
import org.springframework.jdbc.core.JdbcTemplate;
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
class SiteControllerIT {

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private InspectionSiteRepository siteRepository;

    @Autowired
    private ClientRepository clientRepository;

    @Autowired
    private EquipmentRepository equipmentRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtEncoder jwtEncoder;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private User adminUser;
    private User supervisorUser;
    private User technicianUser;
    private String adminToken;
    private String supervisorToken;
    private String technicianToken;
    private Client testClient;

    @BeforeEach
    void setUp() {
        // TRUNCATE ... CASCADE also clears every table referencing users (templates,
        // inspections and their children) left behind by other IT classes, preventing
        // FK violations below when the full suite runs (ITORDER-001).
        jdbcTemplate.execute("TRUNCATE TABLE users CASCADE");
        equipmentRepository.deleteAll();
        siteRepository.deleteAll();
        clientRepository.deleteAll();
        adminUser = userRepository.save(newUser("Admin", "admin.site@fieldops.local", UserRole.ADMIN));
        supervisorUser = userRepository.save(newUser("Supervisor", "supervisor.site@fieldops.local", UserRole.SUPERVISOR));
        technicianUser = userRepository.save(newUser("Technician", "tech.site@fieldops.local", UserRole.TECHNICIAN));
        adminToken = mintAccessToken(adminUser);
        supervisorToken = mintAccessToken(supervisorUser);
        technicianToken = mintAccessToken(technicianUser);
        testClient = clientRepository.save(Client.builder().name("Test Client").status(ClientStatus.ACTIVE).build());
    }

    @AfterEach
    void tearDown() {
        // Do not leave equipment/sites behind for IT classes that only delete down to sites (ITORDER-001).
        equipmentRepository.deleteAll();
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

    private InspectionSite saveSite(String name, Client client) {
        return siteRepository.save(InspectionSite.builder()
            .client(client)
            .name(name)
            .status(SiteStatus.ACTIVE)
            .build());
    }

    @Test
    void adminCanCreateSite() {
        String payload = """
            {"clientId":"%s","name":"Main Plant","city":"São Paulo","state":"SP"}"""
            .formatted(testClient.getId());

        assertThat(mvc.post().uri("/sites").header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON).content(payload))
            .hasStatus(HttpStatus.CREATED)
            .bodyJson()
            .extractingPath("$.name").asString().isEqualTo("Main Plant");
    }

    @Test
    void supervisorCanCreateSite() {
        String payload = """
            {"clientId":"%s","name":"Supervisor Site"}"""
            .formatted(testClient.getId());

        assertThat(mvc.post().uri("/sites").header("Authorization", bearer(supervisorToken))
            .contentType(MediaType.APPLICATION_JSON).content(payload))
            .hasStatus(HttpStatus.CREATED);
    }

    @Test
    void technicianCannotCreateSite() {
        String payload = """
            {"clientId":"%s","name":"Tech Site"}"""
            .formatted(testClient.getId());

        assertThat(mvc.post().uri("/sites").header("Authorization", bearer(technicianToken))
            .contentType(MediaType.APPLICATION_JSON).content(payload))
            .hasStatus(HttpStatus.FORBIDDEN);
    }

    @Test
    void createSiteWithNonExistentClientReturnsNotFound() {
        String payload = """
            {"clientId":"%s","name":"Orphan Site"}"""
            .formatted(UUID.randomUUID());

        assertThat(mvc.post().uri("/sites").header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON).content(payload))
            .hasStatus(HttpStatus.NOT_FOUND);
    }

    @Test
    void createSiteWithBlankNameIsRejected() {
        String payload = """
            {"clientId":"%s","name":""}"""
            .formatted(testClient.getId());

        assertThat(mvc.post().uri("/sites").header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON).content(payload))
            .hasStatus(HttpStatus.BAD_REQUEST);
    }

    @Test
    void adminCanListSites() {
        saveSite("Site A", testClient);
        saveSite("Site B", testClient);

        assertThat(mvc.get().uri("/sites").header("Authorization", bearer(adminToken)))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.content").asList().hasSizeGreaterThanOrEqualTo(2);
    }

    @Test
    void adminCanFilterSitesByClient() {
        saveSite("Site for Client", testClient);
        Client otherClient = clientRepository.save(Client.builder().name("Other Client").status(ClientStatus.ACTIVE).build());
        saveSite("Site for Other", otherClient);

        assertThat(mvc.get().uri("/sites?clientId=" + testClient.getId()).header("Authorization", bearer(adminToken)))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.content[*].clientId").asList().containsOnly(testClient.getId().toString());
    }

    @Test
    void adminCanGetSiteById() {
        InspectionSite site = saveSite("Get Site", testClient);

        assertThat(mvc.get().uri("/sites/" + site.getId()).header("Authorization", bearer(adminToken)))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.name").asString().isEqualTo("Get Site");
    }

    @Test
    void getUnknownSiteReturnsNotFound() {
        assertThat(mvc.get().uri("/sites/" + UUID.randomUUID()).header("Authorization", bearer(adminToken)))
            .hasStatus(HttpStatus.NOT_FOUND);
    }

    @Test
    void adminCanUpdateSite() {
        InspectionSite site = saveSite("Old Site Name", testClient);

        String payload = """
            {"name":"New Site Name","city":"Campinas"}""";

        assertThat(mvc.put().uri("/sites/" + site.getId()).header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON).content(payload))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.name").asString().isEqualTo("New Site Name");
    }

    @Test
    void adminCanUpdateSiteStatus() {
        InspectionSite site = saveSite("Status Site", testClient);

        String payload = """
            {"status":"INACTIVE"}""";

        assertThat(mvc.patch().uri("/sites/" + site.getId() + "/status")
            .header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON).content(payload))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.status").asString().isEqualTo("INACTIVE");
    }

    @Test
    void siteResponseIncludesClientId() {
        InspectionSite site = saveSite("Client ID Site", testClient);

        assertThat(mvc.get().uri("/sites/" + site.getId()).header("Authorization", bearer(adminToken)))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.clientId").asString().isEqualTo(testClient.getId().toString());
    }

    @Test
    void anonymousCannotAccessSites() {
        assertThat(mvc.get().uri("/sites"))
            .hasStatus(HttpStatus.UNAUTHORIZED);
    }

    private Equipment saveEquipment(String name, String qrCode, InspectionSite site) {
        return equipmentRepository.save(Equipment.builder()
            .site(site)
            .name(name)
            .qrCode(qrCode)
            .status(EquipmentStatus.ACTIVE)
            .build());
    }

    @Test
    void adminCanListEquipmentBySite() {
        InspectionSite site = saveSite("Equipment Site", testClient);
        saveEquipment("Pump A", "QR-PA-001", site);
        saveEquipment("Pump B", "QR-PB-001", site);

        assertThat(mvc.get().uri("/sites/" + site.getId() + "/equipment")
            .header("Authorization", bearer(adminToken)))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.content").asList().hasSize(2);
    }

    @Test
    void technicianCannotListSiteEquipment() {
        InspectionSite site = saveSite("Forbidden Site", testClient);

        assertThat(mvc.get().uri("/sites/" + site.getId() + "/equipment")
            .header("Authorization", bearer(technicianToken)))
            .hasStatus(HttpStatus.FORBIDDEN);
    }

    @Test
    void listEquipmentForNonExistentSiteReturnsNotFound() {
        assertThat(mvc.get().uri("/sites/" + UUID.randomUUID() + "/equipment")
            .header("Authorization", bearer(adminToken)))
            .hasStatus(HttpStatus.NOT_FOUND);
    }

    @Test
    void listSiteEquipmentOnlyReturnsEquipmentForThatSite() {
        InspectionSite siteA = saveSite("Site Alpha", testClient);
        Client clientB = clientRepository.save(
            Client.builder().name("Client Beta").status(ClientStatus.ACTIVE).build());
        InspectionSite siteB = siteRepository.save(
            InspectionSite.builder().client(clientB).name("Site Beta").status(SiteStatus.ACTIVE).build());
        saveEquipment("Equipment Alpha", "QR-EQA-001", siteA);
        saveEquipment("Equipment Beta", "QR-EQB-001", siteB);

        assertThat(mvc.get().uri("/sites/" + siteA.getId() + "/equipment")
            .header("Authorization", bearer(adminToken)))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.content[*].siteId").asList()
            .containsOnly(siteA.getId().toString());
    }

}
