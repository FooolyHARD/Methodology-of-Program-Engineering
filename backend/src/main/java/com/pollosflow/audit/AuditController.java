package com.pollosflow.audit;

import com.pollosflow.common.Role;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/audit-events")
public class AuditController {
    private final AuditService service;

    public AuditController(AuditService service) {
        this.service = service;
    }

    @GetMapping
    public List<AuditEventResponse> latest() {
        return service.latest().stream()
                .map(e -> new AuditEventResponse(e.getId(), e.getOccurredAt(), e.getActorRole(), e.getAction(), e.getEntityType(), e.getEntityId(), e.getDetails()))
                .toList();
    }

    public record AuditEventResponse(UUID id, OffsetDateTime occurredAt, Role actorRole, String action,
                                     String entityType, String entityId, String details) {
    }
}
