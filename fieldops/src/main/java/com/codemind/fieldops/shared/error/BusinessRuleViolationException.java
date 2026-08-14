package com.codemind.fieldops.shared.error;

import lombok.Getter;

@Getter
public class BusinessRuleViolationException extends RuntimeException {

	private final String code;

	public BusinessRuleViolationException(String code, String message) {
		super(message);
		this.code = code;
	}

}
