package com.codemind.fieldops.site.mapper;

import com.codemind.fieldops.site.domain.InspectionSite;
import com.codemind.fieldops.site.dto.SiteResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface SiteMapper {

    @Mapping(source = "client.id", target = "clientId")
    SiteResponse toResponse(InspectionSite site);

}
