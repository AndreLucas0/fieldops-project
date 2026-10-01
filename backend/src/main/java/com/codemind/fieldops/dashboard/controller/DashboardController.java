package com.codemind.fieldops.dashboard.controller;

import com.codemind.fieldops.dashboard.DashboardService;
import com.codemind.fieldops.dashboard.dto.DashboardSummaryDto;
import com.codemind.fieldops.dashboard.dto.SeverityCountDto;
import com.codemind.fieldops.dashboard.dto.StatusCountDto;

import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/summary")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public DashboardSummaryDto summary() {
        return dashboardService.getSummary();
    }

    @GetMapping("/inspections-by-status")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public List<StatusCountDto> inspectionsByStatus() {
        return dashboardService.getInspectionsByStatus();
    }

    @GetMapping("/non-conformities-by-severity")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public List<SeverityCountDto> nonConformitiesBySeverity() {
        return dashboardService.getNonConformitiesBySeverity();
    }
}
