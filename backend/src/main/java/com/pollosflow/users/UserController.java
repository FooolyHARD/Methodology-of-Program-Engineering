package com.pollosflow.users;

import com.pollosflow.common.CurrentUser;
import com.pollosflow.common.Role;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserService service;
    private final CurrentUser currentUser;

    public UserController(UserService service, CurrentUser currentUser) {
        this.service = service;
        this.currentUser = currentUser;
    }

    @GetMapping
    public List<UserDtos.UserResponse> list(HttpServletRequest request) {
        currentUser.require(request, Role.OWNER);
        return service.list().stream().map(service::toResponse).toList();
    }

    @PostMapping
    public UserDtos.UserResponse create(@Valid @RequestBody UserDtos.CreateUserRequest request,
                                        HttpServletRequest httpRequest) {
        currentUser.require(httpRequest, Role.OWNER);
        return service.toResponse(service.create(request, currentUser.role(httpRequest)));
    }

    @PostMapping("/{id}/disable")
    public UserDtos.UserResponse disable(@PathVariable UUID id, HttpServletRequest httpRequest) {
        currentUser.require(httpRequest, Role.OWNER);
        return service.toResponse(service.setEnabled(id, false, currentUser.role(httpRequest), currentUser.username()));
    }

    @PostMapping("/{id}/enable")
    public UserDtos.UserResponse enable(@PathVariable UUID id, HttpServletRequest httpRequest) {
        currentUser.require(httpRequest, Role.OWNER);
        return service.toResponse(service.setEnabled(id, true, currentUser.role(httpRequest), currentUser.username()));
    }
}
