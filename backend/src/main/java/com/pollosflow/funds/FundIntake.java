package com.pollosflow.funds;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "fund_intakes")
public class FundIntake {
    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 120)
    private String source;

    @Column(nullable = false)
    private Integer splitHours;

    @Column(nullable = false, precision = 8, scale = 4)
    private BigDecimal commissionRate;

    @Column(nullable = false)
    private OffsetDateTime registeredAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private IntakeStatus status;

    @Column(length = 500)
    private String ownerDecisionComment;
}
