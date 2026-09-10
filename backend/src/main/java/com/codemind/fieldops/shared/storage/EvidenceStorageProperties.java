package com.codemind.fieldops.shared.storage;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Binds the {@code EVIDENCE_STORAGE_*} variables from `.env.example` —
 * arquitetura.md §11.8. The same names point at MinIO in dev and at a
 * managed S3-compatible provider in production; only the endpoint/credentials
 * change between environments.
 */
@Component
@ConfigurationProperties(prefix = "fieldops.storage.evidence")
@Getter
@Setter
public class EvidenceStorageProperties {

    private String endpoint;
    private String region;
    private String bucket;
    private String accessKey;
    private String secretKey;
    private long maxUploadSizeBytes;
    private long accessUrlExpirationSeconds = 900;

}
