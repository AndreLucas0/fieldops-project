package com.codemind.fieldops.template.dto;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import java.util.UUID;

public record TemplateDraftOrderRequest(@NotEmpty List<UUID> ids) {
}
