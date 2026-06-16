package com.pollosflow.dashboard;

import com.pollosflow.cash.CashOperationRepository;
import com.pollosflow.funds.FundIntakeRepository;
import com.pollosflow.planning.DistributionPlanRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {
    private final FundIntakeRepository intakes;
    private final DistributionPlanRepository plans;
    private final CashOperationRepository operations;

    public DashboardController(FundIntakeRepository intakes, DistributionPlanRepository plans, CashOperationRepository operations) {
        this.intakes = intakes;
        this.plans = plans;
        this.operations = operations;
    }

    @GetMapping
    public DashboardResponse dashboard() {
        BigDecimal registered = intakes.findAll().stream()
                .map(i -> i.getAmount())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal generated = operations.findAll().stream()
                .map(o -> o.getTotalAmount())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new DashboardResponse(intakes.count(), plans.count(), operations.count(), registered, generated);
    }

    public record DashboardResponse(long intakes, long plans, long cashOperations,
                                    BigDecimal registeredAmount, BigDecimal generatedAmount) {
    }
}
