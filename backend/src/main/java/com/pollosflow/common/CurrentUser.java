package com.pollosflow.common;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class CurrentUser {
    private final String roleHeader;

    public CurrentUser(@Value("${pollosflow.security.demo-header:X-Demo-Role}") String roleHeader) {
        this.roleHeader = roleHeader;
    }

    public Role role(HttpServletRequest request) {
        String raw = request.getHeader(roleHeader);
        if (raw == null || raw.isBlank()) {
            return Role.OWNER;
        }
        return Role.valueOf(raw.trim().toUpperCase());
    }

    public void require(HttpServletRequest request, Role... allowed) {
        Role actual = role(request);
        for (Role role : allowed) {
            if (role == actual) {
                return;
            }
        }
        throw new IllegalStateException("Role " + actual + " is not allowed for this action");
    }
}
