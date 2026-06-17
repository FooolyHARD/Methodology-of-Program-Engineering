package com.pollosflow.messaging;

import com.pollosflow.audit.AuditEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Component
public class AuditEventPublisher {
    private static final Logger log = LoggerFactory.getLogger(AuditEventPublisher.class);

    private final RabbitTemplate rabbitTemplate;
    private final MessagingProperties properties;

    public AuditEventPublisher(RabbitTemplate rabbitTemplate, MessagingProperties properties) {
        this.rabbitTemplate = rabbitTemplate;
        this.properties = properties;
    }

    public void publish(AuditEvent event) {
        AuditEventMessage message = new AuditEventMessage(
                event.getId(),
                event.getOccurredAt(),
                event.getActorRole(),
                event.getAction(),
                event.getEntityType(),
                event.getEntityId(),
                event.getDetails());
        try {
            rabbitTemplate.convertAndSend(properties.getExchange(), properties.getAuditRoutingKey(), message);
        } catch (AmqpException exception) {
            log.warn("Audit event {} was saved but not published to RabbitMQ", event.getId(), exception);
        }
    }
}
