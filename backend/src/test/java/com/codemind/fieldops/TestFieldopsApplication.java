package com.codemind.fieldops;

import org.springframework.boot.SpringApplication;

public class TestFieldopsApplication {

	public static void main(String[] args) {
		SpringApplication.from(FieldopsApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
