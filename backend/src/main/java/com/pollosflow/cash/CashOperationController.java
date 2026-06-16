package com.pollosflow.cash;

import com.pollosflow.common.CurrentUser;
import com.pollosflow.common.Role;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/cash-operations")
public class CashOperationController {
    private final CashOperationService service;
    private final CurrentUser currentUser;

    public CashOperationController(CashOperationService service, CurrentUser currentUser) {
        this.service = service;
        this.currentUser = currentUser;
    }

    @GetMapping
    public List<CashDtos.CashOperationResponse> list(@RequestParam(required = false) UUID planId) {
        return service.list(planId).stream().map(service::toResponse).toList();
    }

    @PostMapping("/generate")
    public List<CashDtos.CashOperationResponse> generate(@Valid @RequestBody CashDtos.GenerateCashOperationsRequest request,
                                                         HttpServletRequest httpRequest) {
        currentUser.require(httpRequest, Role.OWNER, Role.ADMIN);
        return service.generate(request.planId(), currentUser.role(httpRequest)).stream().map(service::toResponse).toList();
    }
}
