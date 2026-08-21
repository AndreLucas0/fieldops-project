package com.codemind.fieldops.template.mapper;

import com.codemind.fieldops.template.domain.InspectionTemplate;
import com.codemind.fieldops.template.domain.TemplateItem;
import com.codemind.fieldops.template.domain.TemplateSection;
import com.codemind.fieldops.template.domain.TemplateVersion;
import com.codemind.fieldops.template.dto.TemplateItemResponse;
import com.codemind.fieldops.template.dto.TemplateResponse;
import com.codemind.fieldops.template.dto.TemplateSectionResponse;
import com.codemind.fieldops.template.dto.TemplateVersionResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface TemplateMapper {

    @Mapping(source = "createdBy.id", target = "createdById")
    TemplateResponse toResponse(InspectionTemplate template);

    @Mapping(source = "publishedBy.id", target = "publishedById")
    TemplateVersionResponse toVersionResponse(TemplateVersion version);

    TemplateSectionResponse toSectionResponse(TemplateSection section);

    TemplateItemResponse toItemResponse(TemplateItem item);

}
