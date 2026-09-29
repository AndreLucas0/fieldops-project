package com.codemind.fieldops.dashboard.dto;

public record DashboardSummaryDto(
    long totalInspections,
    long inspectionsInProgress,
    long inspectionsPendingReview,
    long inspectionsOverdue,
    long inspectionsApproved,
    long inspectionsRejected,
    long nonConformitiesOpen) {
}
