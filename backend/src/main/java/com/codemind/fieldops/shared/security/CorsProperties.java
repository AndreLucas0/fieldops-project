package com.codemind.fieldops.shared.security;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Origens autorizadas a chamar a API pelo navegador (arquitetura.md §11.10,
 * plano-implementacao-backend.md §5.5). Alimentada por
 * {@code CORS_ALLOWED_ORIGINS}, lista separada por vírgula.
 */
@ConfigurationProperties(prefix = "fieldops.security.cors")
public record CorsProperties(List<String> allowedOrigins) {
}
