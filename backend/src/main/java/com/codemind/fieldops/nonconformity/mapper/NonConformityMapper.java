package com.codemind.fieldops.nonconformity.mapper;

import com.codemind.fieldops.nonconformity.domain.NonConformity;
import com.codemind.fieldops.nonconformity.dto.NonConformityResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface NonConformityMapper {

    @Mapping(source = "inspection.id", target = "inspectionId")
    @Mapping(source = "snapshot.id", target = "snapshotId")
    @Mapping(source = "response.id", target = "responseId")
    @Mapping(source = "reportedBy.id", target = "reportedById")
    NonConformityResponse toResponse(NonConformity nonConformity);

}
