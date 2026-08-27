package com.codemind.fieldops.review.mapper;

import com.codemind.fieldops.review.domain.InspectionReview;
import com.codemind.fieldops.review.dto.InspectionReviewResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface InspectionReviewMapper {

    @Mapping(source = "inspection.id", target = "inspectionId")
    @Mapping(source = "reviewer.id", target = "reviewerId")
    InspectionReviewResponse toResponse(InspectionReview review);

}
