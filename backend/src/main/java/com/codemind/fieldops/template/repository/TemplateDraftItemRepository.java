package com.codemind.fieldops.template.repository;

import com.codemind.fieldops.template.domain.TemplateDraftItem;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TemplateDraftItemRepository extends JpaRepository<TemplateDraftItem, UUID> {

    List<TemplateDraftItem> findBySectionIdOrderByDisplayOrderAsc(UUID sectionId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT i FROM TemplateDraftItem i WHERE i.section.id = :sectionId ORDER BY i.displayOrder")
    List<TemplateDraftItem> findAllForUpdateBySectionId(@Param("sectionId") UUID sectionId);

    @Query("SELECT i FROM TemplateDraftItem i WHERE i.id = :itemId AND i.section.template.id = :templateId")
    Optional<TemplateDraftItem> findByIdAndTemplateId(
        @Param("itemId") UUID itemId,
        @Param("templateId") UUID templateId);
}
