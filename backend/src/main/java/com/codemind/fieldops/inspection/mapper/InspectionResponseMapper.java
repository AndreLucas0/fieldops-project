package com.codemind.fieldops.inspection.mapper;

import com.codemind.fieldops.inspection.domain.InspectionResponse;
import com.codemind.fieldops.inspection.domain.ItemSnapshot;
import com.codemind.fieldops.inspection.dto.InspectionResponseDto;
import com.codemind.fieldops.inspection.dto.ItemSnapshotDto;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface InspectionResponseMapper {

    @Mapping(source = "inspection.id", target = "inspectionId")
    @Mapping(source = "snapshot.id", target = "snapshotId")
    @Mapping(source = "respondedBy.id", target = "respondedById")
    InspectionResponseDto toDto(InspectionResponse response);

    @Mapping(source = "inspection.id", target = "inspectionId")
    ItemSnapshotDto toSnapshotDto(ItemSnapshot snapshot);

}
