package com.codemind.fieldops.client.controller;

import static org.assertj.core.api.Assertions.assertThat;

import com.codemind.fieldops.FieldopsApplication;
import com.codemind.fieldops.TestcontainersConfiguration;
import com.codemind.fieldops.client.domain.Client;
import com.codemind.fieldops.client.domain.ClientStatus;
import com.codemind.fieldops.client.repository.ClientRepository;
import com.codemind.fieldops.shared.security.JwtClaims;
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

@Import(TestcontainersConfiguration.class)
@SpringBootTest(classes = FieldopsApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("local")
class ClientControllerIT {

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private ClientRepository clientRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtEncoder jwtEncoder;

    private User adminUser;
    private User supervisorUser;
    private User technicianUser;
    private String adminToken;
    private String supervisorToken;
    private String technicianToken;

    @BeforeEach
    void setUp() {
        clientRepository.deleteAll();
        userRepository.deleteAll();
        adminUser = userRepository.save(newUser("Admin User", "admin.client@fieldops.local", UserRole.ADMIN));
        supervisorUser = userRepository.save(newUser("Supervisor User", "supervisor.client@fieldops.local", UserRole.SUPERVISOR));
        technicianUser = userRepository.save(newUser("Tech User", "tech.client@fieldops.local", UserRole.TECHNICIAN));
        adminToken = mintAccessToken(adminUser);
        supervisorToken = mintAccessToken(supervisorUser);
        technicianToken = mintAccessToken(technicianUser);
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

    private Client saveClient(String name) {
        return clientRepository.save(Client.builder()
            .name(name)
            .status(ClientStatus.ACTIVE)
            .build());
    }

    @Test
    void adminCanCreateClient() {
        String payload = """
            {"name":"Acme Corp","email":"acme@example.com","phone":"+55 11 9999-0001"}""";

        assertThat(mvc.post().uri("/clients").header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON).content(payload))
            .hasStatus(HttpStatus.CREATED)
            .bodyJson()
            .extractingPath("$.name").asString().isEqualTo("Acme Corp");
    }

    @Test
    void supervisorCanCreateClient() {
        String payload = """
            {"name":"Beta Corp"}""";

        assertThat(mvc.post().uri("/clients").header("Authorization", bearer(supervisorToken))
            .contentType(MediaType.APPLICATION_JSON).content(payload))
            .hasStatus(HttpStatus.CREATED);
    }

    @Test
    void technicianCannotCreateClient() {
        String payload = """
            {"name":"Gamma Corp"}""";

        assertThat(mvc.post().uri("/clients").header("Authorization", bearer(technicianToken))
            .contentType(MediaType.APPLICATION_JSON).content(payload))
            .hasStatus(HttpStatus.FORBIDDEN);
    }

    @Test
    void anonymousCannotAccessClients() {
        assertThat(mvc.get().uri("/clients"))
            .hasStatus(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void createClientWithBlankNameIsRejected() {
        String payload = """
            {"name":""}""";

        assertThat(mvc.post().uri("/clients").header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON).content(payload))
            .hasStatus(HttpStatus.BAD_REQUEST);
    }

    @Test
    void adminCanListClients() {
        saveClient("Client A");
        saveClient("Client B");

        assertThat(mvc.get().uri("/clients").header("Authorization", bearer(adminToken)))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.content").asList().hasSizeGreaterThanOrEqualTo(2);
    }

    @Test
    void adminCanGetClientById() {
        Client client = saveClient("Test Client");

        assertThat(mvc.get().uri("/clients/" + client.getId()).header("Authorization", bearer(adminToken)))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.name").asString().isEqualTo("Test Client");
    }

    @Test
    void getUnknownClientReturnsNotFound() {
        assertThat(mvc.get().uri("/clients/" + UUID.randomUUID()).header("Authorization", bearer(adminToken)))
            .hasStatus(HttpStatus.NOT_FOUND);
    }

    @Test
    void adminCanUpdateClient() {
        Client client = saveClient("Old Name");

        String payload = """
            {"name":"New Name","email":"new@example.com"}""";

        assertThat(mvc.put().uri("/clients/" + client.getId()).header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON).content(payload))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.name").asString().isEqualTo("New Name");
    }

    @Test
    void adminCanUpdateClientStatus() {
        Client client = saveClient("Status Client");

        String payload = """
            {"status":"INACTIVE"}""";

        assertThat(mvc.patch().uri("/clients/" + client.getId() + "/status")
            .header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON).content(payload))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.status").asString().isEqualTo("INACTIVE");
    }

    @Test
    void adminCanFilterClientsByStatus() {
        saveClient("Active Client");
        Client inactiveClient = saveClient("Inactive Client");
        inactiveClient.setStatus(ClientStatus.INACTIVE);
        clientRepository.save(inactiveClient);

        assertThat(mvc.get().uri("/clients?status=ACTIVE").header("Authorization", bearer(adminToken)))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$.content[*].status").asList().containsOnly("ACTIVE");
    }

    @Test
    void clientResponseDoesNotExposeInternalFields() {
        Client client = saveClient("Exposed Fields Test");

        var result = mvc.get().uri("/clients/" + client.getId()).header("Authorization", bearer(adminToken)).exchange();

        assertThat(result).bodyJson().hasPath("$.id");
        assertThat(result).bodyJson().hasPath("$.name");
        assertThat(result).bodyJson().hasPath("$.status");
    }

}
