package com.codemind.fieldops.template.repository;

import com.codemind.fieldops.template.domain.TemplateItem;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TemplateItemRepository extends JpaRepository<TemplateItem, UUID> {

}
