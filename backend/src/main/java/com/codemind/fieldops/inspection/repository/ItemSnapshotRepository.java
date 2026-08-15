package com.codemind.fieldops.inspection.repository;

import com.codemind.fieldops.inspection.domain.ItemSnapshot;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ItemSnapshotRepository extends JpaRepository<ItemSnapshot, UUID> {

    List<ItemSnapshot> findByInspectionIdOrderBySectionOrderAscItemOrderAsc(UUID inspectionId);

}
