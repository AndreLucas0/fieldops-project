package com.codemind.fieldops.dashboard.dto;

import com.codemind.fieldops.inspection.domain.InspectionStatus;

public record StatusCountDto(InspectionStatus status, long count) {
}
