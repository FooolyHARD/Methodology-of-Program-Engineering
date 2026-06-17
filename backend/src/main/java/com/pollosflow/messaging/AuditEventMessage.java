package com.pollosflow.messaging;

import com.pollosflow.common.Role;

import java.time.OffsetDateTime;
import java.util.UUID;

public record AuditEventMessage(
        UUID id,
        OffsetDateTime occurredAt,
        Role actorRole,
        String action,
        String entityType,
        String entityId,
        String details) {
}
