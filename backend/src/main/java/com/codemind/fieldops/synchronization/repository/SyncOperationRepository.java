package com.codemind.fieldops.synchronization.repository;

import com.codemind.fieldops.synchronization.domain.SyncOperation;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SyncOperationRepository extends JpaRepository<SyncOperation, UUID> {
}
