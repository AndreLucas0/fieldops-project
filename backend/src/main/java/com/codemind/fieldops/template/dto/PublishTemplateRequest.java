package com.codemind.fieldops.template.dto;

import jakarta.validation.Valid;
import java.util.List;

public record PublishTemplateRequest(
    @Valid List<TemplateSectionRequest> sections) {
}
