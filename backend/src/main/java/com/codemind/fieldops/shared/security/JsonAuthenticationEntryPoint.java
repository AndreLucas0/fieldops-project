package com.codemind.fieldops.shared.security;

import com.codemind.fieldops.shared.error.ErrorResponse;
import com.codemind.fieldops.shared.error.ErrorResponseFactory;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import tools.jackson.databind.ObjectMapper;

/**
 * Produces the project's standard Error body for authentication failures
 * detected by the security filter chain itself (missing/expired/invalid
 * bearer token) — failures that never reach a @RestController, so
 * shared/error/GlobalExceptionHandler never sees them.
 */
public class JsonAuthenticationEntryPoint implements AuthenticationEntryPoint {

	private final ObjectMapper objectMapper;

	public JsonAuthenticationEntryPoint(ObjectMapper objectMapper) {
		this.objectMapper = objectMapper;
	}

	@Override
	public void commence(HttpServletRequest request, HttpServletResponse response, AuthenticationException authException)
			throws IOException {
		ErrorResponse body = ErrorResponseFactory.create(request, HttpStatus.UNAUTHORIZED, "UNAUTHORIZED",
			"Authentication is required to access this resource");
		response.setStatus(HttpStatus.UNAUTHORIZED.value());
		response.setContentType(MediaType.APPLICATION_JSON_VALUE);
		objectMapper.writeValue(response.getWriter(), body);
	}

}
