package com.codemind.fieldops.client.dto;

import com.codemind.fieldops.client.domain.ClientStatus;
import java.time.Instant;
import java.util.UUID;

public record ClientResponse(
    UUID id,
    String name,
    String legalName,
    String document,
    String email,
    String phone,
    ClientStatus status,
    Instant createdAt,
    Instant updatedAt,
    int version) {
}
