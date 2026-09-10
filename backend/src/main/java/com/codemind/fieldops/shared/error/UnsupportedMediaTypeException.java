package com.codemind.fieldops.shared.error;

import lombok.Getter;

@Getter
public class UnsupportedMediaTypeException extends RuntimeException {

	private final String code;

	public UnsupportedMediaTypeException(String code, String message) {
		super(message);
		this.code = code;
	}

}
