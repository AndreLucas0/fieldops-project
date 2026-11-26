package com.codemind.fieldops.shared.security;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

class JwtConfigTest {

    private final JwtConfig config = new JwtConfig();

    @Test
    void rejectsMissingBlankAndShortSigningSecrets() {
        for (String secret : new String[] {null, "", " ".repeat(32), "a".repeat(31)}) {
            assertThatIllegalArgumentException()
                .isThrownBy(() -> config.jwtSigningKey(new JwtProperties(secret, 900, 604800)));
        }
    }

    @Test
    void acceptsASecretWithThirtyTwoBytes() {
        var key = config.jwtSigningKey(new JwtProperties("a".repeat(32), 900, 604800));

        assertThat(key.getEncoded()).hasSize(32);
    }
}
