package com.pollosflow.funds;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public class FundIntakeDtos {
    public record CreateFundIntakeRequest(
            @NotNull @DecimalMin("1000.00") BigDecimal amount,
            @NotBlank String source,
            @NotNull @Min(1) @Max(720) Integer splitHours,
            @NotNull @DecimalMin("0.00") BigDecimal commissionRate
    ) {
    }

    public record DecisionRequest(String comment) {
    }

    public record FundBatchResponse(UUID id, Integer sequenceNo, BigDecimal amount) {
    }

    public record FundIntakeResponse(
            UUID id,
            BigDecimal amount,
            String source,
            Integer splitHours,
            BigDecimal commissionRate,
            OffsetDateTime registeredAt,
            IntakeStatus status,
            String ownerDecisionComment,
            List<FundBatchResponse> batches
    ) {
    }
}
