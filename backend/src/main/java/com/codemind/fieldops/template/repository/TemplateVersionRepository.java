package com.codemind.fieldops.template.repository;

import com.codemind.fieldops.template.domain.TemplateVersion;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TemplateVersionRepository extends JpaRepository<TemplateVersion, UUID> {

    @Query("SELECT MAX(tv.versionNumber) FROM TemplateVersion tv WHERE tv.template.id = :templateId")
    Optional<Integer> findMaxVersionNumberByTemplateId(@Param("templateId") UUID templateId);

    @Query("SELECT tv FROM TemplateVersion tv WHERE tv.template.id = :templateId AND tv.activeForNewInspections = true ORDER BY tv.versionNumber DESC")
    List<TemplateVersion> findActiveVersionsByTemplateId(@Param("templateId") UUID templateId);

    @Query("SELECT tv FROM TemplateVersion tv LEFT JOIN FETCH tv.sections s LEFT JOIN FETCH s.items WHERE tv.id = :id")
    Optional<TemplateVersion> findByIdWithSectionsAndItems(@Param("id") UUID id);

}
