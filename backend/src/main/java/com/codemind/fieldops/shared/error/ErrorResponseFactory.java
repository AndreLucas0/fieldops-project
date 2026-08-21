package com.codemind.fieldops.shared.error;

import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.List;
import org.springframework.http.HttpStatus;

public final class ErrorResponseFactory {

	private ErrorResponseFactory() {
	}

	public static ErrorResponse create(HttpServletRequest request, HttpStatus status, String code, String message) {
		return create(request, status, code, message, List.of());
	}

	public static ErrorResponse create(HttpServletRequest request, HttpStatus status, String code, String message,
			List<FieldError> fieldErrors) {
		return new ErrorResponse(Instant.now(), status.value(), code, message, request.getRequestURI(), null, fieldErrors);
	}

}
