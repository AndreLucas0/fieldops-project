package com.codemind.fieldops.client.application;

import com.codemind.fieldops.client.domain.Client;
import com.codemind.fieldops.client.domain.ClientStatus;
import com.codemind.fieldops.client.dto.ClientCreateRequest;
import com.codemind.fieldops.client.dto.ClientUpdateRequest;
import com.codemind.fieldops.client.repository.ClientRepository;
import com.codemind.fieldops.shared.error.ResourceNotFoundException;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ClientService {

    private static final String CLIENT_NOT_FOUND_CODE = "CLIENT_NOT_FOUND";

    private final ClientRepository clientRepository;

    public ClientService(ClientRepository clientRepository) {
        this.clientRepository = clientRepository;
    }

    @Transactional(readOnly = true)
    public Page<Client> list(String name, ClientStatus status, Pageable pageable) {
        Specification<Client> specification = Specification
            .where(ClientSpecifications.nameContains(name))
            .and(ClientSpecifications.hasStatus(status));
        return clientRepository.findAll(specification, pageable);
    }

    @Transactional(readOnly = true)
    public Client getById(UUID id) {
        return clientRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException(CLIENT_NOT_FOUND_CODE, "Client not found"));
    }

    @Transactional
    public Client create(ClientCreateRequest request) {
        Client client = Client.builder()
            .name(request.name())
            .legalName(request.legalName())
            .document(request.document())
            .email(request.email())
            .phone(request.phone())
            .status(ClientStatus.ACTIVE)
            .build();
        return clientRepository.save(client);
    }

    @Transactional
    public Client update(UUID id, ClientUpdateRequest request) {
        Client client = getById(id);
        client.setName(request.name());
        client.setLegalName(request.legalName());
        client.setDocument(request.document());
        client.setEmail(request.email());
        client.setPhone(request.phone());
        return clientRepository.save(client);
    }

    @Transactional
    public Client updateStatus(UUID id, ClientStatus status) {
        Client client = getById(id);
        client.setStatus(status);
        return clientRepository.save(client);
    }

}
