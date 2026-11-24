package com.codemind.fieldops.shared.storage;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Binds the {@code EVIDENCE_STORAGE_*} variables from `.env.example` —
 * arquitetura.md §11.8. Local development uses an explicit endpoint and
 * credentials. The production profile uses the AWS SDK defaults.
 */
@Component
@ConfigurationProperties(prefix = "fieldops.storage.evidence")
@Getter
@Setter
public class EvidenceStorageProperties {

    private String endpoint;
    private boolean useAwsDefaults;
    private String region;
    private String bucket;
    private String accessKey;
    private String secretKey;
    private long maxUploadSizeBytes;
    private long accessUrlExpirationSeconds = 900;

}
