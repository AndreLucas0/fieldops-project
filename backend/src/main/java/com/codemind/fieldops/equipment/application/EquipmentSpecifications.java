package com.codemind.fieldops.equipment.application;

import com.codemind.fieldops.equipment.domain.Equipment;
import com.codemind.fieldops.equipment.domain.EquipmentStatus;
import java.util.UUID;
import org.springframework.data.jpa.domain.Specification;

final class EquipmentSpecifications {

    private EquipmentSpecifications() {
    }

    static Specification<Equipment> nameContains(String name) {
        return (root, query, cb) -> name == null ? null
            : cb.like(cb.lower(root.get("name")), "%" + name.toLowerCase() + "%");
    }

    static Specification<Equipment> hasStatus(EquipmentStatus status) {
        return (root, query, cb) -> status == null ? null : cb.equal(root.get("status"), status);
    }

    static Specification<Equipment> hasSiteId(UUID siteId) {
        return (root, query, cb) -> siteId == null ? null : cb.equal(root.get("site").get("id"), siteId);
    }

}
