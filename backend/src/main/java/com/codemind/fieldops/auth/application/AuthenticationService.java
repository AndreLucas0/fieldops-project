package com.codemind.fieldops.auth.application;

import com.codemind.fieldops.shared.security.JwtClaims;
import com.codemind.fieldops.shared.security.JwtProperties;
import com.codemind.fieldops.user.domain.User;
import com.codemind.fieldops.user.domain.UserStatus;
import com.codemind.fieldops.user.repository.UserRepository;
import java.time.Instant;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthenticationService {

	public static final String INVALID_CREDENTIALS_MESSAGE = "Invalid email or password";

	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder;
	private final JwtEncoder jwtEncoder;
	private final JwtDecoder refreshTokenDecoder;
	private final JwtProperties jwtProperties;

	public AuthenticationService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtEncoder jwtEncoder,
			@Qualifier("refreshTokenDecoder") JwtDecoder refreshTokenDecoder, JwtProperties jwtProperties) {
		this.userRepository = userRepository;
		this.passwordEncoder = passwordEncoder;
		this.jwtEncoder = jwtEncoder;
		this.refreshTokenDecoder = refreshTokenDecoder;
		this.jwtProperties = jwtProperties;
	}

	public AuthenticationResult login(String email, String rawPassword) {
		User user = userRepository.findByEmail(email)
			.orElseThrow(() -> new BadCredentialsException(INVALID_CREDENTIALS_MESSAGE));

		if (!passwordEncoder.matches(rawPassword, user.getPasswordHash())) {
			throw new BadCredentialsException(INVALID_CREDENTIALS_MESSAGE);
		}

		requireActive(user);

		return issueTokens(user);
	}

	public AuthenticationResult refresh(String refreshToken) {
		Jwt decoded;
		try {
			decoded = refreshTokenDecoder.decode(refreshToken);
		} catch (JwtException ex) {
			throw new BadCredentialsException(INVALID_CREDENTIALS_MESSAGE, ex);
		}

		UUID userId = UUID.fromString(decoded.getSubject());
		User user = userRepository.findById(userId)
			.orElseThrow(() -> new BadCredentialsException(INVALID_CREDENTIALS_MESSAGE));

		return issueTokens(user);
	}

	@Transactional
	public void logout(UUID userId) {
		userRepository.findById(userId).ifPresent(User::invalidateSessions);
	}

	public User getCurrentUser(UUID userId) {
		return userRepository.findById(userId)
			.orElseThrow(() -> new BadCredentialsException(INVALID_CREDENTIALS_MESSAGE));
	}

	private void requireActive(User user) {
		if (user.getStatus() == UserStatus.BLOCKED) {
			throw new LockedException("User is blocked");
		}
		if (user.getStatus() != UserStatus.ACTIVE) {
			throw new DisabledException("User is inactive");
		}
	}

	private AuthenticationResult issueTokens(User user) {
		Instant now = Instant.now();
		String accessToken =
			issueToken(user, now, jwtProperties.accessTokenExpirationSeconds(), JwtClaims.TOKEN_USE_ACCESS);
		String refreshToken =
			issueToken(user, now, jwtProperties.refreshTokenExpirationSeconds(), JwtClaims.TOKEN_USE_REFRESH);
		return new AuthenticationResult(accessToken, refreshToken, jwtProperties.accessTokenExpirationSeconds(), user);
	}

	private String issueToken(User user, Instant issuedAt, long expirationSeconds, String tokenUse) {
		JwtClaimsSet claims = JwtClaimsSet.builder()
			.subject(user.getId().toString())
			.issuedAt(issuedAt)
			.expiresAt(issuedAt.plusSeconds(expirationSeconds))
			.claim(JwtClaims.TOKEN_USE, tokenUse)
			.claim(JwtClaims.ROLE, user.getRole().name())
			.claim(JwtClaims.EMAIL, user.getEmail())
			.build();
		JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
		return jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
	}

}
