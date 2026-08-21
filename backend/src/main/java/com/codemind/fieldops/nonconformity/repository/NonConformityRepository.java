package com.codemind.fieldops.nonconformity.repository;

import com.codemind.fieldops.nonconformity.domain.NonConformity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NonConformityRepository extends JpaRepository<NonConformity, UUID> {

    List<NonConformity> findByInspectionId(UUID inspectionId);

}
