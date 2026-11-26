package com.codemind.fieldops.security;

import static org.assertj.core.api.Assertions.assertThat;

import com.codemind.fieldops.FieldopsApplication;
import com.codemind.fieldops.TestcontainersConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@Import(TestcontainersConfiguration.class)
@SpringBootTest(classes = FieldopsApplication.class, properties = {
	"JWT_SECRET=fieldops-production-test-signing-key-only",
	"CORS_ALLOWED_ORIGINS=https://admin.fieldops.example",
	"EVIDENCE_STORAGE_REGION=us-east-1",
	"EVIDENCE_STORAGE_BUCKET=fieldops-evidence-test"
})
@AutoConfigureMockMvc
@ActiveProfiles("prod")
class ProductionProfileIT {

	@Autowired
	private MockMvcTester mvc;

	@Test
	void healthIsAccessibleWithoutCredentialsAndHidesDetails() {
		assertThat(mvc.get().uri("/actuator/health"))
			.hasStatusOk()
			.bodyJson()
			.doesNotHavePath("$.components")
			.doesNotHavePath("$.details")
			.extractingPath("$.status").asString().isEqualTo("UP");
	}

	@Test
	void componentHealthAndBusinessEndpointsRequireAuthentication() {
		assertThat(mvc.get().uri("/actuator/health/db")).hasStatus(HttpStatus.UNAUTHORIZED);
		assertThat(mvc.get().uri("/clients")).hasStatus(HttpStatus.UNAUTHORIZED);
	}

	@Test
	void generatedApiDocsAreDisabled() {
		assertThat(mvc.get().uri("/v3/api-docs")).hasStatus(HttpStatus.NOT_FOUND);
	}

	@Test
	void corsAllowsTheConfiguredAdminOrigin() {
		assertThat(mvc.options().uri("/auth/login")
				.header(HttpHeaders.ORIGIN, "https://admin.fieldops.example")
				.header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST"))
			.hasStatusOk()
			.headers().hasValue(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "https://admin.fieldops.example");
	}

	@Test
	void corsRejectsAnUnconfiguredOrigin() {
		assertThat(mvc.options().uri("/auth/login")
				.header(HttpHeaders.ORIGIN, "https://unknown.fieldops.example")
				.header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST"))
			.hasStatus(HttpStatus.FORBIDDEN)
			.headers().doesNotContainHeader(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN);
	}

}
