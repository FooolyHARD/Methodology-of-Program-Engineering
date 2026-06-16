package com.pollosflow.cash;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CashOperationRepository extends JpaRepository<CashOperation, UUID> {
    List<CashOperation> findByPlanIdOrderByOperationTime(UUID planId);
}
