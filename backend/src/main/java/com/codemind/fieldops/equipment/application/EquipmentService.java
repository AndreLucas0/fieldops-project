package com.codemind.fieldops.equipment.application;

import com.codemind.fieldops.equipment.domain.Equipment;
import com.codemind.fieldops.equipment.domain.EquipmentStatus;
import com.codemind.fieldops.equipment.dto.EquipmentCreateRequest;
import com.codemind.fieldops.equipment.dto.EquipmentUpdateRequest;
import com.codemind.fieldops.equipment.repository.EquipmentRepository;
import com.codemind.fieldops.shared.error.ResourceConflictException;
import com.codemind.fieldops.shared.error.ResourceNotFoundException;
import com.codemind.fieldops.site.application.SiteService;
import com.codemind.fieldops.site.domain.InspectionSite;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EquipmentService {

    private static final String EQUIPMENT_NOT_FOUND_CODE = "EQUIPMENT_NOT_FOUND";
    private static final String QR_CODE_ALREADY_EXISTS_CODE = "QR_CODE_ALREADY_EXISTS";

    private final EquipmentRepository equipmentRepository;
    private final SiteService siteService;

    public EquipmentService(EquipmentRepository equipmentRepository, SiteService siteService) {
        this.equipmentRepository = equipmentRepository;
        this.siteService = siteService;
    }

    @Transactional(readOnly = true)
    public Page<Equipment> list(UUID siteId, String name, EquipmentStatus status, Pageable pageable) {
        Specification<Equipment> specification = Specification
            .where(EquipmentSpecifications.hasSiteId(siteId))
            .and(EquipmentSpecifications.nameContains(name))
            .and(EquipmentSpecifications.hasStatus(status));
        return equipmentRepository.findAll(specification, pageable);
    }

    @Transactional(readOnly = true)
    public Equipment getById(UUID id) {
        return equipmentRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException(EQUIPMENT_NOT_FOUND_CODE, "Equipment not found"));
    }

    @Transactional(readOnly = true)
    public Equipment getByQrCode(String qrCode) {
        return equipmentRepository.findByQrCode(qrCode)
            .orElseThrow(() -> new ResourceNotFoundException(EQUIPMENT_NOT_FOUND_CODE, "Equipment not found for QR code"));
    }

    @Transactional
    public Equipment create(EquipmentCreateRequest request) {
        if (equipmentRepository.existsByQrCode(request.qrCode())) {
            throw new ResourceConflictException(QR_CODE_ALREADY_EXISTS_CODE, "QR code already exists");
        }
        InspectionSite site = siteService.getById(request.siteId());
        Equipment equipment = Equipment.builder()
            .site(site)
            .name(request.name())
            .assetNumber(request.assetNumber())
            .serialNumber(request.serialNumber())
            .manufacturer(request.manufacturer())
            .model(request.model())
            .description(request.description())
            .qrCode(request.qrCode())
            .status(EquipmentStatus.ACTIVE)
            .installedAt(request.installedAt())
            .build();
        return equipmentRepository.save(equipment);
    }

    @Transactional
    public Equipment update(UUID id, EquipmentUpdateRequest request) {
        Equipment equipment = getById(id);
        if (equipmentRepository.existsByQrCodeAndIdNot(request.qrCode(), id)) {
            throw new ResourceConflictException(QR_CODE_ALREADY_EXISTS_CODE, "QR code already exists");
        }
        equipment.setName(request.name());
        equipment.setAssetNumber(request.assetNumber());
        equipment.setSerialNumber(request.serialNumber());
        equipment.setManufacturer(request.manufacturer());
        equipment.setModel(request.model());
        equipment.setDescription(request.description());
        equipment.setQrCode(request.qrCode());
        equipment.setInstalledAt(request.installedAt());
        return equipmentRepository.save(equipment);
    }

    @Transactional
    public Equipment updateStatus(UUID id, EquipmentStatus status) {
        Equipment equipment = getById(id);
        equipment.setStatus(status);
        return equipmentRepository.save(equipment);
    }

}
