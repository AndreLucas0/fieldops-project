package com.codemind.fieldops.shared.storage;

/**
 * Abstraction over the S3-compatible SDK (MinIO in dev, a managed object
 * provider in production) — plano-implementacao-backend.md §10. Domain code
 * never touches the AWS SDK directly, only this interface.
 */
public interface EvidenceStorageClient {

    String upload(byte[] content, String key, String contentType);

    String generateTemporaryUrl(String key);

    void delete(String key);

}
