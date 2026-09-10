package com.codemind.fieldops.shared.audit;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * Append-only audit trail row (10.12) — one entry per state-changing use
 * case, written explicitly by {@link AuditEventPublisher} inside the same
 * transaction as the business change it records (plano-implementacao-backend.md
 * §9). Never updated after insert.
 */
@Entity
@Table(name = "audit_events")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditEvent {

    @Id
    private UUID id;

    @Column(name = "inspection_id")
    private UUID inspectionId;

    @Column(name = "actor_id")
    private UUID actorId;

    @Column(nullable = false, length = 100)
    private String action;

    @Column(name = "entity_type", nullable = false, length = 100)
    private String entityType;

    @Column(name = "entity_id", nullable = false)
    private UUID entityId;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;

    @Column(name = "device_occurred_at")
    private Instant deviceOccurredAt;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "previous_value_json")
    private Map<String, Object> previousValueJson;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "new_value_json")
    private Map<String, Object> newValueJson;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata_json")
    private Map<String, Object> metadataJson;

    @Column(name = "request_id", length = 100)
    private String requestId;

    @Column(name = "device_id", length = 100)
    private String deviceId;

    @PrePersist
    void onCreate() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (occurredAt == null) {
            occurredAt = Instant.now();
        }
    }

}
