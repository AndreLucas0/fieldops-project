package com.codemind.fieldops.site.repository;

import com.codemind.fieldops.site.domain.InspectionSite;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface InspectionSiteRepository extends JpaRepository<InspectionSite, UUID>, JpaSpecificationExecutor<InspectionSite> {

}
