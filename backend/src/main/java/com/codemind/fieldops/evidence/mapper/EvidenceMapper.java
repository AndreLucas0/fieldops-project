package com.codemind.fieldops.evidence.mapper;

import com.codemind.fieldops.evidence.domain.Evidence;
import com.codemind.fieldops.evidence.dto.EvidenceResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface EvidenceMapper {

    @Mapping(source = "evidence.inspection.id", target = "inspectionId")
    @Mapping(source = "evidence.response.id", target = "responseId")
    @Mapping(source = "evidence.nonConformity.id", target = "nonConformityId")
    @Mapping(source = "evidence.createdBy.id", target = "createdBy")
    @Mapping(source = "accessUrl", target = "accessUrl")
    EvidenceResponse toResponse(Evidence evidence, String accessUrl);

}
