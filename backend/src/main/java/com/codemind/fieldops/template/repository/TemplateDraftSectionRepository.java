package com.codemind.fieldops.template.repository;

import com.codemind.fieldops.template.domain.TemplateDraftSection;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TemplateDraftSectionRepository extends JpaRepository<TemplateDraftSection, UUID> {

    @EntityGraph(attributePaths = "items")
    List<TemplateDraftSection> findByTemplateIdOrderByDisplayOrderAsc(UUID templateId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM TemplateDraftSection s WHERE s.template.id = :templateId ORDER BY s.displayOrder")
    List<TemplateDraftSection> findAllForUpdateByTemplateId(@Param("templateId") UUID templateId);

    @EntityGraph(attributePaths = "items")
    Optional<TemplateDraftSection> findByIdAndTemplateId(UUID id, UUID templateId);
}
