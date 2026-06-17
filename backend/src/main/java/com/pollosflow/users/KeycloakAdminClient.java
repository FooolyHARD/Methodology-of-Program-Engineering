package com.pollosflow.users;

import com.pollosflow.common.Role;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Component
public class KeycloakAdminClient {
    private final KeycloakProperties properties;
    private final RestClient restClient;

    public KeycloakAdminClient(KeycloakProperties properties, RestClient.Builder restClientBuilder) {
        this.properties = properties;
        this.restClient = restClientBuilder.build();
    }

    public void createUser(String username, String password, Role role) {
        if (!properties.isEnabled()) {
            return;
        }
        String token = adminToken();
        try {
            restClient.post()
                    .uri(properties.getBaseUrl() + "/admin/realms/{realm}/users", properties.getRealm())
                    .headers(headers -> headers.setBearerAuth(token))
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "username", username,
                            "email", username + "@pollosflow.local",
                            "firstName", username,
                            "lastName", "User",
                            "emailVerified", true,
                            "requiredActions", List.of(),
                            "enabled", true,
                            "credentials", List.of(Map.of(
                                    "type", "password",
                                    "value", password,
                                    "temporary", false))))
                    .retrieve()
                    .toBodilessEntity();
        } catch (HttpClientErrorException.Conflict ignored) {
            // The local database already guards duplicate usernames. This keeps sync idempotent
            // if a Keycloak user was created during a previous failed local transaction.
        }

        String userId = findUserId(username, token);
        assignRealmRole(userId, role, token);
    }

    public void setUserEnabled(String username, boolean enabled) {
        if (!properties.isEnabled()) {
            return;
        }
        String token = adminToken();
        String userId = findUserId(username, token);
        restClient.put()
                .uri(properties.getBaseUrl() + "/admin/realms/{realm}/users/{id}", properties.getRealm(), userId)
                .headers(headers -> headers.setBearerAuth(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("enabled", enabled))
                .retrieve()
                .toBodilessEntity();
    }

    private String adminToken() {
        LinkedMultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", "password");
        form.add("client_id", properties.getAdminClientId());
        form.add("username", properties.getAdminUsername());
        form.add("password", properties.getAdminPassword());

        Map<String, Object> response = restClient.post()
                .uri(properties.getBaseUrl() + "/realms/{realm}/protocol/openid-connect/token", properties.getAdminRealm())
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form)
                .retrieve()
                .body(new ParameterizedTypeReference<>() {
                });
        if (response == null || !(response.get("access_token") instanceof String token)) {
            throw new IllegalStateException("Keycloak admin token response is invalid");
        }
        return token;
    }

    private String findUserId(String username, String token) {
        List<Map<String, Object>> users = restClient.get()
                .uri(properties.getBaseUrl() + "/admin/realms/{realm}/users?username={username}&exact=true",
                        properties.getRealm(), username)
                .headers(headers -> headers.setBearerAuth(token))
                .retrieve()
                .body(new ParameterizedTypeReference<>() {
                });
        if (users == null || users.isEmpty() || !(users.get(0).get("id") instanceof String id)) {
            throw new IllegalStateException("Keycloak user was not found after sync: " + username);
        }
        return id;
    }

    private void assignRealmRole(String userId, Role role, String token) {
        Map<String, Object> roleRepresentation = restClient.get()
                .uri(properties.getBaseUrl() + "/admin/realms/{realm}/roles/{role}",
                        properties.getRealm(), role.name())
                .headers(headers -> headers.setBearerAuth(token))
                .retrieve()
                .body(new ParameterizedTypeReference<>() {
                });
        if (roleRepresentation == null) {
            throw new IllegalStateException("Keycloak role was not found: " + role.name());
        }
        restClient.post()
                .uri(properties.getBaseUrl() + "/admin/realms/{realm}/users/{id}/role-mappings/realm",
                        properties.getRealm(), userId)
                .headers(headers -> headers.setBearerAuth(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body(List.of(roleRepresentation))
                .retrieve()
                .toBodilessEntity();
    }
}
