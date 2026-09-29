package com.codemind.fieldops.inspection.application;

import com.codemind.fieldops.inspection.domain.Inspection;
import com.codemind.fieldops.inspection.domain.InspectionPriority;
import com.codemind.fieldops.inspection.domain.InspectionStatus;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.jpa.domain.Specification;

final class InspectionSpecifications {

    private static final Set<InspectionStatus> NON_OVERDUE_STATUSES = Set.of(
        InspectionStatus.SUBMITTED, InspectionStatus.UNDER_REVIEW,
        InspectionStatus.APPROVED, InspectionStatus.REJECTED, InspectionStatus.CANCELED);

    private InspectionSpecifications() {
    }

    static Specification<Inspection> hasClientId(UUID clientId) {
        return (root, query, cb) -> clientId == null ? null : cb.equal(root.get("client").get("id"), clientId);
    }

    static Specification<Inspection> hasSiteId(UUID siteId) {
        return (root, query, cb) -> siteId == null ? null : cb.equal(root.get("site").get("id"), siteId);
    }

    static Specification<Inspection> hasTechnicianId(UUID technicianId) {
        return (root, query, cb) -> technicianId == null ? null : cb.equal(root.get("technician").get("id"), technicianId);
    }

    static Specification<Inspection> hasStatus(InspectionStatus status) {
        return (root, query, cb) -> status == null ? null : cb.equal(root.get("status"), status);
    }

    static Specification<Inspection> hasPriority(InspectionPriority priority) {
        return (root, query, cb) -> priority == null ? null : cb.equal(root.get("priority"), priority);
    }

    static Specification<Inspection> hasSupervisorId(UUID supervisorId) {
        return (root, query, cb) -> supervisorId == null ? null : cb.equal(root.get("supervisor").get("id"), supervisorId);
    }

    static Specification<Inspection> hasEquipmentId(UUID equipmentId) {
        return (root, query, cb) -> equipmentId == null ? null : cb.equal(root.get("equipment").get("id"), equipmentId);
    }

    static Specification<Inspection> scheduledFrom(Instant from) {
        return (root, query, cb) -> from == null ? null : cb.greaterThanOrEqualTo(root.get("scheduledFor"), from);
    }

    static Specification<Inspection> scheduledTo(Instant to) {
        return (root, query, cb) -> to == null ? null : cb.lessThanOrEqualTo(root.get("scheduledFor"), to);
    }

    static Specification<Inspection> isOverdue(Boolean overdue) {
        if (overdue == null) {
            return (root, query, cb) -> null;
        }
        return (root, query, cb) -> {
            Instant now = Instant.now();
            var pastDue = cb.lessThan(root.get("scheduledFor"), now);
            var inNonOverdueStatus = root.get("status").in(NON_OVERDUE_STATUSES);
            if (overdue) {
                return cb.and(pastDue, cb.not(inNonOverdueStatus));
            } else {
                return cb.or(cb.not(pastDue), inNonOverdueStatus);
            }
        };
    }

}
