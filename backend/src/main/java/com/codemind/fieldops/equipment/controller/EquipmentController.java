package com.codemind.fieldops.equipment.controller;

import com.codemind.fieldops.equipment.application.EquipmentService;
import com.codemind.fieldops.equipment.domain.Equipment;
import com.codemind.fieldops.equipment.domain.EquipmentStatus;
import com.codemind.fieldops.equipment.dto.EquipmentCreateRequest;
import com.codemind.fieldops.equipment.dto.EquipmentResponse;
import com.codemind.fieldops.equipment.dto.EquipmentStatusUpdateRequest;
import com.codemind.fieldops.equipment.dto.EquipmentUpdateRequest;
import com.codemind.fieldops.equipment.mapper.EquipmentMapper;
import com.codemind.fieldops.shared.pagination.PageResponse;
import com.codemind.fieldops.shared.pagination.SortFieldValidator;
import jakarta.validation.Valid;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/equipment")
public class EquipmentController {

    private static final Set<String> SORTABLE_FIELDS = Set.of("name", "status", "assetNumber", "createdAt");

    private final EquipmentService equipmentService;
    private final EquipmentMapper equipmentMapper;

    public EquipmentController(EquipmentService equipmentService, EquipmentMapper equipmentMapper) {
        this.equipmentService = equipmentService;
        this.equipmentMapper = equipmentMapper;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public PageResponse<EquipmentResponse> list(
            @RequestParam(required = false) UUID siteId,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) EquipmentStatus status,
            @PageableDefault(size = 20) Pageable pageable) {
        SortFieldValidator.validate(pageable.getSort(), SORTABLE_FIELDS);
        Page<Equipment> equipment = equipmentService.list(siteId, name, status, pageable);
        return PageResponse.from(equipment.map(equipmentMapper::toResponse));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public EquipmentResponse create(@Valid @RequestBody EquipmentCreateRequest request) {
        return equipmentMapper.toResponse(equipmentService.create(request));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public EquipmentResponse get(@PathVariable UUID id) {
        return equipmentMapper.toResponse(equipmentService.getById(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public EquipmentResponse update(@PathVariable UUID id, @Valid @RequestBody EquipmentUpdateRequest request) {
        return equipmentMapper.toResponse(equipmentService.update(id, request));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public EquipmentResponse updateStatus(@PathVariable UUID id, @Valid @RequestBody EquipmentStatusUpdateRequest request) {
        return equipmentMapper.toResponse(equipmentService.updateStatus(id, request.status()));
    }

    @GetMapping("/by-qr/{qrCode}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','TECHNICIAN')")
    public EquipmentResponse getByQrCode(@PathVariable String qrCode) {
        return equipmentMapper.toResponse(equipmentService.getByQrCode(qrCode));
    }

}
