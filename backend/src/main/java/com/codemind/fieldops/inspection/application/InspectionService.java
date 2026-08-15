package com.codemind.fieldops.inspection.application;

import com.codemind.fieldops.client.application.ClientService;
import com.codemind.fieldops.client.domain.Client;
import com.codemind.fieldops.equipment.application.EquipmentService;
import com.codemind.fieldops.equipment.domain.Equipment;
import com.codemind.fieldops.inspection.domain.Inspection;
import com.codemind.fieldops.inspection.domain.InspectionPriority;
import com.codemind.fieldops.inspection.domain.InspectionStatus;
import com.codemind.fieldops.inspection.domain.ItemSnapshot;
import com.codemind.fieldops.inspection.dto.AssignInspectionRequest;
import com.codemind.fieldops.inspection.dto.CancelInspectionRequest;
import com.codemind.fieldops.inspection.dto.InspectionCreateRequest;
import com.codemind.fieldops.inspection.dto.InspectionUpdateRequest;
import com.codemind.fieldops.inspection.repository.InspectionRepository;
import com.codemind.fieldops.inspection.repository.ItemSnapshotRepository;
import com.codemind.fieldops.shared.error.BusinessRuleViolationException;
import com.codemind.fieldops.shared.error.ResourceNotFoundException;
import com.codemind.fieldops.site.application.SiteService;
import com.codemind.fieldops.site.domain.InspectionSite;
import com.codemind.fieldops.template.domain.TemplateItem;
import com.codemind.fieldops.template.domain.TemplateSection;
import com.codemind.fieldops.template.domain.TemplateVersion;
import com.codemind.fieldops.template.repository.TemplateVersionRepository;
import com.codemind.fieldops.user.domain.User;
import com.codemind.fieldops.user.domain.UserRole;
import com.codemind.fieldops.user.domain.UserStatus;
import com.codemind.fieldops.user.repository.UserRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InspectionService {

    private static final String INSPECTION_NOT_FOUND_CODE = "INSPECTION_NOT_FOUND";
    private static final String TEMPLATE_VERSION_NOT_FOUND_CODE = "TEMPLATE_VERSION_NOT_FOUND";
    private static final String USER_NOT_FOUND_CODE = "USER_NOT_FOUND";
    private static final String TECHNICIAN_NOT_ACTIVE_CODE = "TECHNICIAN_NOT_ACTIVE";
    private static final String USER_NOT_TECHNICIAN_CODE = "USER_NOT_TECHNICIAN";
    private static final String INSPECTION_CANNOT_BE_CANCELED_CODE = "INSPECTION_CANNOT_BE_CANCELED";
    private static final String INSPECTION_CANNOT_BE_ASSIGNED_CODE = "INSPECTION_CANNOT_BE_ASSIGNED";

    private final InspectionRepository inspectionRepository;
    private final ItemSnapshotRepository itemSnapshotRepository;
    private final TemplateVersionRepository templateVersionRepository;
    private final ClientService clientService;
    private final SiteService siteService;
    private final EquipmentService equipmentService;
    private final UserRepository userRepository;

    public InspectionService(InspectionRepository inspectionRepository,
                              ItemSnapshotRepository itemSnapshotRepository,
                              TemplateVersionRepository templateVersionRepository,
                              ClientService clientService,
                              SiteService siteService,
                              EquipmentService equipmentService,
                              UserRepository userRepository) {
        this.inspectionRepository = inspectionRepository;
        this.itemSnapshotRepository = itemSnapshotRepository;
        this.templateVersionRepository = templateVersionRepository;
        this.clientService = clientService;
        this.siteService = siteService;
        this.equipmentService = equipmentService;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public Page<Inspection> list(UUID clientId, UUID siteId, UUID technicianId,
                                  InspectionStatus status, InspectionPriority priority,
                                  Pageable pageable) {
        Specification<Inspection> specification = Specification
            .where(InspectionSpecifications.hasClientId(clientId))
            .and(InspectionSpecifications.hasSiteId(siteId))
            .and(InspectionSpecifications.hasTechnicianId(technicianId))
            .and(InspectionSpecifications.hasStatus(status))
            .and(InspectionSpecifications.hasPriority(priority));
        return inspectionRepository.findAll(specification, pageable);
    }

    @Transactional(readOnly = true)
    public Inspection getById(UUID id) {
        return inspectionRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException(INSPECTION_NOT_FOUND_CODE, "Inspection not found"));
    }

    @Transactional
    public Inspection create(UUID createdByUserId, InspectionCreateRequest request) {
        TemplateVersion templateVersion = templateVersionRepository.findByIdWithSectionsAndItems(request.templateVersionId())
            .orElseThrow(() -> new ResourceNotFoundException(TEMPLATE_VERSION_NOT_FOUND_CODE, "Template version not found"));

        Client client = clientService.getById(request.clientId());
        InspectionSite site = siteService.getById(request.siteId());

        Equipment equipment = null;
        if (request.equipmentId() != null) {
            equipment = equipmentService.getById(request.equipmentId());
        }

        User technician = userRepository.findById(request.technicianId())
            .orElseThrow(() -> new ResourceNotFoundException(USER_NOT_FOUND_CODE, "Technician not found"));

        if (technician.getRole() != UserRole.TECHNICIAN) {
            throw new BusinessRuleViolationException(USER_NOT_TECHNICIAN_CODE, "User is not a technician");
        }
        if (technician.getStatus() != UserStatus.ACTIVE) {
            throw new BusinessRuleViolationException(TECHNICIAN_NOT_ACTIVE_CODE, "Technician is not active");
        }

        User supervisor = null;
        if (request.supervisorId() != null) {
            supervisor = userRepository.findById(request.supervisorId())
                .orElseThrow(() -> new ResourceNotFoundException(USER_NOT_FOUND_CODE, "Supervisor not found"));
        }

        User createdBy = userRepository.findById(createdByUserId)
            .orElseThrow(() -> new ResourceNotFoundException(USER_NOT_FOUND_CODE, "User not found"));

        Inspection inspection = Inspection.builder()
            .templateVersion(templateVersion)
            .client(client)
            .site(site)
            .equipment(equipment)
            .technician(technician)
            .supervisor(supervisor)
            .createdBy(createdBy)
            .title(request.title())
            .instructions(request.instructions())
            .priority(request.priority())
            .status(InspectionStatus.DRAFT)
            .scheduledFor(request.scheduledFor())
            .build();

        Inspection savedInspection = inspectionRepository.save(inspection);

        // Create snapshots from template version
        createSnapshots(savedInspection, templateVersion);

        return savedInspection;
    }

    @Transactional
    public Inspection update(UUID id, InspectionUpdateRequest request) {
        Inspection inspection = getById(id);
        inspection.setTitle(request.title());
        inspection.setInstructions(request.instructions());
        inspection.setPriority(request.priority());
        inspection.setScheduledFor(request.scheduledFor());
        return inspectionRepository.save(inspection);
    }

    @Transactional
    public Inspection assign(UUID id, AssignInspectionRequest request) {
        Inspection inspection = getById(id);

        if (inspection.getStatus() != InspectionStatus.DRAFT) {
            throw new BusinessRuleViolationException(INSPECTION_CANNOT_BE_ASSIGNED_CODE,
                "Only DRAFT inspections can be assigned");
        }

        User technician = userRepository.findById(request.technicianId())
            .orElseThrow(() -> new ResourceNotFoundException(USER_NOT_FOUND_CODE, "Technician not found"));

        if (technician.getRole() != UserRole.TECHNICIAN) {
            throw new BusinessRuleViolationException(USER_NOT_TECHNICIAN_CODE, "User is not a technician");
        }
        if (technician.getStatus() != UserStatus.ACTIVE) {
            throw new BusinessRuleViolationException(TECHNICIAN_NOT_ACTIVE_CODE, "Technician is not active");
        }

        inspection.setTechnician(technician);
        inspection.setStatus(InspectionStatus.ASSIGNED);
        return inspectionRepository.save(inspection);
    }

    @Transactional
    public Inspection cancel(UUID id, UUID canceledByUserId, CancelInspectionRequest request) {
        Inspection inspection = getById(id);

        if (inspection.getStatus() == InspectionStatus.APPROVED ||
            inspection.getStatus() == InspectionStatus.SUBMITTED) {
            throw new BusinessRuleViolationException(INSPECTION_CANNOT_BE_CANCELED_CODE,
                "Inspection in status " + inspection.getStatus() + " cannot be canceled");
        }

        User canceledBy = userRepository.findById(canceledByUserId)
            .orElseThrow(() -> new ResourceNotFoundException(USER_NOT_FOUND_CODE, "User not found"));

        inspection.setStatus(InspectionStatus.CANCELED);
        inspection.setCanceledAt(Instant.now());
        inspection.setCanceledBy(canceledBy);
        inspection.setCanceledReason(request != null ? request.reason() : null);
        return inspectionRepository.save(inspection);
    }

    private void createSnapshots(Inspection inspection, TemplateVersion templateVersion) {
        List<ItemSnapshot> snapshots = new ArrayList<>();

        // We need to load sections with items
        for (TemplateSection section : templateVersion.getSections()) {
            for (TemplateItem item : section.getItems()) {
                ItemSnapshot snapshot = ItemSnapshot.builder()
                    .inspection(inspection)
                    .sourceTemplateItem(item)
                    .sectionTitle(section.getTitle())
                    .sectionDescription(section.getDescription())
                    .sectionOrder(section.getDisplayOrder())
                    .itemCode(item.getCode())
                    .itemTitle(item.getTitle())
                    .itemDescription(item.getDescription())
                    .responseType(item.getResponseType().name())
                    .required(item.getRequired())
                    .optionsJson(item.getOptionsJson())
                    .itemOrder(item.getDisplayOrder())
                    .build();
                snapshots.add(snapshot);
            }
        }

        if (!snapshots.isEmpty()) {
            itemSnapshotRepository.saveAll(snapshots);
        }
    }

}
