package com.codemind.fieldops.inspection.dto;

import java.time.Instant;

public record SubmitInspectionRequest(Instant completedAtDevice, GeoLocationRequest location) {
}
