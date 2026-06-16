package com.pollosflow.funds;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface FundIntakeRepository extends JpaRepository<FundIntake, UUID> {
}
