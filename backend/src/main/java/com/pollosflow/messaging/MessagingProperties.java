package com.pollosflow.messaging;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "pollosflow.messaging")
public class MessagingProperties {
    private String exchange;
    private String auditQueue;
    private String auditRoutingKey;

    public String getExchange() {
        return exchange;
    }

    public void setExchange(String exchange) {
        this.exchange = exchange;
    }

    public String getAuditQueue() {
        return auditQueue;
    }

    public void setAuditQueue(String auditQueue) {
        this.auditQueue = auditQueue;
    }

    public String getAuditRoutingKey() {
        return auditRoutingKey;
    }

    public void setAuditRoutingKey(String auditRoutingKey) {
        this.auditRoutingKey = auditRoutingKey;
    }
}
