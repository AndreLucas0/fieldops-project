package com.codemind.fieldops.template.application;

import com.codemind.fieldops.shared.error.BusinessRuleViolationException;
import com.codemind.fieldops.shared.error.ResourceNotFoundException;
import com.codemind.fieldops.template.domain.InspectionTemplate;
import com.codemind.fieldops.template.domain.TemplateItem;
import com.codemind.fieldops.template.domain.TemplateSection;
import com.codemind.fieldops.template.domain.TemplateStatus;
import com.codemind.fieldops.template.domain.TemplateVersion;
import com.codemind.fieldops.template.dto.TemplateCreateRequest;
import com.codemind.fieldops.template.dto.TemplateItemRequest;
import com.codemind.fieldops.template.dto.TemplateSectionRequest;
import com.codemind.fieldops.template.dto.TemplateUpdateRequest;
import com.codemind.fieldops.template.repository.InspectionTemplateRepository;
import com.codemind.fieldops.template.repository.TemplateVersionRepository;
import com.codemind.fieldops.user.domain.User;
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
public class TemplateService {

    private static final String TEMPLATE_NOT_FOUND_CODE = "TEMPLATE_NOT_FOUND";
    private static final String TEMPLATE_NOT_DRAFT_CODE = "TEMPLATE_NOT_DRAFT";
    private static final String TEMPLATE_HAS_NO_SECTIONS_CODE = "TEMPLATE_HAS_NO_SECTIONS";
    private static final String USER_NOT_FOUND_CODE = "USER_NOT_FOUND";

    private final InspectionTemplateRepository templateRepository;
    private final TemplateVersionRepository versionRepository;
    private final UserRepository userRepository;

    public TemplateService(InspectionTemplateRepository templateRepository,
                           TemplateVersionRepository versionRepository,
                           UserRepository userRepository) {
        this.templateRepository = templateRepository;
        this.versionRepository = versionRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public Page<InspectionTemplate> list(String title, String category, TemplateStatus status, Pageable pageable) {
        Specification<InspectionTemplate> specification = Specification
            .where(TemplateSpecifications.titleContains(title))
            .and(TemplateSpecifications.categoryContains(category))
            .and(TemplateSpecifications.hasStatus(status));
        return templateRepository.findAll(specification, pageable);
    }

    @Transactional(readOnly = true)
    public InspectionTemplate getById(UUID id) {
        return templateRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException(TEMPLATE_NOT_FOUND_CODE, "Template not found"));
    }

    @Transactional(readOnly = true)
    public TemplateVersion getActiveVersion(UUID templateId) {
        getById(templateId); // validate template exists
        TemplateVersion version = versionRepository.findActiveVersionsByTemplateId(templateId).stream()
            .findFirst()
            .orElseThrow(() -> new ResourceNotFoundException(TEMPLATE_NOT_FOUND_CODE, "No active version found for template"));
        // Initialize lazy collections within transaction
        version.getSections().forEach(section -> section.getItems().size());
        return version;
    }

    @Transactional
    public InspectionTemplate create(UUID createdByUserId, TemplateCreateRequest request) {
        User createdBy = userRepository.findById(createdByUserId)
            .orElseThrow(() -> new ResourceNotFoundException(USER_NOT_FOUND_CODE, "User not found"));

        InspectionTemplate template = InspectionTemplate.builder()
            .title(request.title())
            .description(request.description())
            .category(request.category())
            .status(TemplateStatus.DRAFT)
            .createdBy(createdBy)
            .build();
        return templateRepository.save(template);
    }

    @Transactional
    public InspectionTemplate update(UUID id, TemplateUpdateRequest request) {
        InspectionTemplate template = getById(id);
        if (template.getStatus() != TemplateStatus.DRAFT) {
            throw new BusinessRuleViolationException(TEMPLATE_NOT_DRAFT_CODE, "Only DRAFT templates can be updated");
        }
        template.setTitle(request.title());
        template.setDescription(request.description());
        template.setCategory(request.category());
        return templateRepository.save(template);
    }

    @Transactional
    public TemplateVersion publish(UUID templateId, UUID publishedByUserId, List<TemplateSectionRequest> sections) {
        InspectionTemplate template = getById(templateId);
        if (template.getStatus() != TemplateStatus.DRAFT) {
            throw new BusinessRuleViolationException(TEMPLATE_NOT_DRAFT_CODE, "Only DRAFT templates can be published");
        }
        if (sections == null || sections.isEmpty()) {
            throw new BusinessRuleViolationException(TEMPLATE_HAS_NO_SECTIONS_CODE, "Template must have at least one section to be published");
        }

        User publishedBy = userRepository.findById(publishedByUserId)
            .orElseThrow(() -> new ResourceNotFoundException(USER_NOT_FOUND_CODE, "User not found"));

        int nextVersionNumber = versionRepository.findMaxVersionNumberByTemplateId(templateId)
            .map(v -> v + 1)
            .orElse(1);

        TemplateVersion version = TemplateVersion.builder()
            .template(template)
            .versionNumber(nextVersionNumber)
            .titleSnapshot(template.getTitle())
            .descriptionSnapshot(template.getDescription())
            .publishedBy(publishedBy)
            .publishedAt(Instant.now())
            .activeForNewInspections(true)
            .sections(new ArrayList<>())
            .build();

        for (TemplateSectionRequest sectionReq : sections) {
            TemplateSection section = TemplateSection.builder()
                .templateVersion(version)
                .title(sectionReq.title())
                .description(sectionReq.description())
                .displayOrder(sectionReq.displayOrder())
                .items(new ArrayList<>())
                .build();

            if (sectionReq.items() != null) {
                for (TemplateItemRequest itemReq : sectionReq.items()) {
                    TemplateItem item = TemplateItem.builder()
                        .section(section)
                        .code(itemReq.code())
                        .title(itemReq.title())
                        .description(itemReq.description())
                        .responseType(itemReq.responseType())
                        .required(itemReq.required())
                        .observationRequiredOnFailure(itemReq.observationRequiredOnFailure())
                        .evidenceRequiredOnFailure(itemReq.evidenceRequiredOnFailure())
                        .optionsJson(itemReq.optionsJson())
                        .displayOrder(itemReq.displayOrder())
                        .build();
                    section.getItems().add(item);
                }
            }
            version.getSections().add(section);
        }

        TemplateVersion savedVersion = versionRepository.save(version);

        template.setStatus(TemplateStatus.ACTIVE);
        template.setCurrentVersion(nextVersionNumber);
        templateRepository.save(template);

        return savedVersion;
    }

}
