package com.pollosflow.planning;

import com.pollosflow.baseline.Restaurant;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "distribution_plan_items")
public class DistributionPlanItem {
    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(optional = false)
    private DistributionPlan plan;

    @ManyToOne(optional = false)
    private Restaurant restaurant;

    @Column(nullable = false, length = 120)
    private String restaurantName;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal plannedAmount;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal baselineCapacity;

    @Column(nullable = false, precision = 8, scale = 2)
    private BigDecimal deviationPercent;
}
