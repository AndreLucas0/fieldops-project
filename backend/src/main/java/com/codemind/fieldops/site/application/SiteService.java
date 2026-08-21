package com.codemind.fieldops.site.application;

import com.codemind.fieldops.client.application.ClientService;
import com.codemind.fieldops.client.domain.Client;
import com.codemind.fieldops.shared.error.ResourceNotFoundException;
import com.codemind.fieldops.site.domain.InspectionSite;
import com.codemind.fieldops.site.domain.SiteStatus;
import com.codemind.fieldops.site.dto.SiteCreateRequest;
import com.codemind.fieldops.site.dto.SiteUpdateRequest;
import com.codemind.fieldops.site.repository.InspectionSiteRepository;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SiteService {

    private static final String SITE_NOT_FOUND_CODE = "SITE_NOT_FOUND";

    private final InspectionSiteRepository siteRepository;
    private final ClientService clientService;

    public SiteService(InspectionSiteRepository siteRepository, ClientService clientService) {
        this.siteRepository = siteRepository;
        this.clientService = clientService;
    }

    @Transactional(readOnly = true)
    public Page<InspectionSite> list(UUID clientId, String name, SiteStatus status, Pageable pageable) {
        Specification<InspectionSite> specification = Specification
            .where(SiteSpecifications.hasClientId(clientId))
            .and(SiteSpecifications.nameContains(name))
            .and(SiteSpecifications.hasStatus(status));
        return siteRepository.findAll(specification, pageable);
    }

    @Transactional(readOnly = true)
    public InspectionSite getById(UUID id) {
        return siteRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException(SITE_NOT_FOUND_CODE, "Site not found"));
    }

    @Transactional
    public InspectionSite create(SiteCreateRequest request) {
        Client client = clientService.getById(request.clientId());
        InspectionSite site = InspectionSite.builder()
            .client(client)
            .name(request.name())
            .description(request.description())
            .addressLine(request.addressLine())
            .city(request.city())
            .state(request.state())
            .postalCode(request.postalCode())
            .latitude(request.latitude())
            .longitude(request.longitude())
            .contactName(request.contactName())
            .contactPhone(request.contactPhone())
            .status(SiteStatus.ACTIVE)
            .build();
        return siteRepository.save(site);
    }

    @Transactional
    public InspectionSite update(UUID id, SiteUpdateRequest request) {
        InspectionSite site = getById(id);
        site.setName(request.name());
        site.setDescription(request.description());
        site.setAddressLine(request.addressLine());
        site.setCity(request.city());
        site.setState(request.state());
        site.setPostalCode(request.postalCode());
        site.setLatitude(request.latitude());
        site.setLongitude(request.longitude());
        site.setContactName(request.contactName());
        site.setContactPhone(request.contactPhone());
        return siteRepository.save(site);
    }

    @Transactional
    public InspectionSite updateStatus(UUID id, SiteStatus status) {
        InspectionSite site = getById(id);
        site.setStatus(status);
        return siteRepository.save(site);
    }

}
