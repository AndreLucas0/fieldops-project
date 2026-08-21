package com.codemind.fieldops.template.domain;

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
import java.time.Instant;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "template_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TemplateItem {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "section_id", nullable = false)
    private TemplateSection section;

    @Column(length = 50)
    private String code;

    @Column(nullable = false, length = 300)
    private String title;

    @Column(length = 1000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "response_type", nullable = false, length = 20)
    private ResponseType responseType;

    @Column(nullable = false)
    private Boolean required;

    @Column(name = "observation_required_on_failure", nullable = false)
    private Boolean observationRequiredOnFailure;

    @Column(name = "evidence_required_on_failure", nullable = false)
    private Boolean evidenceRequiredOnFailure;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "options_json", columnDefinition = "jsonb")
    private String optionsJson;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        createdAt = Instant.now();
        if (required == null) {
            required = false;
        }
        if (observationRequiredOnFailure == null) {
            observationRequiredOnFailure = false;
        }
        if (evidenceRequiredOnFailure == null) {
            evidenceRequiredOnFailure = false;
        }
    }

}
