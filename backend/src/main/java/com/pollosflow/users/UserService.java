package com.pollosflow.users;

import com.pollosflow.audit.AuditService;
import com.pollosflow.common.Role;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class UserService {
    private final AppUserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final AuditService audit;
    private final KeycloakAdminClient keycloak;

    public UserService(AppUserRepository users, PasswordEncoder passwordEncoder, AuditService audit,
                       KeycloakAdminClient keycloak) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.audit = audit;
        this.keycloak = keycloak;
    }

    public AppUser create(UserDtos.CreateUserRequest request, Role actorRole) {
        String username = request.username().trim();
        if (users.existsByUsernameIgnoreCase(username)) {
            throw new IllegalArgumentException("Username already exists");
        }
        keycloak.createUser(username, request.password(), request.role());

        AppUser user = new AppUser();
        user.setUsername(username);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(request.role());
        user.setEnabled(true);
        user.setCreatedAt(OffsetDateTime.now());
        AppUser saved = users.save(user);

        audit.record(actorRole, "USER_CREATED", "app_user", saved.getId(),
                "Created account " + saved.getUsername() + " with role " + saved.getRole());
        return saved;
    }

    public List<AppUser> list() {
        return users.findAllByOrderByCreatedAtDesc();
    }

    public AppUser setEnabled(UUID id, boolean enabled, Role actorRole, String actorUsername) {
        AppUser user = users.findById(id).orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (user.getUsername().equalsIgnoreCase(actorUsername) && !enabled) {
            throw new IllegalStateException("Owner cannot disable own active session account");
        }
        user.setEnabled(enabled);
        AppUser saved = users.save(user);
        keycloak.setUserEnabled(saved.getUsername(), enabled);
        audit.record(actorRole, enabled ? "USER_ENABLED" : "USER_DISABLED", "app_user", saved.getId(),
                (enabled ? "Enabled account " : "Disabled account ") + saved.getUsername());
        return saved;
    }

    public UserDtos.UserResponse toResponse(AppUser user) {
        return new UserDtos.UserResponse(
                user.getId(),
                user.getUsername(),
                user.getRole(),
                user.isEnabled(),
                user.getCreatedAt());
    }
}
