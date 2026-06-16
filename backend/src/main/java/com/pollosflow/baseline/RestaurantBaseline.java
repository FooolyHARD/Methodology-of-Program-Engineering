package com.pollosflow.baseline;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "restaurant_baselines")
public class RestaurantBaseline {
    @Id
    @GeneratedValue
    private UUID id;

    @OneToOne(optional = false)
    private Restaurant restaurant;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal averageCheck;

    @Column(nullable = false)
    private Integer dailyCustomerFlow;

    @Column(nullable = false, precision = 8, scale = 4)
    private BigDecimal seasonalCoefficient;

    @Column(nullable = false, precision = 8, scale = 2)
    private BigDecimal allowedDeviationPercent;
}
