package com.codemind.fieldops.shared.error;

import lombok.Getter;

@Getter
public class ResourceNotFoundException extends RuntimeException {

	private final String code;

	public ResourceNotFoundException(String code, String message) {
		super(message);
		this.code = code;
	}

}
