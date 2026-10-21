package com.codemind.fieldops.security;

import static org.assertj.core.api.Assertions.assertThat;

import com.codemind.fieldops.FieldopsApplication;
import com.codemind.fieldops.TestcontainersConfiguration;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

/**
 * CORS com lista explícita de origens (o que vale fora do perfil local —
 * arquitetura.md §11.10, plano-implementacao-backend.md §5.5): só as origens
 * listadas em {@code CORS_ALLOWED_ORIGINS} são aceitas.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(classes = FieldopsApplication.class,
		properties = "fieldops.security.cors.allowed-origins=https://admin.fieldops.example")
@AutoConfigureMockMvc
@ActiveProfiles("local")
class RestrictedCorsConfigurationIT {

	private static final String LISTED_ORIGIN = "https://admin.fieldops.example";
	private static final String UNKNOWN_ORIGIN = "http://evil.example.com";

	@Autowired
	private MockMvcTester mvc;

	@Test
	@DisplayName("origem listada é aceita")
	void listedOriginIsAllowed() {
		assertThat(mvc.options().uri("/auth/login")
				.header(HttpHeaders.ORIGIN, LISTED_ORIGIN)
				.header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST"))
			.hasStatus(HttpStatus.OK)
			.headers()
			.hasValue(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, LISTED_ORIGIN);
	}

	@Test
	@DisplayName("preflight de origem não listada é recusado")
	void unknownOriginIsRejected() {
		assertThat(mvc.options().uri("/auth/login")
				.header(HttpHeaders.ORIGIN, UNKNOWN_ORIGIN)
				.header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST"))
			.hasStatus(HttpStatus.FORBIDDEN)
			.headers()
			.doesNotContainHeader(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN);
	}

}
