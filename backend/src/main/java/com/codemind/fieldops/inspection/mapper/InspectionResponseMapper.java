package com.codemind.fieldops.inspection.mapper;

import com.codemind.fieldops.inspection.domain.InspectionResponse;
import com.codemind.fieldops.inspection.domain.ItemSnapshot;
import com.codemind.fieldops.inspection.dto.InspectionResponseDto;
import com.codemind.fieldops.inspection.dto.ItemSnapshotDto;
import com.codemind.fieldops.inspection.dto.MobileInspectionResponseDto;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface InspectionResponseMapper {

    @Mapping(source = "inspection.id", target = "inspectionId")
    @Mapping(source = "snapshot.id", target = "snapshotId")
    @Mapping(source = "respondedBy.id", target = "respondedById")
    InspectionResponseDto toDto(InspectionResponse response);

    @Mapping(source = "inspection.id", target = "inspectionId")
    @Mapping(source = "sourceTemplateItem.id", target = "sourceTemplateItemId")
    ItemSnapshotDto toSnapshotDto(ItemSnapshot snapshot);

    @Mapping(source = "inspection.id", target = "inspectionId")
    @Mapping(source = "snapshot.id", target = "inspectionItemId")
    @Mapping(source = "respondedBy.id", target = "answeredBy")
    @Mapping(source = "conformity", target = "conformity")
    @Mapping(source = "answeredAtDevice", target = "answeredAtDevice")
    @Mapping(source = "respondedAt", target = "serverReceivedAt")
    @Mapping(source = "respondedAt", target = "createdAt")
    MobileInspectionResponseDto toMobileResponseDto(InspectionResponse response);

}
