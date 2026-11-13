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
import com.codemind.fieldops.template.domain.TemplateVersionStatus;
import com.codemind.fieldops.template.dto.TemplateCreateRequest;
import com.codemind.fieldops.template.dto.TemplateDraftItemRequest;
import com.codemind.fieldops.template.dto.TemplateDraftSectionRequest;
import com.codemind.fieldops.template.dto.TemplateItemRequest;
import com.codemind.fieldops.template.dto.TemplateSectionCreateRequest;
import com.codemind.fieldops.template.dto.TemplateSectionRequest;
import com.codemind.fieldops.template.dto.TemplateUpdateRequest;
import com.codemind.fieldops.template.repository.InspectionTemplateRepository;
import com.codemind.fieldops.template.repository.TemplateItemRepository;
import com.codemind.fieldops.template.repository.TemplateSectionRepository;
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
import java.util.function.Supplier;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TemplateService {

    private static final String TEMPLATE_NOT_FOUND_CODE = "TEMPLATE_NOT_FOUND";
    private static final String TEMPLATE_NOT_DRAFT_CODE = "TEMPLATE_NOT_DRAFT";
    private static final String TEMPLATE_HAS_NO_SECTIONS_CODE = "TEMPLATE_HAS_NO_SECTIONS";
    private static final String USER_NOT_FOUND_CODE = "USER_NOT_FOUND";
    private static final String TEMPLATE_VERSION_NOT_FOUND_CODE = "TEMPLATE_VERSION_NOT_FOUND";
    private static final String TEMPLATE_HAS_NO_ITEMS_CODE = "TEMPLATE_HAS_NO_ITEMS";
    private static final String TEMPLATE_NOT_EDITABLE_CODE = "TEMPLATE_NOT_EDITABLE";
    private static final String TEMPLATE_VERSION_NOT_EDITABLE_CODE = "TEMPLATE_VERSION_NOT_EDITABLE";
    private static final String TEMPLATE_SECTION_NOT_FOUND_CODE = "TEMPLATE_SECTION_NOT_FOUND";
    private static final String TEMPLATE_ITEM_NOT_FOUND_CODE = "TEMPLATE_ITEM_NOT_FOUND";
    private static final String DISPLAY_ORDER_TAKEN_CODE = "DISPLAY_ORDER_TAKEN";
    private static final String TEMPLATE_DRAFT_IN_PROGRESS_CODE = "TEMPLATE_DRAFT_IN_PROGRESS";
    // Drafts share one placeholder number, below every published version (one draft per template)
    private static final int DRAFT_VERSION_NUMBER = 0;

    private final InspectionTemplateRepository templateRepository;
    private final TemplateVersionRepository versionRepository;
    private final TemplateSectionRepository sectionRepository;
    private final TemplateItemRepository itemRepository;
    private final UserRepository userRepository;

    public TemplateService(InspectionTemplateRepository templateRepository,
                           TemplateVersionRepository versionRepository,
                           TemplateSectionRepository sectionRepository,
                           TemplateItemRepository itemRepository,
                           UserRepository userRepository) {
        this.templateRepository = templateRepository;
        this.versionRepository = versionRepository;
        this.sectionRepository = sectionRepository;
        this.itemRepository = itemRepository;
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

    @Transactional(readOnly = true)
    public Page<TemplateVersion> listVersions(UUID templateId, Pageable pageable) {
        getById(templateId);
        Page<TemplateVersion> versions = versionRepository.findByTemplateIdAndStatusOrderByVersionNumberDesc(
            templateId, TemplateVersionStatus.PUBLISHED, pageable);
        versions.forEach(v -> v.getSections().forEach(s -> s.getItems().size()));
        return versions;
    }

    @Transactional(readOnly = true)
    public TemplateVersion getVersion(UUID versionId) {
        // Drafts are only exposed through the builder routes, never as a published version
        TemplateVersion version = versionRepository.findById(versionId)
            .filter(v -> !v.isDraft())
            .orElseThrow(() -> new ResourceNotFoundException(TEMPLATE_VERSION_NOT_FOUND_CODE, "Template version not found"));
        version.getSections().forEach(s -> s.getItems().size());
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
        InspectionTemplate template = getById(templateId);
        if (sections == null || sections.isEmpty()) {
            throw new BusinessRuleViolationException(TEMPLATE_HAS_NO_SECTIONS_CODE, "Template must have at least one section to be published");
        }
        // Publishing another structure would leave the open draft stale (decisions.md 2026-09-29)
        if (versionRepository.findByTemplateIdAndStatus(templateId, TemplateVersionStatus.DRAFT).isPresent()) {
            throw new ResourceConflictException(TEMPLATE_DRAFT_IN_PROGRESS_CODE,
                "Template has a draft in progress; publish it without a request body");
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

        return activate(template, version);
    }

    // ── BF-005: incremental builder over the template's DRAFT version ───────

    @Transactional(readOnly = true)
    public List<TemplateSection> listDraftSections(UUID templateId) {
        getById(templateId);
        return versionRepository.findByTemplateIdAndStatus(templateId, TemplateVersionStatus.DRAFT)
            .map(draft -> {
                draft.getSections().forEach(s -> s.getItems().size());
                return draft.getSections();
            })
            .orElseGet(List::of);
    }

    @Transactional
    public TemplateSection createSection(UUID templateId, TemplateSectionCreateRequest request) {
        TemplateVersion draft = getOrCreateDraft(getById(templateId));
        requireFreeSectionOrder(draft, request.displayOrder(), null);

        TemplateSection section = TemplateSection.builder()
            .templateVersion(draft)
            .title(request.title())
            .description(request.description())
            .displayOrder(request.displayOrder())
            .items(new ArrayList<>())
            .build();
        draft.getSections().add(section);
        return saveWithFreeOrder(() -> sectionRepository.saveAndFlush(section));
    }

    @Transactional
    public TemplateSection updateSection(UUID templateId, UUID sectionId, TemplateSectionCreateRequest request) {
        TemplateSection section = getEditableSection(templateId, sectionId);
        requireFreeSectionOrder(section.getTemplateVersion(), request.displayOrder(), section.getId());

        section.setTitle(request.title());
        section.setDescription(request.description());
        section.setDisplayOrder(request.displayOrder());
        section.getItems().size();
        return saveWithFreeOrder(() -> sectionRepository.saveAndFlush(section));
    }

    @Transactional
    public TemplateItem createItem(UUID templateId, UUID sectionId, TemplateItemRequest request) {
        TemplateSection section = getEditableSection(templateId, sectionId);
        requireFreeItemOrder(section, request.displayOrder(), null);

        TemplateItem item = TemplateItem.builder().section(section).build();
        applyItemFields(item, request);
        section.getItems().add(item);
        return saveWithFreeOrder(() -> itemRepository.saveAndFlush(item));
    }

    @Transactional
    public TemplateItem updateItem(UUID templateId, UUID itemId, TemplateItemRequest request) {
        requireEditableTemplate(getById(templateId));
        TemplateItem item = itemRepository.findById(itemId)
            .filter(i -> i.getSection().getTemplateVersion().getTemplate().getId().equals(templateId))
            .orElseThrow(() -> new ResourceNotFoundException(TEMPLATE_ITEM_NOT_FOUND_CODE, "Template item not found"));
        requireDraft(item.getSection().getTemplateVersion());
        requireFreeItemOrder(item.getSection(), request.displayOrder(), item.getId());

        applyItemFields(item, request);
        return saveWithFreeOrder(() -> itemRepository.saveAndFlush(item));
    }

    /**
     * Promotes the template's DRAFT version to the new published version
     * (openapi: {@code POST /inspection-templates/{id}/publish} without body; RN-015, RN-016, RN-020).
     */
    @Transactional
    public TemplateVersion publishDraft(UUID templateId, UUID publishedByUserId) {
        InspectionTemplate template = getById(templateId);
        requireEditableTemplate(template);
        TemplateVersion draft = versionRepository.findByTemplateIdAndStatus(templateId, TemplateVersionStatus.DRAFT)
            .filter(v -> !v.getSections().isEmpty())
            .orElseThrow(() -> new BusinessRuleViolationException(TEMPLATE_HAS_NO_SECTIONS_CODE,
                "Template must have at least one section to be published"));
        if (draft.getSections().stream().allMatch(s -> s.getItems().isEmpty())) {
            throw new BusinessRuleViolationException(TEMPLATE_HAS_NO_ITEMS_CODE,
                "Template must have at least one item to be published");
        }

        User publishedBy = userRepository.findById(publishedByUserId)
            .orElseThrow(() -> new ResourceNotFoundException(USER_NOT_FOUND_CODE, "User not found"));

        int nextVersionNumber = versionRepository.findMaxVersionNumberByTemplateId(templateId)
            .map(v -> v + 1)
            .orElse(1);

        draft.setStatus(TemplateVersionStatus.PUBLISHED);
        draft.setVersionNumber(nextVersionNumber);
        draft.setTitleSnapshot(template.getTitle());
        draft.setDescriptionSnapshot(template.getDescription());
        draft.setPublishedBy(publishedBy);
        draft.setPublishedAt(Instant.now());

        return activate(template, draft);
    }

    /** Makes {@code version} the only one active for new inspections and marks the template ACTIVE. */
    private TemplateVersion activate(InspectionTemplate template, TemplateVersion version) {
        versionRepository.findActiveVersionsByTemplateId(template.getId())
            .forEach(v -> v.setActiveForNewInspections(false));
        version.setActiveForNewInspections(true);

        // Flush inside the try so concurrent publishes surface here as 409, not as a 500 at commit
        try {
            TemplateVersion savedVersion = versionRepository.saveAndFlush(version);
            template.setStatus(TemplateStatus.ACTIVE);
            template.setCurrentVersion(version.getVersionNumber());
            templateRepository.saveAndFlush(template);
            return savedVersion;
        } catch (ObjectOptimisticLockingFailureException | DataIntegrityViolationException ex) {
            throw new ResourceConflictException("CONCURRENT_PUBLISH",
                "Another publish for this template is in progress. Please retry.");
        }
    }

    private void requireEditableTemplate(InspectionTemplate template) {
        if (template.getStatus() == TemplateStatus.INACTIVE) {
            throw new ResourceConflictException(TEMPLATE_NOT_EDITABLE_CODE, "Inactive templates cannot be edited");
        }
    }

    private <T> T saveWithFreeOrder(Supplier<T> save) {
        try {
            return save.get();
        } catch (DataIntegrityViolationException ex) {
            // UNIQUE display_order raced with a concurrent builder write
            throw new ResourceConflictException(DISPLAY_ORDER_TAKEN_CODE, "displayOrder is already in use");
        }
    }

    private TemplateVersion getOrCreateDraft(InspectionTemplate template) {
        requireEditableTemplate(template);
        return versionRepository.findByTemplateIdAndStatus(template.getId(), TemplateVersionStatus.DRAFT)
            .orElseGet(() -> createDraft(template));
    }

    private TemplateVersion createDraft(InspectionTemplate template) {
        TemplateVersion draft = TemplateVersion.builder()
            .template(template)
            .status(TemplateVersionStatus.DRAFT)
            .versionNumber(DRAFT_VERSION_NUMBER)
            .titleSnapshot(template.getTitle())
            .descriptionSnapshot(template.getDescription())
            .activeForNewInspections(false)
            .sections(new ArrayList<>())
            .build();

        // RN-020: changing a published template starts the new version from the active structure
        versionRepository.findActiveVersionsByTemplateId(template.getId()).stream()
            .findFirst()
            .ifPresent(active -> active.getSections().forEach(s -> draft.getSections().add(copySection(s, draft))));

        try {
            return versionRepository.saveAndFlush(draft);
        } catch (DataIntegrityViolationException ex) {
            // uq_template_versions_one_draft: another request opened the draft concurrently
            throw new ResourceConflictException("CONCURRENT_DRAFT",
                "Another edit for this template is in progress. Please retry.");
        }
    }

    private TemplateSection copySection(TemplateSection source, TemplateVersion target) {
        TemplateSection copy = TemplateSection.builder()
            .templateVersion(target)
            .title(source.getTitle())
            .description(source.getDescription())
            .displayOrder(source.getDisplayOrder())
            .items(new ArrayList<>())
            .build();
        for (TemplateItem item : source.getItems()) {
            copy.getItems().add(TemplateItem.builder()
                .section(copy)
                .code(item.getCode())
                .title(item.getTitle())
                .description(item.getDescription())
                .responseType(item.getResponseType())
                .required(item.getRequired())
                .observationRequiredOnFailure(item.getObservationRequiredOnFailure())
                .evidenceRequiredOnFailure(item.getEvidenceRequiredOnFailure())
                .optionsJson(item.getOptionsJson())
                .displayOrder(item.getDisplayOrder())
                .build());
        }
        return copy;
    }

    private TemplateSection getEditableSection(UUID templateId, UUID sectionId) {
        requireEditableTemplate(getById(templateId));
        TemplateSection section = sectionRepository.findById(sectionId)
            .filter(s -> s.getTemplateVersion().getTemplate().getId().equals(templateId))
            .orElseThrow(() -> new ResourceNotFoundException(TEMPLATE_SECTION_NOT_FOUND_CODE, "Template section not found"));
        requireDraft(section.getTemplateVersion());
        return section;
    }

    private void requireDraft(TemplateVersion version) {
        // RN-019: a published version cannot be changed destructively
        if (!version.isDraft()) {
            throw new ResourceConflictException(TEMPLATE_VERSION_NOT_EDITABLE_CODE,
                "Published template versions cannot be changed");
        }
    }

    private void requireFreeSectionOrder(TemplateVersion version, int displayOrder, UUID ignoredSectionId) {
        boolean taken = version.getSections().stream()
            .anyMatch(s -> s.getDisplayOrder() == displayOrder && !s.getId().equals(ignoredSectionId));
        if (taken) {
            throw new ResourceConflictException(DISPLAY_ORDER_TAKEN_CODE,
                "Another section already uses displayOrder " + displayOrder);
        }
    }

    private void requireFreeItemOrder(TemplateSection section, int displayOrder, UUID ignoredItemId) {
        boolean taken = section.getItems().stream()
            .anyMatch(i -> i.getDisplayOrder() == displayOrder && !i.getId().equals(ignoredItemId));
        if (taken) {
            throw new ResourceConflictException(DISPLAY_ORDER_TAKEN_CODE,
                "Another item in this section already uses displayOrder " + displayOrder);
        }
    }

    private void applyItemFields(TemplateItem item, TemplateItemRequest request) {
        item.setCode(request.code());
        item.setTitle(request.title());
        item.setDescription(request.description());
        item.setResponseType(request.responseType());
        item.setRequired(Boolean.TRUE.equals(request.required()));
        item.setObservationRequiredOnFailure(Boolean.TRUE.equals(request.observationRequiredOnFailure()));
        item.setEvidenceRequiredOnFailure(Boolean.TRUE.equals(request.evidenceRequiredOnFailure()));
        item.setOptionsJson(request.optionsJson());
        item.setDisplayOrder(request.displayOrder());
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
