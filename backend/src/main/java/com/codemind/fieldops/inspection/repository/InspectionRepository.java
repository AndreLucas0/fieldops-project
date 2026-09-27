package com.codemind.fieldops.inspection.repository;

import com.codemind.fieldops.inspection.domain.Inspection;
import com.codemind.fieldops.inspection.domain.InspectionStatus;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface InspectionRepository extends JpaRepository<Inspection, UUID>, JpaSpecificationExecutor<Inspection> {

    long countByStatus(InspectionStatus status);

    @Query("SELECT COUNT(i) FROM Inspection i WHERE i.scheduledFor < :now AND i.status NOT IN :excluded")
    long countOverdue(@Param("now") Instant now, @Param("excluded") Collection<InspectionStatus> excluded);

    interface StatusCountView {
        InspectionStatus getStatus();
        long getCount();
    }

    @Query("SELECT i.status AS status, COUNT(i) AS count FROM Inspection i GROUP BY i.status")
    List<StatusCountView> countGroupByStatus();

}
