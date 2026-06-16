package com.pollosflow.cash;

import com.pollosflow.audit.AuditService;
import com.pollosflow.common.Role;
import com.pollosflow.funds.IntakeStatus;
import com.pollosflow.planning.DistributionPlan;
import com.pollosflow.planning.DistributionPlanItem;
import com.pollosflow.planning.DistributionPlanRepository;
import com.pollosflow.planning.PlanStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class CashOperationService {
    private static final List<MenuItem> MENU = List.of(
            new MenuItem("Classic chicken combo", new BigDecimal("12.50")),
            new MenuItem("Family bucket", new BigDecimal("29.90")),
            new MenuItem("Spicy wings", new BigDecimal("8.40")),
            new MenuItem("Breakfast burrito", new BigDecimal("6.75")),
            new MenuItem("Soft drink", new BigDecimal("2.80"))
    );

    private final CashOperationRepository operations;
    private final DistributionPlanRepository plans;
    private final AuditService audit;

    public CashOperationService(CashOperationRepository operations, DistributionPlanRepository plans, AuditService audit) {
        this.operations = operations;
        this.plans = plans;
        this.audit = audit;
    }

    @Transactional
    public List<CashOperation> generate(UUID planId, Role role) {
        DistributionPlan plan = plans.findById(planId).orElseThrow(() -> new IllegalArgumentException("Distribution plan not found"));
        if (plan.getStatus() != PlanStatus.APPROVED) {
            throw new IllegalStateException("Cash operations can be generated only for approved plan");
        }
        List<CashOperation> existing = operations.findByPlanIdOrderByOperationTime(planId);
        if (!existing.isEmpty()) {
            return existing;
        }
        List<CashOperation> generated = new ArrayList<>();
        OffsetDateTime baseTime = OffsetDateTime.now().withHour(10).withMinute(0).withSecond(0).withNano(0);
        int index = 0;
        for (DistributionPlanItem planItem : plan.getItems()) {
            BigDecimal remaining = planItem.getPlannedAmount();
            int guard = 0;
            while (remaining.compareTo(BigDecimal.ZERO) > 0 && guard < 200) {
                MenuItem menuItem = MENU.get((index + guard) % MENU.size());
                BigDecimal maxQty = remaining.divide(menuItem.price(), 0, RoundingMode.DOWN);
                int quantity = maxQty.min(BigDecimal.valueOf(40)).max(BigDecimal.ONE).intValue();
                BigDecimal total = menuItem.price().multiply(BigDecimal.valueOf(quantity));
                if (total.compareTo(remaining) > 0) {
                    total = remaining;
                    quantity = 1;
                }
                CashOperation op = new CashOperation();
                op.setPlan(plan);
                op.setRestaurant(planItem.getRestaurant());
                op.setRestaurantName(planItem.getRestaurantName());
                op.setMenuItem(menuItem.name());
                op.setQuantity(quantity);
                op.setUnitPrice(total.divide(BigDecimal.valueOf(quantity), 2, RoundingMode.HALF_UP));
                op.setTotalAmount(total);
                op.setOperationTime(baseTime.plusMinutes((long) index * 7));
                op.setStatus(CashOperationStatus.READY_FOR_POS);
                generated.add(operations.save(op));
                remaining = remaining.subtract(total);
                index++;
                guard++;
            }
        }
        plan.getIntake().setStatus(IntakeStatus.CASH_OPERATIONS_GENERATED);
        audit.record(role, "CASH_OPERATIONS_GENERATED", "distribution_plan", plan.getId(), "Generated synthetic cash operations for training demo");
        return generated;
    }

    public List<CashOperation> list(UUID planId) {
        if (planId == null) {
            return operations.findAll();
        }
        return operations.findByPlanIdOrderByOperationTime(planId);
    }

    public CashDtos.CashOperationResponse toResponse(CashOperation op) {
        return new CashDtos.CashOperationResponse(
                op.getId(),
                op.getPlan().getId(),
                op.getRestaurant().getId(),
                op.getRestaurantName(),
                op.getMenuItem(),
                op.getQuantity(),
                op.getUnitPrice(),
                op.getTotalAmount(),
                op.getOperationTime(),
                op.getStatus());
    }

    private record MenuItem(String name, BigDecimal price) {
    }
}
