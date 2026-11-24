package com.codemind.fieldops.shared.security;

import com.codemind.fieldops.user.repository.UserRepository;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import com.nimbusds.jose.proc.SecurityContext;
import java.nio.charset.StandardCharsets;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

@Configuration
@EnableConfigurationProperties(JwtProperties.class)
public class JwtConfig {

	@Bean
	SecretKey jwtSigningKey(JwtProperties properties) {
		String configuredSecret = properties.secret();
		byte[] secret = configuredSecret == null ? new byte[0] : configuredSecret.getBytes(StandardCharsets.UTF_8);
		if (secret.length < 32 || configuredSecret.isBlank()) {
			throw new IllegalArgumentException("JWT signing secret must contain at least 32 bytes");
		}
		return new SecretKeySpec(secret, "HmacSHA256");
	}

	@Bean
	JwtEncoder jwtEncoder(SecretKey jwtSigningKey) {
		var jwkSource = new ImmutableSecret<SecurityContext>(jwtSigningKey);
		return new NimbusJwtEncoder(jwkSource);
	}

	@Bean
	JwtDecoder accessTokenDecoder(SecretKey jwtSigningKey, UserRepository userRepository) {
		NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(jwtSigningKey).macAlgorithm(MacAlgorithm.HS256).build();
		decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
			JwtValidators.createDefault(),
			new TokenUseValidator(JwtClaims.TOKEN_USE_ACCESS),
			new SessionTokenValidator(userRepository)));
		return decoder;
	}

	@Bean
	JwtDecoder refreshTokenDecoder(SecretKey jwtSigningKey, UserRepository userRepository) {
		NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(jwtSigningKey).macAlgorithm(MacAlgorithm.HS256).build();
		decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
			JwtValidators.createDefault(),
			new TokenUseValidator(JwtClaims.TOKEN_USE_REFRESH),
			new SessionTokenValidator(userRepository)));
		return decoder;
	}

}
