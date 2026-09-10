package com.codemind.fieldops.evidence.domain;

import com.codemind.fieldops.inspection.domain.Inspection;
import com.codemind.fieldops.inspection.domain.InspectionResponse;
import com.codemind.fieldops.nonconformity.domain.NonConformity;
import com.codemind.fieldops.user.domain.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "evidence")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Evidence {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "inspection_id", nullable = false)
    private Inspection inspection;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "response_id")
    private InspectionResponse response;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "non_conformity_id")
    private NonConformity nonConformity;

    @Column(name = "idempotency_key", nullable = false)
    private UUID idempotencyKey;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EvidenceType type;

    @Column(name = "storage_key", nullable = false, length = 500)
    private String storageKey;

    @Column(name = "original_file_name", length = 255)
    private String originalFileName;

    @Column(name = "mime_type", nullable = false, length = 100)
    private String mimeType;

    @Column(name = "size_bytes", nullable = false)
    private Long sizeBytes;

    @Column(length = 128)
    private String checksum;

    @Column(length = 500)
    private String description;

    private BigDecimal latitude;

    private BigDecimal longitude;

    @Column(name = "captured_at_device", nullable = false)
    private Instant capturedAtDevice;

    @Column(name = "server_received_at")
    private Instant serverReceivedAt;

    @Column(name = "uploaded_at")
    private Instant uploadedAt;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        createdAt = Instant.now();
    }

}
