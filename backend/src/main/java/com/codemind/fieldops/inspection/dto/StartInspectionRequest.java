package com.codemind.fieldops.inspection.dto;

import java.time.Instant;

public record StartInspectionRequest(Instant startedAtDevice, GeoLocationRequest location) {
}
