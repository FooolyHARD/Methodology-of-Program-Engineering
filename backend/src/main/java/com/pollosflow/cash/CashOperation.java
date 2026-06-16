package com.pollosflow.cash;

import com.pollosflow.baseline.Restaurant;
import com.pollosflow.planning.DistributionPlan;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "cash_operations")
public class CashOperation {
    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(optional = false)
    private DistributionPlan plan;

    @ManyToOne(optional = false)
    private Restaurant restaurant;

    @Column(nullable = false, length = 120)
    private String restaurantName;

    @Column(nullable = false, length = 120)
    private String menuItem;

    @Column(nullable = false)
    private Integer quantity;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal unitPrice;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal totalAmount;

    @Column(nullable = false)
    private OffsetDateTime operationTime;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CashOperationStatus status;
}
