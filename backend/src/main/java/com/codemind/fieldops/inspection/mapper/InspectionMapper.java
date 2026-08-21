package com.codemind.fieldops.inspection.mapper;

import com.codemind.fieldops.inspection.domain.Inspection;
import com.codemind.fieldops.inspection.dto.InspectionResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface InspectionMapper {

    @Mapping(source = "templateVersion.id", target = "templateVersionId")
    @Mapping(source = "client.id", target = "clientId")
    @Mapping(source = "site.id", target = "siteId")
    @Mapping(source = "equipment.id", target = "equipmentId")
    @Mapping(source = "technician.id", target = "technicianId")
    @Mapping(source = "supervisor.id", target = "supervisorId")
    @Mapping(source = "createdBy.id", target = "createdById")
    InspectionResponse toResponse(Inspection inspection);

}
