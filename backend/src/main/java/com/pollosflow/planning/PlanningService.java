package com.pollosflow.planning;

import com.pollosflow.audit.AuditService;
import com.pollosflow.baseline.RestaurantBaseline;
import com.pollosflow.baseline.RestaurantBaselineRepository;
import com.pollosflow.common.Role;
import com.pollosflow.funds.FundIntake;
import com.pollosflow.funds.FundIntakeRepository;
import com.pollosflow.funds.IntakeStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class PlanningService {
    private final DistributionPlanRepository plans;
    private final FundIntakeRepository intakes;
    private final RestaurantBaselineRepository baselines;
    private final AuditService audit;

    public PlanningService(DistributionPlanRepository plans, FundIntakeRepository intakes,
                           RestaurantBaselineRepository baselines, AuditService audit) {
        this.plans = plans;
        this.intakes = intakes;
        this.baselines = baselines;
        this.audit = audit;
    }

    @Transactional
    public DistributionPlan create(UUID intakeId, Role role) {
        FundIntake intake = intakes.findById(intakeId).orElseThrow(() -> new IllegalArgumentException("Fund intake not found"));
        if (intake.getStatus() != IntakeStatus.APPROVED && intake.getStatus() != IntakeStatus.PLANNED) {
            throw new IllegalStateException("Plan can be created only for approved intake");
        }
        List<RestaurantBaseline> activeBaselines = baselines.findByRestaurantActiveTrueOrderByRestaurantName();
        if (activeBaselines.isEmpty()) {
            throw new IllegalStateException("No active baseline data available");
        }
        DistributionPlan plan = new DistributionPlan();
        plan.setIntake(intake);
        plan.setCreatedAt(OffsetDateTime.now());
        plan.setStatus(PlanStatus.CALCULATED);
        plan.setTotalAmount(intake.getAmount());
        plan.setVersion(plans.findByIntakeIdOrderByVersionDesc(intakeId).stream().findFirst().map(p -> p.getVersion() + 1).orElse(1));
        calculateItems(plan, activeBaselines, intake.getAmount(), Map.of());
        intake.setStatus(IntakeStatus.PLANNED);
        DistributionPlan saved = plans.save(plan);
        audit.record(role, "DISTRIBUTION_PLAN_CALCULATED", "distribution_plan", saved.getId(), "Calculated plan from restaurant baselines");
        return saved;
    }

    @Transactional
    public DistributionPlan recalculate(UUID id, PlanningDtos.RecalculatePlanRequest request, Role role) {
        DistributionPlan plan = get(id);
        if (plan.getStatus() == PlanStatus.APPROVED) {
            throw new IllegalStateException("Approved plan cannot be recalculated");
        }
        Map<UUID, BigDecimal> adjustments = request.adjustments() == null ? Map.of() : request.adjustments().stream()
                .collect(Collectors.toMap(PlanningDtos.PlanItemAdjustment::restaurantId, PlanningDtos.PlanItemAdjustment::plannedAmount));
        List<RestaurantBaseline> activeBaselines = baselines.findByRestaurantActiveTrueOrderByRestaurantName();
        plan.getItems().clear();
        calculateItems(plan, activeBaselines, plan.getTotalAmount(), adjustments);
        plan.setStatus(PlanStatus.ADJUSTED);
        audit.record(role, "DISTRIBUTION_PLAN_RECALCULATED", "distribution_plan", plan.getId(), "Recalculated plan with owner adjustments");
        return plan;
    }

    @Transactional
    public DistributionPlan approve(UUID id, Role role) {
        DistributionPlan plan = get(id);
        plan.setStatus(PlanStatus.APPROVED);
        audit.record(role, "DISTRIBUTION_PLAN_APPROVED", "distribution_plan", plan.getId(), "Owner approved distribution plan");
        return plan;
    }

    public DistributionPlan get(UUID id) {
        return plans.findById(id).orElseThrow(() -> new IllegalArgumentException("Distribution plan not found"));
    }

    public List<DistributionPlan> list() {
        return plans.findAll().stream()
                .sorted(Comparator.comparing(DistributionPlan::getCreatedAt).reversed())
                .toList();
    }

    public PlanningDtos.PlanResponse toResponse(DistributionPlan plan) {
        return new PlanningDtos.PlanResponse(
                plan.getId(),
                plan.getIntake().getId(),
                plan.getCreatedAt(),
                plan.getStatus(),
                plan.getTotalAmount(),
                plan.getVersion(),
                plan.getItems().stream().map(item -> new PlanningDtos.PlanItemResponse(
                        item.getId(),
                        item.getRestaurant().getId(),
                        item.getRestaurantName(),
                        item.getPlannedAmount(),
                        item.getBaselineCapacity(),
                        item.getDeviationPercent())).toList());
    }

    private void calculateItems(DistributionPlan plan, List<RestaurantBaseline> activeBaselines, BigDecimal amount,
                                Map<UUID, BigDecimal> adjustments) {
        BigDecimal totalCapacity = activeBaselines.stream()
                .map(this::capacity)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal allocated = BigDecimal.ZERO;
        for (int i = 0; i < activeBaselines.size(); i++) {
            RestaurantBaseline baseline = activeBaselines.get(i);
            BigDecimal capacity = capacity(baseline);
            BigDecimal planned = adjustments.getOrDefault(
                    baseline.getRestaurant().getId(),
                    amount.multiply(capacity).divide(totalCapacity, 2, RoundingMode.HALF_UP));
            if (i == activeBaselines.size() - 1 && adjustments.isEmpty()) {
                planned = amount.subtract(allocated);
            }
            allocated = allocated.add(planned);
            DistributionPlanItem item = new DistributionPlanItem();
            item.setPlan(plan);
            item.setRestaurant(baseline.getRestaurant());
            item.setRestaurantName(baseline.getRestaurant().getName());
            item.setPlannedAmount(planned);
            item.setBaselineCapacity(capacity);
            BigDecimal deviation = planned.subtract(capacity)
                    .multiply(new BigDecimal("100"))
                    .divide(capacity, 2, RoundingMode.HALF_UP);
            item.setDeviationPercent(deviation);
            if (deviation.compareTo(baseline.getAllowedDeviationPercent()) > 0) {
                throw new IllegalArgumentException("Plan item for " + baseline.getRestaurant().getName() + " exceeds allowed synthetic baseline deviation");
            }
            plan.getItems().add(item);
        }
    }

    private BigDecimal capacity(RestaurantBaseline baseline) {
        return baseline.getAverageCheck()
                .multiply(BigDecimal.valueOf(baseline.getDailyCustomerFlow()))
                .multiply(baseline.getSeasonalCoefficient());
    }
}
