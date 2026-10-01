package com.codemind.fieldops.template.domain;

import com.codemind.fieldops.user.domain.User;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "inspection_template_versions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TemplateVersion {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "template_id", nullable = false)
    private InspectionTemplate template;

    @Column(name = "version_number", nullable = false)
    private Integer versionNumber;

    @Column(name = "title_snapshot", nullable = false, length = 200)
    private String titleSnapshot;

    @Column(name = "description_snapshot", length = 1000)
    private String descriptionSnapshot;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TemplateVersionStatus status;

    // Null while the version is a DRAFT (BF-005); set when it is published.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "published_by")
    private User publishedBy;

    @Column(name = "published_at")
    private Instant publishedAt;

    @Column(name = "active_for_new_inspections", nullable = false)
    private Boolean activeForNewInspections;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @OneToMany(mappedBy = "templateVersion", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("displayOrder ASC")
    @Builder.Default
    private List<TemplateSection> sections = new ArrayList<>();

    @PrePersist
    void onCreate() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        createdAt = Instant.now();
        if (status == null) {
            status = TemplateVersionStatus.PUBLISHED;
        }
        boolean published = status == TemplateVersionStatus.PUBLISHED;
        if (published && publishedAt == null) {
            publishedAt = createdAt;
        }
        if (activeForNewInspections == null) {
            activeForNewInspections = published;
        }
    }

    public boolean isDraft() {
        return status == TemplateVersionStatus.DRAFT;
    }

}
