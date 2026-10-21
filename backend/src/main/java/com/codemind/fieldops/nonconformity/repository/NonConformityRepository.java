package com.codemind.fieldops.nonconformity.repository;

import com.codemind.fieldops.dashboard.dto.SeverityCountDto;
import com.codemind.fieldops.nonconformity.domain.NonConformity;
import com.codemind.fieldops.nonconformity.domain.NonConformitySeverity;
import com.codemind.fieldops.nonconformity.domain.NonConformityStatus;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

public interface NonConformityRepository
        extends JpaRepository<NonConformity, UUID>, JpaSpecificationExecutor<NonConformity> {

    List<NonConformity> findByInspectionId(UUID inspectionId);

    long countByStatus(NonConformityStatus status);

    @Query("select new com.codemind.fieldops.dashboard.dto.SeverityCountDto(n.severity, count(n)) "
            + "from NonConformity n group by n.severity")
    List<SeverityCountDto> countGroupedBySeverity();

}
