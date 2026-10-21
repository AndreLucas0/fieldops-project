package com.codemind.fieldops.inspection.repository;

import com.codemind.fieldops.inspection.domain.Inspection;
import com.codemind.fieldops.inspection.domain.InspectionStatus;
import com.codemind.fieldops.dashboard.dto.StatusCountDto;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

public interface InspectionRepository extends JpaRepository<Inspection, UUID>, JpaSpecificationExecutor<Inspection> {

    long countByStatus(InspectionStatus status);

    long countByScheduledForBeforeAndStatusNotIn(Instant scheduledFor, Collection<InspectionStatus> statuses);

    @Query("select new com.codemind.fieldops.dashboard.dto.StatusCountDto(i.status, count(i)) "
            + "from Inspection i group by i.status")
    List<StatusCountDto> countGroupedByStatus();

}
