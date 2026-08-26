package com.codemind.fieldops.inspection.dto;

import java.time.Instant;

public record GeoLocationRequest(
    Double latitude,
    Double longitude,
    Double accuracyMeters,
    Instant capturedAt) {
}
