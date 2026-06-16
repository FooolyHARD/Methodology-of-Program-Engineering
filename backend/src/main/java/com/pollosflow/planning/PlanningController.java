package com.pollosflow.planning;

import com.pollosflow.common.CurrentUser;
import com.pollosflow.common.Role;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/distribution-plans")
public class PlanningController {
    private final PlanningService service;
    private final CurrentUser currentUser;

    public PlanningController(PlanningService service, CurrentUser currentUser) {
        this.service = service;
        this.currentUser = currentUser;
    }

    @GetMapping
    public List<PlanningDtos.PlanResponse> list() {
        return service.list().stream().map(service::toResponse).toList();
    }

    @PostMapping
    public PlanningDtos.PlanResponse create(@Valid @RequestBody PlanningDtos.CreatePlanRequest request,
                                            HttpServletRequest httpRequest) {
        currentUser.require(httpRequest, Role.OWNER, Role.ADMIN);
        return service.toResponse(service.create(request.intakeId(), currentUser.role(httpRequest)));
    }

    @PostMapping("/{id}/recalculate")
    public PlanningDtos.PlanResponse recalculate(@PathVariable UUID id,
                                                 @RequestBody PlanningDtos.RecalculatePlanRequest request,
                                                 HttpServletRequest httpRequest) {
        currentUser.require(httpRequest, Role.OWNER, Role.ADMIN);
        return service.toResponse(service.recalculate(id, request, currentUser.role(httpRequest)));
    }

    @PostMapping("/{id}/approve")
    public PlanningDtos.PlanResponse approve(@PathVariable UUID id, HttpServletRequest httpRequest) {
        currentUser.require(httpRequest, Role.OWNER, Role.ADMIN);
        return service.toResponse(service.approve(id, currentUser.role(httpRequest)));
    }
}
