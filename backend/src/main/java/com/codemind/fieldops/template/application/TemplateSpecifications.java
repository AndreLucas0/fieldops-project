package com.codemind.fieldops.template.application;

import com.codemind.fieldops.template.domain.InspectionTemplate;
import com.codemind.fieldops.template.domain.TemplateStatus;
import org.springframework.data.jpa.domain.Specification;

final class TemplateSpecifications {

    private TemplateSpecifications() {
    }

    static Specification<InspectionTemplate> titleContains(String title) {
        return (root, query, cb) -> title == null ? null
            : cb.like(cb.lower(root.get("title")), "%" + title.toLowerCase() + "%");
    }

    static Specification<InspectionTemplate> categoryContains(String category) {
        return (root, query, cb) -> category == null ? null
            : cb.like(cb.lower(root.get("category")), "%" + category.toLowerCase() + "%");
    }

    static Specification<InspectionTemplate> hasStatus(TemplateStatus status) {
        return (root, query, cb) -> status == null ? null : cb.equal(root.get("status"), status);
    }

}
