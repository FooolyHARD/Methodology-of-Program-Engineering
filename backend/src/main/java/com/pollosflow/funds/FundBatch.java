package com.pollosflow.funds;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "fund_batches")
public class FundBatch {
    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    private FundIntake intake;

    @Column(nullable = false)
    private Integer sequenceNo;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal amount;
}
