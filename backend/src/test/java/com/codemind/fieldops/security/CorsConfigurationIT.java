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
 * CORS no perfil {@code local} (desenvolvimento): qualquer origem é aceita, para o
 * web e o preview web do mobile funcionarem de qualquer IP da rede (decisão do dono
 * do projeto, 2026-10-20). Fora do perfil local vale a lista restrita de
 * {@code CORS_ALLOWED_ORIGINS} — ver {@link RestrictedCorsConfigurationIT}.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(classes = FieldopsApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("local")
class CorsConfigurationIT {

	private static final String WEB_ORIGIN = "http://localhost:4200";
	private static final String MOBILE_WEB_ORIGIN = "http://localhost:8081";
	private static final String LAN_ORIGIN = "http://192.168.0.15:8081";

	@Autowired
	private MockMvcTester mvc;

	@Test
	@DisplayName("preflight do login vindo do preview web do mobile é aceito")
	void preflightFromMobileWebOriginIsAllowed() {
		assertThat(mvc.options().uri("/auth/login")
				.header(HttpHeaders.ORIGIN, MOBILE_WEB_ORIGIN)
				.header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST")
				.header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "content-type"))
			.hasStatus(HttpStatus.OK)
			.headers()
			.hasValue(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, MOBILE_WEB_ORIGIN);
	}

	@Test
	@DisplayName("preflight de endpoint protegido com Authorization passa sem token")
	void preflightOfProtectedEndpointFromWebOriginIsAllowed() {
		assertThat(mvc.options().uri("/dashboard/summary")
				.header(HttpHeaders.ORIGIN, WEB_ORIGIN)
				.header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET")
				.header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "authorization"))
			.hasStatus(HttpStatus.OK)
			.headers()
			.hasValue(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, WEB_ORIGIN);
	}

	@Test
	@DisplayName("resposta de erro (401) também carrega o cabeçalho CORS")
	void errorResponseCarriesCorsHeader() {
		assertThat(mvc.get().uri("/dashboard/summary")
				.header(HttpHeaders.ORIGIN, MOBILE_WEB_ORIGIN))
			.hasStatus(HttpStatus.UNAUTHORIZED)
			.headers()
			.hasValue(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, MOBILE_WEB_ORIGIN);
	}

	@Test
	@DisplayName("perfil local aceita origem de qualquer IP da rede")
	void preflightFromAnyLanOriginIsAllowedInLocalProfile() {
		assertThat(mvc.options().uri("/auth/login")
				.header(HttpHeaders.ORIGIN, LAN_ORIGIN)
				.header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST")
				.header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "content-type"))
			.hasStatus(HttpStatus.OK)
			.headers()
			.hasValue(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, LAN_ORIGIN);
	}

}
