package com.pollosflow.baseline;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RestaurantBaselineRepository extends JpaRepository<RestaurantBaseline, UUID> {
    List<RestaurantBaseline> findByRestaurantActiveTrueOrderByRestaurantName();

    Optional<RestaurantBaseline> findByRestaurantId(UUID restaurantId);
}
