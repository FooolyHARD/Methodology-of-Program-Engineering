package com.pollosflow.funds;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface FundBatchRepository extends JpaRepository<FundBatch, UUID> {
    List<FundBatch> findByIntakeIdOrderBySequenceNo(UUID intakeId);
}
