package com.codemind.fieldops.shared.security;

import com.codemind.fieldops.shared.error.ErrorResponse;
import com.codemind.fieldops.shared.error.ErrorResponseFactory;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import tools.jackson.databind.ObjectMapper;

/**
 * Filter-chain-level counterpart to shared/error/GlobalExceptionHandler's
 * AccessDeniedException handling — used when the denial happens before the
 * request reaches a @RestController.
 */
public class JsonAccessDeniedHandler implements AccessDeniedHandler {

	private final ObjectMapper objectMapper;

	public JsonAccessDeniedHandler(ObjectMapper objectMapper) {
		this.objectMapper = objectMapper;
	}

	@Override
	public void handle(HttpServletRequest request, HttpServletResponse response, AccessDeniedException accessDeniedException)
			throws IOException {
		ErrorResponse body = ErrorResponseFactory.create(request, HttpStatus.FORBIDDEN, "FORBIDDEN",
			"You do not have permission to perform this operation");
		response.setStatus(HttpStatus.FORBIDDEN.value());
		response.setContentType(MediaType.APPLICATION_JSON_VALUE);
		objectMapper.writeValue(response.getWriter(), body);
	}

}
