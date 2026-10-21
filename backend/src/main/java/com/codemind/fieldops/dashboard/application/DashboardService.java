package com.codemind.fieldops.dashboard.application;

import com.codemind.fieldops.dashboard.dto.DashboardSummaryDto;
import com.codemind.fieldops.dashboard.dto.SeverityCountDto;
import com.codemind.fieldops.dashboard.dto.StatusCountDto;
import com.codemind.fieldops.inspection.domain.InspectionStatus;
import com.codemind.fieldops.inspection.repository.InspectionRepository;
import com.codemind.fieldops.nonconformity.domain.NonConformityStatus;
import com.codemind.fieldops.nonconformity.repository.NonConformityRepository;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DashboardService {

    private static final List<InspectionStatus> CLOSED_INSPECTION_STATUSES = List.of(
            InspectionStatus.SUBMITTED,
            InspectionStatus.UNDER_REVIEW,
            InspectionStatus.APPROVED,
            InspectionStatus.REJECTED,
            InspectionStatus.CANCELED);

    private final InspectionRepository inspectionRepository;
    private final NonConformityRepository nonConformityRepository;

    public DashboardService(
            InspectionRepository inspectionRepository,
            NonConformityRepository nonConformityRepository) {
        this.inspectionRepository = inspectionRepository;
        this.nonConformityRepository = nonConformityRepository;
    }

    @Transactional(readOnly = true)
    public DashboardSummaryDto getSummary() {
        return new DashboardSummaryDto(
                inspectionRepository.count(),
                inspectionRepository.countByStatus(InspectionStatus.IN_PROGRESS),
                inspectionRepository.countByStatus(InspectionStatus.SUBMITTED),
                inspectionRepository.countByScheduledForBeforeAndStatusNotIn(
                        Instant.now(), CLOSED_INSPECTION_STATUSES),
                inspectionRepository.countByStatus(InspectionStatus.APPROVED),
                inspectionRepository.countByStatus(InspectionStatus.REJECTED),
                nonConformityRepository.countByStatus(NonConformityStatus.OPEN));
    }

    @Transactional(readOnly = true)
    public List<StatusCountDto> getInspectionsByStatus() {
        return inspectionRepository.countGroupedByStatus();
    }

    @Transactional(readOnly = true)
    public List<SeverityCountDto> getNonConformitiesBySeverity() {
        return nonConformityRepository.countGroupedBySeverity();
    }

}
