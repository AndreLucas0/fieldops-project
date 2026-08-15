package com.codemind.fieldops.inspection.application;

import com.codemind.fieldops.inspection.domain.Inspection;
import com.codemind.fieldops.inspection.domain.InspectionPriority;
import com.codemind.fieldops.inspection.domain.InspectionStatus;
import java.util.UUID;
import org.springframework.data.jpa.domain.Specification;

final class InspectionSpecifications {

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

}
