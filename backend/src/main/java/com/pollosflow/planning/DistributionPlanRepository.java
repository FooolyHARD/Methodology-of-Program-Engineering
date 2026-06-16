package com.pollosflow.planning;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface DistributionPlanRepository extends JpaRepository<DistributionPlan, UUID> {
    List<DistributionPlan> findByIntakeIdOrderByVersionDesc(UUID intakeId);
}
