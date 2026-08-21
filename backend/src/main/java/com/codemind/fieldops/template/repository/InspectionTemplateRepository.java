package com.codemind.fieldops.template.repository;

import com.codemind.fieldops.template.domain.InspectionTemplate;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface InspectionTemplateRepository extends JpaRepository<InspectionTemplate, UUID>, JpaSpecificationExecutor<InspectionTemplate> {

}
