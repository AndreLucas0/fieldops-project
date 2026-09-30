package com.codemind.fieldops.shared.error;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Objects;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@RestControllerAdvice
public class GlobalExceptionHandler {

	private static final Logger LOG = LoggerFactory.getLogger(GlobalExceptionHandler.class);

	@ExceptionHandler(MethodArgumentNotValidException.class)
	ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest request) {
		List<FieldError> fieldErrors = ex.getBindingResult().getFieldErrors().stream()
			.map(fe -> new FieldError(fe.getField(), fe.getDefaultMessage()))
			.toList();
		ErrorResponse body = ErrorResponseFactory.create(request, HttpStatus.BAD_REQUEST, "VALIDATION_ERROR",
			"Request payload failed validation", fieldErrors);
		return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
	}

	@ExceptionHandler(HandlerMethodValidationException.class)
	ResponseEntity<ErrorResponse> handleMethodValidation(HandlerMethodValidationException ex, HttpServletRequest request) {
		// Constraints on controller parameters (e.g. @Size on a @PathVariable) — built-in MVC method validation
		List<FieldError> fieldErrors = ex.getParameterValidationResults().stream()
			.flatMap(result -> result.getResolvableErrors().stream()
				.map(error -> new FieldError(
					Objects.requireNonNullElse(result.getMethodParameter().getParameterName(), "parameter"),
					error.getDefaultMessage())))
			.toList();
		ErrorResponse body = ErrorResponseFactory.create(request, HttpStatus.BAD_REQUEST, "VALIDATION_ERROR",
			"Request parameters failed validation", fieldErrors);
		return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
	}

	@ExceptionHandler(HttpMessageNotReadableException.class)
	ResponseEntity<ErrorResponse> handleUnreadableBody(HttpMessageNotReadableException ex, HttpServletRequest request) {
		// Parser details are not exposed (api-rest.md §12.3: 400 "requisição malformada")
		LOG.debug("Malformed request body on {} {}", request.getMethod(), request.getRequestURI());
		ErrorResponse body = ErrorResponseFactory.create(request, HttpStatus.BAD_REQUEST, "MALFORMED_REQUEST",
			"Request body is missing or is not valid JSON");
		return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
	}

	@ExceptionHandler(MethodArgumentTypeMismatchException.class)
	ResponseEntity<ErrorResponse> handleTypeMismatch(MethodArgumentTypeMismatchException ex, HttpServletRequest request) {
		LOG.debug("Invalid parameter '{}' on {} {}", ex.getName(), request.getMethod(), request.getRequestURI());
		ErrorResponse body = ErrorResponseFactory.create(request, HttpStatus.BAD_REQUEST, "INVALID_PARAMETER",
			"Request parameter has an invalid value", List.of(new FieldError(ex.getName(), "Invalid value")));
		return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
	}

	@ExceptionHandler(NoResourceFoundException.class)
	ResponseEntity<ErrorResponse> handleNoRoute(NoResourceFoundException ex, HttpServletRequest request) {
		LOG.debug("No route for {} {}", request.getMethod(), request.getRequestURI());
		ErrorResponse body = ErrorResponseFactory.create(request, HttpStatus.NOT_FOUND, "ROUTE_NOT_FOUND",
			"No endpoint matches this route");
		return ResponseEntity.status(HttpStatus.NOT_FOUND).body(body);
	}

	@ExceptionHandler(AuthenticationException.class)
	ResponseEntity<ErrorResponse> handleAuthentication(AuthenticationException ex, HttpServletRequest request) {
		ErrorResponse body = ErrorResponseFactory.create(request, HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", ex.getMessage());
		return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(body);
	}

	@ExceptionHandler(AccessDeniedException.class)
	ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex, HttpServletRequest request) {
		ErrorResponse body = ErrorResponseFactory.create(request, HttpStatus.FORBIDDEN, "FORBIDDEN",
			"You do not have permission to perform this operation");
		return ResponseEntity.status(HttpStatus.FORBIDDEN).body(body);
	}

	@ExceptionHandler(ResourceNotFoundException.class)
	ResponseEntity<ErrorResponse> handleNotFound(ResourceNotFoundException ex, HttpServletRequest request) {
		ErrorResponse body = ErrorResponseFactory.create(request, HttpStatus.NOT_FOUND, ex.getCode(), ex.getMessage());
		return ResponseEntity.status(HttpStatus.NOT_FOUND).body(body);
	}

	@ExceptionHandler(ResourceConflictException.class)
	ResponseEntity<ErrorResponse> handleConflict(ResourceConflictException ex, HttpServletRequest request) {
		ErrorResponse body = ErrorResponseFactory.create(request, HttpStatus.CONFLICT, ex.getCode(), ex.getMessage());
		return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
	}

	@ExceptionHandler(BusinessRuleViolationException.class)
	ResponseEntity<ErrorResponse> handleBusinessRule(BusinessRuleViolationException ex, HttpServletRequest request) {
		ErrorResponse body =
			ErrorResponseFactory.create(request, HttpStatus.UNPROCESSABLE_ENTITY, ex.getCode(), ex.getMessage());
		return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(body);
	}

	@ExceptionHandler(PayloadTooLargeException.class)
	ResponseEntity<ErrorResponse> handlePayloadTooLarge(PayloadTooLargeException ex, HttpServletRequest request) {
		ErrorResponse body =
			ErrorResponseFactory.create(request, HttpStatus.PAYLOAD_TOO_LARGE, ex.getCode(), ex.getMessage());
		return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(body);
	}

	@ExceptionHandler(MaxUploadSizeExceededException.class)
	ResponseEntity<ErrorResponse> handleMaxUploadSizeExceeded(MaxUploadSizeExceededException ex,
			HttpServletRequest request) {
		ErrorResponse body = ErrorResponseFactory.create(request, HttpStatus.PAYLOAD_TOO_LARGE,
			"EVIDENCE_UPLOAD_TOO_LARGE", "Uploaded file exceeds the maximum allowed size");
		return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(body);
	}

	@ExceptionHandler(UnsupportedMediaTypeException.class)
	ResponseEntity<ErrorResponse> handleUnsupportedMediaType(UnsupportedMediaTypeException ex,
			HttpServletRequest request) {
		ErrorResponse body =
			ErrorResponseFactory.create(request, HttpStatus.UNSUPPORTED_MEDIA_TYPE, ex.getCode(), ex.getMessage());
		return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE).body(body);
	}

	@ExceptionHandler(OptimisticLockingFailureException.class)
	ResponseEntity<ErrorResponse> handleOptimisticLocking(OptimisticLockingFailureException ex,
			HttpServletRequest request) {
		ErrorResponse body = ErrorResponseFactory.create(request, HttpStatus.CONFLICT, "OPTIMISTIC_LOCK_CONFLICT",
			"The resource was modified by another request; reload and try again");
		return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
	}

	@ExceptionHandler(Exception.class)
	ResponseEntity<ErrorResponse> handleUnexpected(Exception ex, HttpServletRequest request) {
		LOG.error("Unhandled exception while processing {} {}", request.getMethod(), request.getRequestURI(), ex);
		ErrorResponse body = ErrorResponseFactory.create(request, HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR",
			"An unexpected error occurred");
		return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
	}

}
