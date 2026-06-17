package com.pollosflow.audit;

import com.pollosflow.common.Role;
import com.pollosflow.messaging.AuditEventPublisher;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class AuditService {
    private final AuditEventRepository repository;
    private final AuditEventPublisher publisher;

    public AuditService(AuditEventRepository repository, AuditEventPublisher publisher) {
        this.repository = repository;
        this.publisher = publisher;
    }

    public void record(Role role, String action, String entityType, UUID entityId, String details) {
        AuditEvent event = new AuditEvent();
        event.setOccurredAt(OffsetDateTime.now());
        event.setActorRole(role);
        event.setAction(action);
        event.setEntityType(entityType);
        event.setEntityId(entityId.toString());
        event.setDetails(details);
        AuditEvent saved = repository.save(event);
        publisher.publish(saved);
    }

    public List<AuditEvent> latest() {
        return repository.findTop50ByOrderByOccurredAtDesc();
    }
}
