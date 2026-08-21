package com.codemind.fieldops.equipment.mapper;

import com.codemind.fieldops.equipment.domain.Equipment;
import com.codemind.fieldops.equipment.dto.EquipmentResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface EquipmentMapper {

    @Mapping(source = "site.id", target = "siteId")
    EquipmentResponse toResponse(Equipment equipment);

}
