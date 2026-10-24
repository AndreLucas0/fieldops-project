package com.codemind.fieldops.user.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.codemind.fieldops.shared.error.ResourceNotFoundException;
import com.codemind.fieldops.user.domain.User;
import com.codemind.fieldops.user.repository.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

class UserServiceTest {

	private UserRepository userRepository;
	private UserService userService;

	@BeforeEach
	void setUp() {
		userRepository = mock(UserRepository.class);
		userService = new UserService(userRepository, mock(PasswordEncoder.class));
	}

	@Test
	void getByEmailTrimsAndNormalizesEmailBeforeSearching() {
		User user = User.builder().email("ana@fieldops.local").build();
		when(userRepository.findByEmailIgnoreCase("ana@fieldops.local")).thenReturn(Optional.of(user));

		User result = userService.getByEmail("  ANA@FieldOps.Local  ");

		assertThat(result).isSameAs(user);
		verify(userRepository).findByEmailIgnoreCase("ana@fieldops.local");
	}

	@Test
	void getByEmailThrowsNotFoundWhenEmailDoesNotExist() {
		when(userRepository.findByEmailIgnoreCase("desconhecido@fieldops.local")).thenReturn(Optional.empty());

		assertThatThrownBy(() -> userService.getByEmail("desconhecido@fieldops.local"))
			.isInstanceOf(ResourceNotFoundException.class)
			.hasMessage("User not found");
	}
}
