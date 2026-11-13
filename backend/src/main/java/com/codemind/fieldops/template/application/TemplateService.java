package com.codemind.fieldops.template.application;

import com.codemind.fieldops.shared.error.BusinessRuleViolationException;
import com.codemind.fieldops.shared.error.ResourceConflictException;
import com.codemind.fieldops.shared.error.ResourceNotFoundException;
import com.codemind.fieldops.template.domain.InspectionTemplate;
import com.codemind.fieldops.template.domain.TemplateItem;
import com.codemind.fieldops.template.domain.TemplateSection;
import com.codemind.fieldops.template.domain.TemplateDraftItem;
import com.codemind.fieldops.template.domain.TemplateDraftSection;
import com.codemind.fieldops.template.domain.TemplateStatus;
import com.codemind.fieldops.template.domain.TemplateVersion;
import com.codemind.fieldops.template.dto.TemplateCreateRequest;
import com.codemind.fieldops.template.dto.TemplateDraftItemRequest;
import com.codemind.fieldops.template.dto.TemplateDraftSectionRequest;
import com.codemind.fieldops.template.dto.TemplateItemRequest;
import com.codemind.fieldops.template.dto.TemplateSectionRequest;
import com.codemind.fieldops.template.dto.TemplateUpdateRequest;
import com.codemind.fieldops.template.repository.InspectionTemplateRepository;
import com.codemind.fieldops.template.repository.TemplateDraftItemRepository;
import com.codemind.fieldops.template.repository.TemplateDraftSectionRepository;
import com.codemind.fieldops.template.repository.TemplateVersionRepository;
import com.codemind.fieldops.user.domain.User;
import com.codemind.fieldops.user.repository.UserRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
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
    private final TemplateDraftSectionRepository draftSectionRepository;
    private final TemplateDraftItemRepository draftItemRepository;
    private final UserRepository userRepository;

    public TemplateService(InspectionTemplateRepository templateRepository,
                           TemplateVersionRepository versionRepository,
                           TemplateDraftSectionRepository draftSectionRepository,
                           TemplateDraftItemRepository draftItemRepository,
                           UserRepository userRepository) {
        this.templateRepository = templateRepository;
        this.versionRepository = versionRepository;
        this.draftSectionRepository = draftSectionRepository;
        this.draftItemRepository = draftItemRepository;
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
        InspectionTemplate saved = templateRepository.save(template);
        if (request.sections() != null) {
            for (TemplateSectionRequest section : request.sections()) {
                TemplateDraftSection draftSection = draftSectionRepository.save(TemplateDraftSection.builder()
                    .template(saved)
                    .title(section.title())
                    .description(section.description())
                    .displayOrder(section.displayOrder())
                    .build());
                if (section.items() != null) {
                    for (TemplateItemRequest item : section.items()) {
                        draftItemRepository.save(TemplateDraftItem.builder()
                            .section(draftSection)
                            .code(item.code())
                            .title(item.title())
                            .description(item.description())
                            .responseType(item.responseType())
                            .required(item.required())
                            .observationRequiredOnFailure(item.observationRequiredOnFailure())
                            .evidenceRequiredOnFailure(item.evidenceRequiredOnFailure())
                            .optionsJson(item.optionsJson())
                            .displayOrder(item.displayOrder())
                            .build());
                    }
                }
            }
        }
        return saved;
    }

    @Transactional
    public InspectionTemplate update(UUID id, TemplateUpdateRequest request) {
        InspectionTemplate template = requireEditableTemplate(id);
        template.setTitle(request.title());
        template.setDescription(request.description());
        template.setCategory(request.category());
        return templateRepository.save(template);
    }

    @Transactional(readOnly = true)
    public List<TemplateDraftSection> listDraftSections(UUID templateId) {
        getById(templateId);
        return draftSectionRepository.findByTemplateIdOrderByDisplayOrderAsc(templateId);
    }

    @Transactional
    public TemplateDraftSection createDraftSection(UUID templateId, TemplateDraftSectionRequest request) {
        InspectionTemplate template = requireEditableTemplate(templateId);
        int nextOrder = draftSectionRepository.findByTemplateIdOrderByDisplayOrderAsc(templateId).size() + 1;
        return draftSectionRepository.save(TemplateDraftSection.builder()
            .template(template)
            .title(request.title())
            .description(request.description())
            .displayOrder(nextOrder)
            .build());
    }

    @Transactional
    public TemplateDraftSection updateDraftSection(
            UUID templateId,
            UUID sectionId,
            TemplateDraftSectionRequest request) {
        requireEditableTemplate(templateId);
        TemplateDraftSection section = draftSectionRepository.findByIdAndTemplateId(sectionId, templateId)
            .orElseThrow(() -> new ResourceNotFoundException("TEMPLATE_SECTION_NOT_FOUND", "Template section not found"));
        section.setTitle(request.title());
        section.setDescription(request.description());
        return draftSectionRepository.save(section);
    }

    @Transactional
    public void reorderDraftSections(UUID templateId, List<UUID> orderedIds) {
        requireEditableTemplate(templateId);
        List<TemplateDraftSection> sections = draftSectionRepository.findAllForUpdateByTemplateId(templateId);
        validateOrder(orderedIds, sections.stream().map(TemplateDraftSection::getId).toList());
        Map<UUID, TemplateDraftSection> sectionsById = indexById(sections, TemplateDraftSection::getId);
        for (int index = 0; index < orderedIds.size(); index++) {
            sectionsById.get(orderedIds.get(index)).setDisplayOrder(index + 1);
        }
        draftSectionRepository.saveAll(sections);
    }

    @Transactional
    public TemplateDraftItem createDraftItem(
            UUID templateId,
            UUID sectionId,
            TemplateDraftItemRequest request) {
        requireEditableTemplate(templateId);
        TemplateDraftSection section = draftSectionRepository.findByIdAndTemplateId(sectionId, templateId)
            .orElseThrow(() -> new ResourceNotFoundException("TEMPLATE_SECTION_NOT_FOUND", "Template section not found"));
        int nextOrder = draftItemRepository.findBySectionIdOrderByDisplayOrderAsc(sectionId).size() + 1;
        return draftItemRepository.save(TemplateDraftItem.builder()
            .section(section)
            .code(request.code())
            .title(request.title())
            .description(request.description())
            .responseType(request.responseType())
            .required(request.required())
            .observationRequiredOnFailure(request.observationRequiredOnFailure())
            .evidenceRequiredOnFailure(request.evidenceRequiredOnFailure())
            .optionsJson(request.optionsJson())
            .displayOrder(nextOrder)
            .build());
    }

    @Transactional
    public TemplateDraftItem updateDraftItem(
            UUID templateId,
            UUID itemId,
            TemplateDraftItemRequest request) {
        requireEditableTemplate(templateId);
        TemplateDraftItem item = draftItemRepository.findByIdAndTemplateId(itemId, templateId)
            .orElseThrow(() -> new ResourceNotFoundException("TEMPLATE_ITEM_NOT_FOUND", "Template item not found"));
        item.setCode(request.code());
        item.setTitle(request.title());
        item.setDescription(request.description());
        item.setResponseType(request.responseType());
        item.setRequired(request.required());
        item.setObservationRequiredOnFailure(request.observationRequiredOnFailure());
        item.setEvidenceRequiredOnFailure(request.evidenceRequiredOnFailure());
        item.setOptionsJson(request.optionsJson());
        return draftItemRepository.save(item);
    }

    @Transactional
    public void reorderDraftItems(UUID templateId, UUID sectionId, List<UUID> orderedIds) {
        requireEditableTemplate(templateId);
        if (draftSectionRepository.findByIdAndTemplateId(sectionId, templateId).isEmpty()) {
            throw new ResourceNotFoundException("TEMPLATE_SECTION_NOT_FOUND", "Template section not found");
        }
        List<TemplateDraftItem> items = draftItemRepository.findAllForUpdateBySectionId(sectionId);
        validateOrder(orderedIds, items.stream().map(TemplateDraftItem::getId).toList());
        Map<UUID, TemplateDraftItem> itemsById = indexById(items, TemplateDraftItem::getId);
        for (int index = 0; index < orderedIds.size(); index++) {
            itemsById.get(orderedIds.get(index)).setDisplayOrder(index + 1);
        }
        draftItemRepository.saveAll(items);
    }

    private InspectionTemplate requireEditableTemplate(UUID templateId) {
        InspectionTemplate template = templateRepository.findByIdForUpdate(templateId)
            .orElseThrow(() -> new ResourceNotFoundException(TEMPLATE_NOT_FOUND_CODE, "Template not found"));
        if (template.getStatus() != TemplateStatus.DRAFT) {
            throw new ResourceConflictException(
                TEMPLATE_NOT_DRAFT_CODE,
                "The template does not have an editable draft version");
        }
        return template;
    }

    private void validateOrder(List<UUID> requestedIds, List<UUID> existingIds) {
        Set<UUID> requested = new HashSet<>(requestedIds);
        if (requested.size() != requestedIds.size() || !requested.equals(new HashSet<>(existingIds))) {
            throw new BusinessRuleViolationException(
                "INVALID_TEMPLATE_ORDER",
                "The order must contain every draft item exactly once");
        }
    }

    private <T> Map<UUID, T> indexById(List<T> entities, Function<T, UUID> id) {
        return entities.stream().collect(Collectors.toMap(id, Function.identity()));
    }

    @Transactional
    public TemplateVersion publish(UUID templateId, UUID publishedByUserId, List<TemplateSectionRequest> sections) {
        InspectionTemplate template = templateRepository.findByIdForUpdate(templateId)
            .orElseThrow(() -> new ResourceNotFoundException(TEMPLATE_NOT_FOUND_CODE, "Template not found"));
        if (template.getStatus() != TemplateStatus.DRAFT) {
            throw new BusinessRuleViolationException(TEMPLATE_NOT_DRAFT_CODE, "Only DRAFT templates can be published");
        }
        List<TemplateSectionRequest> sectionsToPublish = draftSectionRepository
            .findByTemplateIdOrderByDisplayOrderAsc(templateId)
            .stream()
            .map(this::toPublishRequest)
            .toList();
        if (sectionsToPublish.isEmpty()) {
            sectionsToPublish = sections;
        }
        if (sectionsToPublish == null || sectionsToPublish.isEmpty()) {
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

        for (TemplateSectionRequest sectionReq : sectionsToPublish) {
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

    private TemplateSectionRequest toPublishRequest(TemplateDraftSection section) {
        List<TemplateItemRequest> items = section.getItems().stream()
            .map(item -> new TemplateItemRequest(
                item.getCode(),
                item.getTitle(),
                item.getDescription(),
                item.getResponseType(),
                item.getRequired(),
                item.getObservationRequiredOnFailure(),
                item.getEvidenceRequiredOnFailure(),
                item.getOptionsJson(),
                item.getDisplayOrder()))
            .toList();
        return new TemplateSectionRequest(
            section.getTitle(),
            section.getDescription(),
            section.getDisplayOrder(),
            items);
    }

}
