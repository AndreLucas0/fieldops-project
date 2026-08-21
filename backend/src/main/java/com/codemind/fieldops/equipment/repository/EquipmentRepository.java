package com.codemind.fieldops.equipment.repository;

import com.codemind.fieldops.equipment.domain.Equipment;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface EquipmentRepository extends JpaRepository<Equipment, UUID>, JpaSpecificationExecutor<Equipment> {

    Optional<Equipment> findByQrCode(String qrCode);

    boolean existsByQrCode(String qrCode);

    boolean existsByQrCodeAndIdNot(String qrCode, UUID id);

}
