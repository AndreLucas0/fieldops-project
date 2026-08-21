package com.codemind.fieldops.inspection.domain;

import com.codemind.fieldops.template.domain.TemplateItem;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
@Table(name = "inspection_item_snapshots")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ItemSnapshot {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "inspection_id", nullable = false)
    private Inspection inspection;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_template_item_id")
    private TemplateItem sourceTemplateItem;

    @Column(name = "section_title", nullable = false, length = 150)
    private String sectionTitle;

    @Column(name = "section_description", length = 500)
    private String sectionDescription;

    @Column(name = "section_order", nullable = false)
    private Integer sectionOrder;

    @Column(name = "item_code", length = 50)
    private String itemCode;

    @Column(name = "item_title", nullable = false, length = 300)
    private String itemTitle;

    @Column(name = "item_description", length = 1000)
    private String itemDescription;

    @Column(name = "response_type", nullable = false, length = 20)
    private String responseType;

    @Column(nullable = false)
    private Boolean required;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "rules_json", columnDefinition = "jsonb")
    private String rulesJson;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "options_json", columnDefinition = "jsonb")
    private String optionsJson;

    @Column(name = "item_order", nullable = false)
    private Integer itemOrder;

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
    }

}
