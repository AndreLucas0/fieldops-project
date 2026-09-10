package com.codemind.fieldops.nonconformity.repository;

import com.codemind.fieldops.nonconformity.domain.NonConformity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface NonConformityRepository
        extends JpaRepository<NonConformity, UUID>, JpaSpecificationExecutor<NonConformity> {

    List<NonConformity> findByInspectionId(UUID inspectionId);

}
