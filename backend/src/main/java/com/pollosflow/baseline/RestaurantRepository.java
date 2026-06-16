package com.pollosflow.baseline;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface RestaurantRepository extends JpaRepository<Restaurant, UUID> {
    List<Restaurant> findByActiveTrueOrderByName();
}
