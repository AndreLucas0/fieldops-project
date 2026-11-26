package com.codemind.fieldops.inspection.dto;

import java.util.Map;

/** Location recorded by the device. The capture timestamp may be absent in older events. */
public record InspectionLocationDto(double latitude, double longitude, Double accuracyMeters, String capturedAt) {

    public static InspectionLocationDto fromMetadata(Map<String, Object> metadata) {
        if (!(metadata.get("latitude") instanceof Number latitude)
                || !(metadata.get("longitude") instanceof Number longitude)) {
            return null;
        }
        Double accuracy = metadata.get("accuracyMeters") instanceof Number meters ? meters.doubleValue() : null;
        String time = metadata.get("capturedAt") instanceof String value ? value : null;
        return new InspectionLocationDto(latitude.doubleValue(), longitude.doubleValue(), accuracy, time);
    }

}
