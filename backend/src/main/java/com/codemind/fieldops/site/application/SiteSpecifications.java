package com.codemind.fieldops.site.application;

import com.codemind.fieldops.site.domain.InspectionSite;
import com.codemind.fieldops.site.domain.SiteStatus;
import java.util.UUID;
import org.springframework.data.jpa.domain.Specification;

final class SiteSpecifications {

    private SiteSpecifications() {
    }

    static Specification<InspectionSite> nameContains(String name) {
        return (root, query, cb) -> name == null ? null
            : cb.like(cb.lower(root.get("name")), "%" + name.toLowerCase() + "%");
    }

    static Specification<InspectionSite> hasStatus(SiteStatus status) {
        return (root, query, cb) -> status == null ? null : cb.equal(root.get("status"), status);
    }

    static Specification<InspectionSite> hasClientId(UUID clientId) {
        return (root, query, cb) -> clientId == null ? null : cb.equal(root.get("client").get("id"), clientId);
    }

}
