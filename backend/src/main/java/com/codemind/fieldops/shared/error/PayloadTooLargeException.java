package com.codemind.fieldops.shared.error;

import lombok.Getter;

@Getter
public class PayloadTooLargeException extends RuntimeException {

	private final String code;

	public PayloadTooLargeException(String code, String message) {
		super(message);
		this.code = code;
	}

}
