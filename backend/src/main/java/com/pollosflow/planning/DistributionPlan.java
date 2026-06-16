package com.pollosflow.planning;

import com.pollosflow.funds.FundIntake;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "distribution_plans")
public class DistributionPlan {
    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(optional = false)
    private FundIntake intake;

    @Column(nullable = false)
    private OffsetDateTime createdAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PlanStatus status;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal totalAmount;

    @Column(nullable = false)
    private Integer version;

    @OneToMany(mappedBy = "plan", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderBy("restaurantName ASC")
    private List<DistributionPlanItem> items = new ArrayList<>();
}
