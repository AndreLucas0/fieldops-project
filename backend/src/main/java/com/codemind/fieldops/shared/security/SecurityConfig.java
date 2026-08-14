package com.codemind.fieldops.shared.security;

import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.web.SecurityFilterChain;
import tools.jackson.databind.ObjectMapper;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

	@Bean
	SecurityFilterChain securityFilterChain(HttpSecurity http, JwtDecoder accessTokenDecoder,
			Converter<Jwt, AbstractAuthenticationToken> jwtAuthenticationConverter,
			JsonAuthenticationEntryPoint authenticationEntryPoint, JsonAccessDeniedHandler accessDeniedHandler)
			throws Exception {
		http
			.csrf(AbstractHttpConfigurer::disable)
			.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
			.authorizeHttpRequests(authorize -> authorize
				.requestMatchers("/auth/login", "/auth/refresh").permitAll()
				.anyRequest().authenticated())
			.exceptionHandling(handling -> handling
				.authenticationEntryPoint(authenticationEntryPoint)
				.accessDeniedHandler(accessDeniedHandler))
			.oauth2ResourceServer(oauth2 -> oauth2.jwt(
				jwt -> jwt.decoder(accessTokenDecoder).jwtAuthenticationConverter(jwtAuthenticationConverter)));
		return http.build();
	}

	/**
	 * Maps the custom "role" claim (shared/security/JwtClaims) to a single
	 * Spring Security authority — the default JwtAuthenticationConverter only
	 * reads OAuth2 "scope"/"scp" claims, which this token never carries.
	 */
	@Bean
	Converter<Jwt, AbstractAuthenticationToken> jwtAuthenticationConverter() {
		return (Jwt jwt) -> {
			String role = jwt.getClaimAsString(JwtClaims.ROLE);
			List<GrantedAuthority> authorities =
				role == null ? List.of() : List.of(new SimpleGrantedAuthority("ROLE_" + role));
			return new JwtAuthenticationToken(jwt, authorities);
		};
	}

	@Bean
	PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder();
	}

	@Bean
	JsonAuthenticationEntryPoint jsonAuthenticationEntryPoint(ObjectMapper objectMapper) {
		return new JsonAuthenticationEntryPoint(objectMapper);
	}

	@Bean
	JsonAccessDeniedHandler jsonAccessDeniedHandler(ObjectMapper objectMapper) {
		return new JsonAccessDeniedHandler(objectMapper);
	}

}
