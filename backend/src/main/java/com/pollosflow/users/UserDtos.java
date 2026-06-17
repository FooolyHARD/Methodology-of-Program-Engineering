package com.pollosflow.users;

import com.pollosflow.common.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;
import java.util.UUID;

public class UserDtos {
    public record CreateUserRequest(
            @NotBlank @Size(min = 3, max = 80) String username,
            @NotBlank @Size(min = 8, max = 80) String password,
            @NotNull Role role) {
    }

    public record UserResponse(UUID id, String username, Role role, boolean enabled, OffsetDateTime createdAt) {
    }

    public record LoginRequest(@NotBlank String username, @NotBlank String password) {
    }

    public record CurrentUserResponse(String username, Role role) {
    }
}
