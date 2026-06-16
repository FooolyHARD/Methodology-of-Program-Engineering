package com.pollosflow.planning;

import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public class PlanningDtos {
    public record CreatePlanRequest(@NotNull UUID intakeId) {
    }

    public record PlanItemAdjustment(UUID restaurantId, BigDecimal plannedAmount) {
    }

    public record RecalculatePlanRequest(List<PlanItemAdjustment> adjustments) {
    }

    public record PlanItemResponse(UUID id, UUID restaurantId, String restaurantName, BigDecimal plannedAmount,
                                   BigDecimal baselineCapacity, BigDecimal deviationPercent) {
    }

    public record PlanResponse(UUID id, UUID intakeId, OffsetDateTime createdAt, PlanStatus status,
                               BigDecimal totalAmount, Integer version, List<PlanItemResponse> items) {
    }
}
