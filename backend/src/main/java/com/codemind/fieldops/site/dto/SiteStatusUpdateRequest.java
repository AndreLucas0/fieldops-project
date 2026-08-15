package com.codemind.fieldops.site.dto;

import com.codemind.fieldops.site.domain.SiteStatus;
import jakarta.validation.constraints.NotNull;

public record SiteStatusUpdateRequest(@NotNull SiteStatus status) {
}
