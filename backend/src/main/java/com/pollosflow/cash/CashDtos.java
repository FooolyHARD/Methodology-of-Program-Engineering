package com.pollosflow.cash;

import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public class CashDtos {
    public record GenerateCashOperationsRequest(@NotNull UUID planId) {
    }

    public record CashOperationResponse(UUID id, UUID planId, UUID restaurantId, String restaurantName,
                                        String menuItem, Integer quantity, BigDecimal unitPrice,
                                        BigDecimal totalAmount, OffsetDateTime operationTime,
                                        CashOperationStatus status) {
    }
}
