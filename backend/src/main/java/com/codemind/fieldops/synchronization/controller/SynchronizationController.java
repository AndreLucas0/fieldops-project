package com.codemind.fieldops.synchronization.controller;

import com.codemind.fieldops.synchronization.application.SynchronizationService;
import com.codemind.fieldops.synchronization.dto.SyncPullResponse;
import com.codemind.fieldops.synchronization.dto.SyncPushRequest;
import com.codemind.fieldops.synchronization.dto.SyncPushResponse;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/mobile/sync")
public class SynchronizationController {

    private final SynchronizationService synchronizationService;

    public SynchronizationController(SynchronizationService synchronizationService) {
        this.synchronizationService = synchronizationService;
    }

    @PostMapping("/push")
    @PreAuthorize("hasRole('TECHNICIAN')")
    public SyncPushResponse push(@Valid @RequestBody SyncPushRequest request, @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return synchronizationService.push(userId, request);
    }

    @GetMapping("/pull")
    @PreAuthorize("hasRole('TECHNICIAN')")
    public SyncPullResponse pull(@RequestParam(required = false) String cursor, @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return synchronizationService.pull(userId, cursor);
    }

}
