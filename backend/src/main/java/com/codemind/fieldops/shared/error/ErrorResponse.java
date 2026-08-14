package com.codemind.fieldops.shared.error;

import java.time.Instant;
import java.util.List;

/**
 * Standardized error body (docs/api-rest.md §12.2, openapi.yaml Error schema).
 * requestId is left null until shared/web's CorrelationIdFilter exists.
 */
public record ErrorResponse(
	Instant timestamp,
	int status,
	String code,
	String message,
	String path,
	String requestId,
	List<FieldError> fieldErrors) {
}
