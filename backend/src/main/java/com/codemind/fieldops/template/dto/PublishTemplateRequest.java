package com.codemind.fieldops.template.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record PublishTemplateRequest(
    @NotEmpty @Valid List<TemplateSectionRequest> sections) {
}
