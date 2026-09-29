package com.codemind.fieldops.template.controller;

import static org.assertj.core.api.Assertions.assertThat;

import com.codemind.fieldops.FieldopsApplication;
import com.codemind.fieldops.TestcontainersConfiguration;
import com.codemind.fieldops.shared.security.JwtClaims;
import com.codemind.fieldops.template.domain.InspectionTemplate;
import com.codemind.fieldops.template.domain.TemplateStatus;
import com.codemind.fieldops.template.repository.InspectionTemplateRepository;
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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

/**
 * BF-005 — incremental section/item builder backed by a DRAFT template version
 * (api-rest.md §12.9; RN-015..RN-020; decisions.md 2026-09-29).
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(classes = FieldopsApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("local")
class TemplateBuilderControllerIT {

    private static final String SECTION_JSON = """
        {"title": "%s", "description": "desc", "displayOrder": %d}""";
    private static final String ITEM_JSON = """
        {"title": "%s", "responseType": "CONFORMITY", "required": true,
         "observationRequiredOnFailure": true, "evidenceRequiredOnFailure": false, "displayOrder": %d}""";

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private InspectionTemplateRepository templateRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtEncoder jwtEncoder;

    private String adminToken;
    private String supervisorToken;
    private String technicianToken;

    @BeforeEach
    void setUp() {
        jdbcTemplate.execute("TRUNCATE TABLE inspection_template_versions CASCADE");
        templateRepository.deleteAll();
        userRepository.deleteAll();
        adminToken = mintAccessToken(userRepository.save(newUser("Admin", "admin.bld@fieldops.local", UserRole.ADMIN)));
        supervisorToken = mintAccessToken(userRepository.save(newUser("Supervisor", "sup.bld@fieldops.local", UserRole.SUPERVISOR)));
        technicianToken = mintAccessToken(userRepository.save(newUser("Technician", "tech.bld@fieldops.local", UserRole.TECHNICIAN)));
    }

    // ── helpers ─────────────────────────────────────────────────────────────

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

    private String createTemplate(String title) {
        String[] id = {null};
        assertThat(mvc.post().uri("/inspection-templates").header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"title\":\"" + title + "\",\"category\":\"Builder\"}"))
            .hasStatus(HttpStatus.CREATED).bodyJson()
            .extractingPath("$.id").asString().satisfies(s -> id[0] = s);
        return id[0];
    }

    private String createSection(String templateId, String title, int order) {
        String[] id = {null};
        assertThat(mvc.post().uri("/inspection-templates/" + templateId + "/sections")
            .header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON).content(SECTION_JSON.formatted(title, order)))
            .hasStatus(HttpStatus.CREATED).bodyJson()
            .extractingPath("$.id").asString().satisfies(s -> id[0] = s);
        return id[0];
    }

    private String createItem(String templateId, String sectionId, String title, int order) {
        String[] id = {null};
        assertThat(mvc.post().uri("/inspection-templates/" + templateId + "/sections/" + sectionId + "/items")
            .header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON).content(ITEM_JSON.formatted(title, order)))
            .hasStatus(HttpStatus.CREATED).bodyJson()
            .extractingPath("$.id").asString().satisfies(s -> id[0] = s);
        return id[0];
    }

    private void publishDraft(String templateId) {
        assertThat(mvc.post().uri("/inspection-templates/" + templateId + "/publish")
            .header("Authorization", bearer(adminToken)))
            .hasStatus(HttpStatus.CREATED);
    }

    // ── create / list draft structure ───────────────────────────────────────

    @Test
    void adminCanCreateSectionOnDraftTemplate() {
        String templateId = createTemplate("Builder T1");

        assertThat(mvc.post().uri("/inspection-templates/" + templateId + "/sections")
            .header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON).content(SECTION_JSON.formatted("Proteções", 1)))
            .hasStatus(HttpStatus.CREATED)
            .bodyJson()
            .satisfies(json -> {
                assertThat(json).extractingPath("$.title").asString().isEqualTo("Proteções");
                assertThat(json).extractingPath("$.displayOrder").asNumber().isEqualTo(1);
                assertThat(json).extractingPath("$.templateVersionId").asString().isNotBlank();
            });
    }

    @Test
    void supervisorCanCreateSection() {
        String templateId = createTemplate("Builder T2");

        assertThat(mvc.post().uri("/inspection-templates/" + templateId + "/sections")
            .header("Authorization", bearer(supervisorToken))
            .contentType(MediaType.APPLICATION_JSON).content(SECTION_JSON.formatted("S", 1)))
            .hasStatus(HttpStatus.CREATED);
    }

    @Test
    void technicianCannotCreateSection() {
        String templateId = createTemplate("Builder T3");

        assertThat(mvc.post().uri("/inspection-templates/" + templateId + "/sections")
            .header("Authorization", bearer(technicianToken))
            .contentType(MediaType.APPLICATION_JSON).content(SECTION_JSON.formatted("S", 1)))
            .hasStatus(HttpStatus.FORBIDDEN);
    }

    @Test
    void createSectionWithoutTitleIsRejected() {
        String templateId = createTemplate("Builder T4");

        assertThat(mvc.post().uri("/inspection-templates/" + templateId + "/sections")
            .header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON).content("{\"displayOrder\": 1}"))
            .hasStatus(HttpStatus.BAD_REQUEST);
    }

    @Test
    void createSectionOnUnknownTemplateReturns404() {
        assertThat(mvc.post().uri("/inspection-templates/" + UUID.randomUUID() + "/sections")
            .header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON).content(SECTION_JSON.formatted("S", 1)))
            .hasStatus(HttpStatus.NOT_FOUND);
    }

    @Test
    void createSectionOnInactiveTemplateReturns409() {
        String templateId = createTemplate("Builder T5");
        InspectionTemplate template = templateRepository.findById(UUID.fromString(templateId)).orElseThrow();
        template.setStatus(TemplateStatus.INACTIVE);
        templateRepository.save(template);

        assertThat(mvc.post().uri("/inspection-templates/" + templateId + "/sections")
            .header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON).content(SECTION_JSON.formatted("S", 1)))
            .hasStatus(HttpStatus.CONFLICT);
    }

    @Test
    void createSectionWithDuplicateDisplayOrderReturns409() {
        String templateId = createTemplate("Builder T5b");
        createSection(templateId, "S1", 1);

        assertThat(mvc.post().uri("/inspection-templates/" + templateId + "/sections")
            .header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON).content(SECTION_JSON.formatted("S1 again", 1)))
            .hasStatus(HttpStatus.CONFLICT);
    }

    @Test
    void adminCanCreateItemInDraftSection() {
        String templateId = createTemplate("Builder T6");
        String sectionId = createSection(templateId, "S1", 1);

        assertThat(mvc.post().uri("/inspection-templates/" + templateId + "/sections/" + sectionId + "/items")
            .header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON).content(ITEM_JSON.formatted("Proteção íntegra?", 1)))
            .hasStatus(HttpStatus.CREATED)
            .bodyJson()
            .satisfies(json -> {
                assertThat(json).extractingPath("$.sectionId").asString().isEqualTo(sectionId);
                assertThat(json).extractingPath("$.responseType").asString().isEqualTo("CONFORMITY");
                assertThat(json).extractingPath("$.required").isEqualTo(true);
                assertThat(json).extractingPath("$.observationRequiredOnFailure").isEqualTo(true);
            });
    }

    @Test
    void createItemWithoutResponseTypeIsRejected() {
        String templateId = createTemplate("Builder T7");
        String sectionId = createSection(templateId, "S1", 1);

        assertThat(mvc.post().uri("/inspection-templates/" + templateId + "/sections/" + sectionId + "/items")
            .header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON).content("{\"title\": \"X\", \"displayOrder\": 1}"))
            .hasStatus(HttpStatus.BAD_REQUEST);
    }

    @Test
    void createItemInSectionOfAnotherTemplateReturns404() {
        String templateA = createTemplate("Builder A");
        String templateB = createTemplate("Builder B");
        String sectionOfA = createSection(templateA, "SA", 1);

        assertThat(mvc.post().uri("/inspection-templates/" + templateB + "/sections/" + sectionOfA + "/items")
            .header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON).content(ITEM_JSON.formatted("X", 1)))
            .hasStatus(HttpStatus.NOT_FOUND);
    }

    @Test
    void listDraftSectionsReturnsSectionsWithItems() {
        String templateId = createTemplate("Builder T8");
        String sectionId = createSection(templateId, "S1", 1);
        createItem(templateId, sectionId, "I1", 1);
        createItem(templateId, sectionId, "I2", 2);

        assertThat(mvc.get().uri("/inspection-templates/" + templateId + "/sections")
            .header("Authorization", bearer(adminToken)))
            .hasStatusOk()
            .bodyJson()
            .satisfies(json -> {
                assertThat(json).extractingPath("$").asList().hasSize(1);
                assertThat(json).extractingPath("$[0].items").asList().hasSize(2);
            });
    }

    @Test
    void listDraftSectionsWithoutDraftReturnsEmptyList() {
        String templateId = createTemplate("Builder T9");

        assertThat(mvc.get().uri("/inspection-templates/" + templateId + "/sections")
            .header("Authorization", bearer(adminToken)))
            .hasStatusOk()
            .bodyJson()
            .extractingPath("$").asList().isEmpty();
    }

    // ── update ─────────────────────────────────────────────────────────────

    @Test
    void adminCanUpdateDraftSection() {
        String templateId = createTemplate("Builder T10");
        String sectionId = createSection(templateId, "Old", 1);

        assertThat(mvc.put().uri("/inspection-templates/" + templateId + "/sections/" + sectionId)
            .header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON).content(SECTION_JSON.formatted("New", 2)))
            .hasStatusOk()
            .bodyJson()
            .satisfies(json -> {
                assertThat(json).extractingPath("$.title").asString().isEqualTo("New");
                assertThat(json).extractingPath("$.displayOrder").asNumber().isEqualTo(2);
            });
    }

    @Test
    void adminCanUpdateDraftItem() {
        String templateId = createTemplate("Builder T11");
        String sectionId = createSection(templateId, "S1", 1);
        String itemId = createItem(templateId, sectionId, "Old item", 1);

        assertThat(mvc.put().uri("/inspection-templates/" + templateId + "/items/" + itemId)
            .header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"title\": \"New item\", \"responseType\": \"BOOLEAN\", \"displayOrder\": 1}"))
            .hasStatusOk()
            .bodyJson()
            .satisfies(json -> {
                assertThat(json).extractingPath("$.title").asString().isEqualTo("New item");
                assertThat(json).extractingPath("$.responseType").asString().isEqualTo("BOOLEAN");
            });
    }

    @Test
    void updateSectionOfPublishedVersionReturns409() {
        String templateId = createTemplate("Builder T12");
        String sectionId = createSection(templateId, "S1", 1);
        createItem(templateId, sectionId, "I1", 1);
        publishDraft(templateId);

        // RN-019: a published version cannot be changed destructively
        assertThat(mvc.put().uri("/inspection-templates/" + templateId + "/sections/" + sectionId)
            .header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON).content(SECTION_JSON.formatted("Changed", 1)))
            .hasStatus(HttpStatus.CONFLICT);
    }

    @Test
    void updateItemOfPublishedVersionReturns409() {
        String templateId = createTemplate("Builder T13");
        String sectionId = createSection(templateId, "S1", 1);
        String itemId = createItem(templateId, sectionId, "I1", 1);
        publishDraft(templateId);

        assertThat(mvc.put().uri("/inspection-templates/" + templateId + "/items/" + itemId)
            .header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON).content(ITEM_JSON.formatted("Changed", 1)))
            .hasStatus(HttpStatus.CONFLICT);
    }

    // ── publish from draft ─────────────────────────────────────────────────

    @Test
    void publishWithoutBodyPromotesDraftToVersionOne() {
        String templateId = createTemplate("Builder T14");
        String sectionId = createSection(templateId, "S1", 1);
        createItem(templateId, sectionId, "I1", 1);

        assertThat(mvc.post().uri("/inspection-templates/" + templateId + "/publish")
            .header("Authorization", bearer(adminToken)))
            .hasStatus(HttpStatus.CREATED)
            .bodyJson()
            .satisfies(json -> {
                assertThat(json).extractingPath("$.versionNumber").asNumber().isEqualTo(1);
                assertThat(json).extractingPath("$.activeForNewInspections").isEqualTo(true);
                assertThat(json).extractingPath("$.publishedById").asString().isNotBlank();
                assertThat(json).extractingPath("$.sections").asList().hasSize(1);
            });

        assertThat(mvc.get().uri("/inspection-templates/" + templateId).header("Authorization", bearer(adminToken)))
            .hasStatusOk().bodyJson().extractingPath("$.status").asString().isEqualTo("ACTIVE");
        // the draft was promoted, so there is no draft structure left
        assertThat(mvc.get().uri("/inspection-templates/" + templateId + "/sections")
            .header("Authorization", bearer(adminToken)))
            .hasStatusOk().bodyJson().extractingPath("$").asList().isEmpty();
    }

    @Test
    void publishWithoutBodyAndWithoutDraftReturns422() {
        String templateId = createTemplate("Builder T15");

        assertThat(mvc.post().uri("/inspection-templates/" + templateId + "/publish")
            .header("Authorization", bearer(adminToken)))
            .hasStatus(HttpStatus.UNPROCESSABLE_ENTITY);
    }

    @Test
    void publishDraftWithSectionButNoItemsReturns422() {
        String templateId = createTemplate("Builder T16");
        createSection(templateId, "Empty", 1);

        // RN-016: at least one item is required to publish
        assertThat(mvc.post().uri("/inspection-templates/" + templateId + "/publish")
            .header("Authorization", bearer(adminToken)))
            .hasStatus(HttpStatus.UNPROCESSABLE_ENTITY);
    }

    @Test
    void draftVersionIsNotListedNorReadableAsPublishedVersion() {
        String templateId = createTemplate("Builder T17");
        String[] versionId = {null};
        assertThat(mvc.post().uri("/inspection-templates/" + templateId + "/sections")
            .header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON).content(SECTION_JSON.formatted("S1", 1)))
            .hasStatus(HttpStatus.CREATED).bodyJson()
            .extractingPath("$.templateVersionId").asString().satisfies(s -> versionId[0] = s);

        assertThat(mvc.get().uri("/inspection-templates/" + templateId + "/versions")
            .header("Authorization", bearer(adminToken)))
            .hasStatusOk().bodyJson().extractingPath("$.content").asList().isEmpty();
        assertThat(mvc.get().uri("/inspection-template-versions/" + versionId[0])
            .header("Authorization", bearer(adminToken)))
            .hasStatus(HttpStatus.NOT_FOUND);
    }

    @Test
    void draftOfTemplateDeactivatedAfterwardsCannotBeEditedNorPublished() {
        String templateId = createTemplate("Builder T19");
        String sectionId = createSection(templateId, "S1", 1);
        createItem(templateId, sectionId, "I1", 1);
        InspectionTemplate template = templateRepository.findById(UUID.fromString(templateId)).orElseThrow();
        template.setStatus(TemplateStatus.INACTIVE);
        templateRepository.save(template);

        assertThat(mvc.put().uri("/inspection-templates/" + templateId + "/sections/" + sectionId)
            .header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON).content(SECTION_JSON.formatted("Changed", 1)))
            .hasStatus(HttpStatus.CONFLICT);
        assertThat(mvc.post().uri("/inspection-templates/" + templateId + "/publish")
            .header("Authorization", bearer(adminToken)))
            .hasStatus(HttpStatus.CONFLICT);
        assertThat(mvc.get().uri("/inspection-templates/" + templateId).header("Authorization", bearer(adminToken)))
            .hasStatusOk().bodyJson().extractingPath("$.status").asString().isEqualTo("INACTIVE");
    }

    @Test
    void legacyPublishWithBodyWhileDraftIsOpenReturns409() {
        String templateId = createTemplate("Builder T20");
        createSection(templateId, "Draft S1", 1);

        // publishing a different structure would leave the open draft stale
        assertThat(mvc.post().uri("/inspection-templates/" + templateId + "/publish")
            .header("Authorization", bearer(adminToken))
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"sections": [{"title": "Other","displayOrder": 1,"items": [{"title": "I","responseType": "BOOLEAN","displayOrder": 1}]}]}"""))
            .hasStatus(HttpStatus.CONFLICT);
    }

    // ── RN-020: changing an ACTIVE template produces a new version ─────────

    @Test
    void editingActiveTemplateStartsDraftFromActiveVersionAndPublishesVersionTwo() {
        String templateId = createTemplate("Builder T18");
        String s1 = createSection(templateId, "S1", 1);
        createItem(templateId, s1, "I1", 1);
        publishDraft(templateId);

        // first builder write on an ACTIVE template copies the active structure into a new draft
        createSection(templateId, "S2", 2);

        assertThat(mvc.get().uri("/inspection-templates/" + templateId + "/sections")
            .header("Authorization", bearer(adminToken)))
            .hasStatusOk().bodyJson().extractingPath("$").asList().hasSize(2);

        assertThat(mvc.post().uri("/inspection-templates/" + templateId + "/publish")
            .header("Authorization", bearer(adminToken)))
            .hasStatus(HttpStatus.CREATED)
            .bodyJson()
            .satisfies(json -> {
                assertThat(json).extractingPath("$.versionNumber").asNumber().isEqualTo(2);
                assertThat(json).extractingPath("$.sections").asList().hasSize(2);
            });

        // version 1 is kept (RN-019) but no longer active for new inspections
        assertThat(mvc.get().uri("/inspection-templates/" + templateId + "/versions")
            .header("Authorization", bearer(adminToken)))
            .hasStatusOk()
            .bodyJson()
            .satisfies(json -> {
                assertThat(json).extractingPath("$.content").asList().hasSize(2);
                assertThat(json).extractingPath("$.content[1].versionNumber").asNumber().isEqualTo(1);
                assertThat(json).extractingPath("$.content[1].activeForNewInspections").isEqualTo(false);
                assertThat(json).extractingPath("$.content[1].sections").asList().hasSize(1);
            });
    }

}
