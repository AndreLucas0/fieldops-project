package com.codemind.fieldops.user.dto;

import static org.assertj.core.api.Assertions.assertThat;

import com.codemind.fieldops.user.domain.UserRole;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

class UserRequestValidationTest {

	private static ValidatorFactory validatorFactory;
	private static Validator validator;

	@BeforeAll
	static void setUpValidator() {
		validatorFactory = Validation.buildDefaultValidatorFactory();
		validator = validatorFactory.getValidator();
	}

	@AfterAll
	static void closeValidatorFactory() {
		validatorFactory.close();
	}

	@Test
	void rejectsPhoneLongerThanDatabaseColumnForUpdateRequest() {
		UserUpdateRequest request =
			new UserUpdateRequest("Carlos", "carlos@fieldops.local", UserRole.TECHNICIAN, "1".repeat(31));

		assertThat(validator.validate(request))
			.extracting(violation -> violation.getPropertyPath().toString())
			.containsExactly("phone");
	}

	@Test
	void rejectsPhoneLongerThanDatabaseColumnForCreateRequest() {
		UserCreateRequest request = new UserCreateRequest(
			"Carlos", "carlos@fieldops.local", "SenhaSegura1!", UserRole.TECHNICIAN, "1".repeat(31));

		assertThat(validator.validate(request))
			.extracting(violation -> violation.getPropertyPath().toString())
			.containsExactly("phone");
	}

	@Test
	void acceptsPhoneAtMaximumLengthForUpdateRequest() {
		UserUpdateRequest request =
			new UserUpdateRequest("Carlos", "carlos@fieldops.local", UserRole.TECHNICIAN, "1".repeat(30));

		assertThat(validator.validate(request)).isEmpty();
	}

}
