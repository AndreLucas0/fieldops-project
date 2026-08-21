package com.codemind.fieldops.client.controller;

import com.codemind.fieldops.client.application.ClientService;
import com.codemind.fieldops.client.domain.Client;
import com.codemind.fieldops.client.domain.ClientStatus;
import com.codemind.fieldops.client.dto.ClientCreateRequest;
import com.codemind.fieldops.client.dto.ClientResponse;
import com.codemind.fieldops.client.dto.ClientStatusUpdateRequest;
import com.codemind.fieldops.client.dto.ClientUpdateRequest;
import com.codemind.fieldops.client.mapper.ClientMapper;
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
@RequestMapping("/clients")
public class ClientController {

    private static final Set<String> SORTABLE_FIELDS = Set.of("name", "status", "createdAt");

    private final ClientService clientService;
    private final ClientMapper clientMapper;

    public ClientController(ClientService clientService, ClientMapper clientMapper) {
        this.clientService = clientService;
        this.clientMapper = clientMapper;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public PageResponse<ClientResponse> list(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) ClientStatus status,
            @PageableDefault(size = 20) Pageable pageable) {
        SortFieldValidator.validate(pageable.getSort(), SORTABLE_FIELDS);
        Page<Client> clients = clientService.list(name, status, pageable);
        return PageResponse.from(clients.map(clientMapper::toResponse));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public ClientResponse create(@Valid @RequestBody ClientCreateRequest request) {
        return clientMapper.toResponse(clientService.create(request));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public ClientResponse get(@PathVariable UUID id) {
        return clientMapper.toResponse(clientService.getById(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public ClientResponse update(@PathVariable UUID id, @Valid @RequestBody ClientUpdateRequest request) {
        return clientMapper.toResponse(clientService.update(id, request));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public ClientResponse updateStatus(@PathVariable UUID id, @Valid @RequestBody ClientStatusUpdateRequest request) {
        return clientMapper.toResponse(clientService.updateStatus(id, request.status()));
    }

}
