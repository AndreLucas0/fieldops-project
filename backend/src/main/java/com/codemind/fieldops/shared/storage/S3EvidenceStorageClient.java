package com.codemind.fieldops.shared.storage;

import java.net.URI;
import java.time.Duration;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

@Component
public class S3EvidenceStorageClient implements EvidenceStorageClient {

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;
    private final EvidenceStorageProperties properties;

    public S3EvidenceStorageClient(EvidenceStorageProperties properties) {
        this.properties = properties;
        Region region = Region.of(properties.getRegion());
        var clientBuilder = S3Client.builder().region(region);
        var presignerBuilder = S3Presigner.builder().region(region);

        if (!properties.isUseAwsDefaults()) {
            URI endpoint = URI.create(properties.getEndpoint());
            var credentialsProvider = StaticCredentialsProvider.create(
                AwsBasicCredentials.create(properties.getAccessKey(), properties.getSecretKey()));
            clientBuilder.endpointOverride(endpoint).credentialsProvider(credentialsProvider).forcePathStyle(true);
            presignerBuilder.endpointOverride(endpoint).credentialsProvider(credentialsProvider);
        }

        this.s3Client = clientBuilder.build();
        this.s3Presigner = presignerBuilder.build();
    }

    @Override
    public String upload(byte[] content, String key, String contentType) {
        PutObjectRequest request = PutObjectRequest.builder()
            .bucket(properties.getBucket())
            .key(key)
            .contentType(contentType)
            .contentLength((long) content.length)
            .build();
        s3Client.putObject(request, RequestBody.fromBytes(content));
        return key;
    }

    @Override
    public String generateTemporaryUrl(String key) {
        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
            .bucket(properties.getBucket())
            .key(key)
            .build();
        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
            .signatureDuration(Duration.ofSeconds(properties.getAccessUrlExpirationSeconds()))
            .getObjectRequest(getObjectRequest)
            .build();
        return s3Presigner.presignGetObject(presignRequest).url().toString();
    }

    @Override
    public void delete(String key) {
        s3Client.deleteObject(DeleteObjectRequest.builder()
            .bucket(properties.getBucket())
            .key(key)
            .build());
    }

}
