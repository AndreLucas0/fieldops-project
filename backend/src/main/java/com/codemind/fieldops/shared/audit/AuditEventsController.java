package com.codemind.fieldops.shared.audit;

import com.codemind.fieldops.shared.pagination.PageResponse;
import jakarta.validation.constraints.Size;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AuditEventsController {

    private final AuditService audit;

    public AuditEventsController(AuditService audit) {
        this.audit = audit;
    }

    @GetMapping("/audit-events")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public PageResponse<AuditOverviewEvent> list(@RequestParam(required = false) @Size(max = 100) String action,
            @RequestParam(required = false) UUID inspectionId, @PageableDefault(size = 20) Pageable page) {
        return audit.list(action, inspectionId, page);
    }

}
