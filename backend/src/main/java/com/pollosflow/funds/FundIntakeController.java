package com.pollosflow.funds;

import com.pollosflow.common.CurrentUser;
import com.pollosflow.common.Role;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/fund-intakes")
public class FundIntakeController {
    private final FundIntakeService service;
    private final CurrentUser currentUser;

    public FundIntakeController(FundIntakeService service, CurrentUser currentUser) {
        this.service = service;
        this.currentUser = currentUser;
    }

    @GetMapping
    public List<FundIntakeDtos.FundIntakeResponse> list() {
        return service.list().stream().map(service::toResponse).toList();
    }

    @PostMapping
    public FundIntakeDtos.FundIntakeResponse create(@Valid @RequestBody FundIntakeDtos.CreateFundIntakeRequest request,
                                                    HttpServletRequest httpRequest) {
        currentUser.require(httpRequest, Role.AUTHORIZED_USER, Role.OWNER, Role.ADMIN);
        return service.toResponse(service.create(request, currentUser.role(httpRequest)));
    }

    @PostMapping("/{id}/approve")
    public FundIntakeDtos.FundIntakeResponse approve(@PathVariable UUID id,
                                                     @RequestBody(required = false) FundIntakeDtos.DecisionRequest request,
                                                     HttpServletRequest httpRequest) {
        currentUser.require(httpRequest, Role.OWNER, Role.ADMIN);
        return service.toResponse(service.approve(id, request == null ? null : request.comment(), currentUser.role(httpRequest)));
    }

    @PostMapping("/{id}/reject")
    public FundIntakeDtos.FundIntakeResponse reject(@PathVariable UUID id,
                                                    @RequestBody(required = false) FundIntakeDtos.DecisionRequest request,
                                                    HttpServletRequest httpRequest) {
        currentUser.require(httpRequest, Role.OWNER, Role.ADMIN);
        return service.toResponse(service.reject(id, request == null ? null : request.comment(), currentUser.role(httpRequest)));
    }
}
