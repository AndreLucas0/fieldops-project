package com.codemind.fieldops.evidence.domain;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.codemind.fieldops.shared.error.BusinessRuleViolationException;
import com.codemind.fieldops.shared.error.PayloadTooLargeException;
import com.codemind.fieldops.shared.error.UnsupportedMediaTypeException;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class UploadValidationTest {

    private static final long MAX_SIZE = 10 * 1024 * 1024L;

    // ---- RN-046 — content type ----

    @Test
    void acceptsJpeg() {
        assertThatCode(() -> EvidenceUploadValidator.validateContentType("image/jpeg")).doesNotThrowAnyException();
    }

    @Test
    void acceptsPng() {
        assertThatCode(() -> EvidenceUploadValidator.validateContentType("image/png")).doesNotThrowAnyException();
    }

    @Test
    void rejectsUnsupportedContentType() {
        assertThatThrownBy(() -> EvidenceUploadValidator.validateContentType("application/pdf"))
            .isInstanceOf(UnsupportedMediaTypeException.class);
    }

    @Test
    void rejectsNullContentType() {
        assertThatThrownBy(() -> EvidenceUploadValidator.validateContentType(null))
            .isInstanceOf(UnsupportedMediaTypeException.class);
    }

    // ---- RN-046 — size limit ----

    @Test
    void acceptsSizeWithinLimit() {
        assertThatCode(() -> EvidenceUploadValidator.validateSize(MAX_SIZE, MAX_SIZE)).doesNotThrowAnyException();
    }

    @Test
    void rejectsSizeAboveLimit() {
        assertThatThrownBy(() -> EvidenceUploadValidator.validateSize(MAX_SIZE + 1, MAX_SIZE))
            .isInstanceOf(PayloadTooLargeException.class);
    }

    @Test
    void rejectsEmptyFile() {
        assertThatThrownBy(() -> EvidenceUploadValidator.validateSize(0, MAX_SIZE))
            .isInstanceOf(BusinessRuleViolationException.class);
    }

    // ---- RN-050 — storage key never derived from the original file name ----

    @Test
    void storageKeyNeverContainsOriginalFileName() {
        UUID inspectionId = UUID.randomUUID();
        String key = EvidenceUploadValidator.generateStorageKey(inspectionId, "image/jpeg");

        assertThatCode(() -> UUID.fromString(key.substring(key.lastIndexOf('/') + 1, key.lastIndexOf('.'))))
            .doesNotThrowAnyException();
    }

    @Test
    void storageKeyReflectsContentTypeExtension() {
        UUID inspectionId = UUID.randomUUID();

        assertThatCode(() -> {
            String jpegKey = EvidenceUploadValidator.generateStorageKey(inspectionId, "image/jpeg");
            String pngKey = EvidenceUploadValidator.generateStorageKey(inspectionId, "image/png");
            if (!jpegKey.endsWith(".jpg") || !pngKey.endsWith(".png")) {
                throw new AssertionError("Unexpected storage key extension: " + jpegKey + " / " + pngKey);
            }
        }).doesNotThrowAnyException();
    }

}
