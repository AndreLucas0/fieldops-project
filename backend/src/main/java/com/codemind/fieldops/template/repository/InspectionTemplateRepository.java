package com.codemind.fieldops.template.repository;

import com.codemind.fieldops.template.domain.InspectionTemplate;
import jakarta.persistence.LockModeType;
import java.util.UUID;
import java.util.Optional;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface InspectionTemplateRepository extends JpaRepository<InspectionTemplate, UUID>, JpaSpecificationExecutor<InspectionTemplate> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM InspectionTemplate t WHERE t.id = :id")
    Optional<InspectionTemplate> findByIdForUpdate(@Param("id") UUID id);
}
