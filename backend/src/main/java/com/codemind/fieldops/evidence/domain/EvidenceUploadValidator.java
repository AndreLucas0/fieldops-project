package com.codemind.fieldops.evidence.domain;

import com.codemind.fieldops.shared.error.BusinessRuleViolationException;
import com.codemind.fieldops.shared.error.PayloadTooLargeException;
import com.codemind.fieldops.shared.error.UnsupportedMediaTypeException;
import java.math.BigDecimal;
import java.util.Set;
import java.util.UUID;

/**
 * Pure validation rules for evidence upload — no Spring/JPA dependency so
 * they can be unit-tested in isolation from the HTTP/persistence layers
 * (test-plan.md §5.5: UploadValidationTest, GeoLocationCaptureTest).
 */
public final class EvidenceUploadValidator {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of("image/jpeg", "image/png");

    private EvidenceUploadValidator() {
    }

    /**
     * RN-046 — only JPEG/PNG photos are accepted as evidence.
     */
    public static void validateContentType(String contentType) {
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            throw new UnsupportedMediaTypeException("EVIDENCE_UNSUPPORTED_MEDIA_TYPE",
                "Evidence file must be image/jpeg or image/png");
        }
    }

    /**
     * RN-046 — upload rejected above the configured maximum (10 MB by
     * default, EVIDENCE_MAX_UPLOAD_SIZE_BYTES).
     */
    public static void validateSize(long sizeBytes, long maxSizeBytes) {
        if (sizeBytes <= 0) {
            throw new BusinessRuleViolationException("EVIDENCE_EMPTY_FILE", "Evidence file cannot be empty");
        }
        if (sizeBytes > maxSizeBytes) {
            throw new PayloadTooLargeException("EVIDENCE_UPLOAD_TOO_LARGE",
                "Evidence file exceeds the maximum allowed size of " + maxSizeBytes + " bytes");
        }
    }

    /**
     * RN-062 — GPS capture is best-effort and never blocks the upload; the
     * only rule enforced here is internal consistency: a coordinate pair is
     * either fully present or fully absent, never half-captured.
     */
    public static void validateLocation(BigDecimal latitude, BigDecimal longitude) {
        boolean hasLatitude = latitude != null;
        boolean hasLongitude = longitude != null;
        if (hasLatitude != hasLongitude) {
            throw new BusinessRuleViolationException("EVIDENCE_LOCATION_INCOMPLETE",
                "Latitude and longitude must be provided together");
        }
    }

    /**
     * RN-050 — the storage key is generated server-side; the original file
     * name is stored only as metadata, never used as (part of) the
     * identifier.
     */
    public static String generateStorageKey(UUID inspectionId, String contentType) {
        String extension = "image/png".equalsIgnoreCase(contentType) ? "png" : "jpg";
        return "evidence/" + inspectionId + "/" + UUID.randomUUID() + "." + extension;
    }

}
