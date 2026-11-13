package com.codemind.fieldops.inspection.dto;

import com.fasterxml.jackson.annotation.JsonUnwrapped;
import com.codemind.fieldops.nonconformity.dto.MobileNonConformityDto;
import com.codemind.fieldops.review.dto.InspectionReviewResponse;
import java.util.List;

/** Read-only implementation of the existing InspectionDetail OpenAPI contract. */
public record AdminInspectionDetailResponse(
    @JsonUnwrapped InspectionResponse inspection,
    List<ItemSnapshotDto> items,
    List<MobileInspectionResponseDto> responses,
    List<MobileNonConformityDto> nonConformities,
    List<InspectionReviewResponse> reviews) {
}
