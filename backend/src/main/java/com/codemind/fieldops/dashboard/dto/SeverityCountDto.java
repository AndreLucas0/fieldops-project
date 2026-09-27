package com.codemind.fieldops.dashboard.dto;

import com.codemind.fieldops.nonconformity.domain.NonConformitySeverity;

public record SeverityCountDto(NonConformitySeverity severity, long count) {
}
