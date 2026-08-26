package com.codemind.fieldops.nonconformity.application;

import com.codemind.fieldops.nonconformity.domain.NonConformity;
import com.codemind.fieldops.nonconformity.domain.NonConformitySeverity;
import com.codemind.fieldops.nonconformity.domain.NonConformityStatus;
import java.util.UUID;
import org.springframework.data.jpa.domain.Specification;

final class NonConformitySpecifications {

    private NonConformitySpecifications() {
    }

    static Specification<NonConformity> hasInspectionId(UUID inspectionId) {
        return (root, query, cb) -> inspectionId == null ? null
            : cb.equal(root.get("inspection").get("id"), inspectionId);
    }

    static Specification<NonConformity> hasSeverity(NonConformitySeverity severity) {
        return (root, query, cb) -> severity == null ? null : cb.equal(root.get("severity"), severity);
    }

    static Specification<NonConformity> hasStatus(NonConformityStatus status) {
        return (root, query, cb) -> status == null ? null : cb.equal(root.get("status"), status);
    }

}
