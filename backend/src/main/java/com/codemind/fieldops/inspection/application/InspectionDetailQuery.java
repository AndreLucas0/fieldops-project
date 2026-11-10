package com.codemind.fieldops.inspection.application;

import com.codemind.fieldops.inspection.dto.AdminInspectionDetailResponse;
import com.codemind.fieldops.inspection.mapper.InspectionMapper;
import com.codemind.fieldops.inspection.mapper.InspectionResponseMapper;
import com.codemind.fieldops.inspection.repository.ItemSnapshotRepository;
import com.codemind.fieldops.inspection.repository.InspectionResponseRepository;
import com.codemind.fieldops.nonconformity.mapper.NonConformityMapper;
import com.codemind.fieldops.nonconformity.repository.NonConformityRepository;
import com.codemind.fieldops.review.mapper.InspectionReviewMapper;
import com.codemind.fieldops.review.repository.InspectionReviewRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class InspectionDetailQuery {
    private final InspectionService inspections;
    private final InspectionMapper mapper;
    private final ItemSnapshotRepository snapshots;
    private final InspectionResponseRepository responses;
    private final InspectionResponseMapper responseMapper;
    private final NonConformityRepository nonConformities;
    private final NonConformityMapper nonConformityMapper;
    private final InspectionReviewRepository reviews;
    private final InspectionReviewMapper reviewMapper;

    public InspectionDetailQuery(InspectionService inspections, InspectionMapper mapper,
            ItemSnapshotRepository snapshots, InspectionResponseRepository responses,
            InspectionResponseMapper responseMapper, NonConformityRepository nonConformities,
            NonConformityMapper nonConformityMapper, InspectionReviewRepository reviews,
            InspectionReviewMapper reviewMapper) {
        this.inspections = inspections;
        this.mapper = mapper;
        this.snapshots = snapshots;
        this.responses = responses;
        this.responseMapper = responseMapper;
        this.nonConformities = nonConformities;
        this.nonConformityMapper = nonConformityMapper;
        this.reviews = reviews;
        this.reviewMapper = reviewMapper;
    }

    public AdminInspectionDetailResponse get(UUID id) {
        // Resolve existence first, preserving the current 404 behavior.
        var inspection = inspections.getById(id);
        return new AdminInspectionDetailResponse(
            mapper.toResponse(inspection),
            snapshots.findByInspectionIdOrderBySectionOrderAscItemOrderAsc(id).stream()
                .map(responseMapper::toSnapshotDto).toList(),
            responses.findByInspectionId(id).stream().map(responseMapper::toMobileResponseDto).toList(),
            nonConformities.findByInspectionId(id).stream().map(nonConformityMapper::toMobileDto).toList(),
            reviews.findByInspectionIdOrderByReviewCycleAsc(id).stream().map(reviewMapper::toResponse).toList());
    }
}
