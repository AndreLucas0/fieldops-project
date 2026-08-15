package com.codemind.fieldops.template.repository;

import com.codemind.fieldops.template.domain.TemplateSection;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TemplateSectionRepository extends JpaRepository<TemplateSection, UUID> {

}
