package com.codemind.fieldops.client.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ClientUpdateRequest(
    @NotBlank @Size(max = 150) String name,
    @Size(max = 200) String legalName,
    @Size(max = 30) String document,
    @Email @Size(max = 255) String email,
    @Size(max = 30) String phone) {
}
