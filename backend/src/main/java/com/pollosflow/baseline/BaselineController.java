package com.pollosflow.baseline;

import com.pollosflow.audit.AuditService;
import com.pollosflow.common.CurrentUser;
import com.pollosflow.common.Role;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/restaurants/baselines")
public class BaselineController {
    private final RestaurantBaselineRepository repository;
    private final RestaurantRepository restaurants;
    private final AuditService audit;
    private final CurrentUser currentUser;

    public BaselineController(RestaurantBaselineRepository repository, RestaurantRepository restaurants,
                              AuditService audit, CurrentUser currentUser) {
        this.repository = repository;
        this.restaurants = restaurants;
        this.audit = audit;
        this.currentUser = currentUser;
    }

    @GetMapping
    public List<BaselineResponse> list() {
        return repository.findByRestaurantActiveTrueOrderByRestaurantName().stream()
                .map(this::toResponse)
                .toList();
    }

    @PostMapping
    @Transactional
    public BaselineResponse create(@Valid @RequestBody CreateRestaurantRequest request,
                                   HttpServletRequest httpRequest) {
        currentUser.require(httpRequest, Role.OWNER, Role.ADMIN);
        Role role = currentUser.role(httpRequest);

        Restaurant restaurant = new Restaurant();
        restaurant.setName(request.name().trim());
        restaurant.setCity(request.city().trim());
        restaurant.setActive(true);
        Restaurant savedRestaurant = restaurants.save(restaurant);

        RestaurantBaseline baseline = new RestaurantBaseline();
        baseline.setRestaurant(savedRestaurant);
        baseline.setAverageCheck(request.averageCheck());
        baseline.setDailyCustomerFlow(request.dailyCustomerFlow());
        baseline.setSeasonalCoefficient(request.seasonalCoefficient());
        baseline.setAllowedDeviationPercent(request.allowedDeviationPercent());
        RestaurantBaseline savedBaseline = repository.save(baseline);

        audit.record(role, "RESTAURANT_REGISTERED", "restaurant", savedRestaurant.getId(),
                "Registered restaurant " + savedRestaurant.getName() + " with calculation baseline");
        return toResponse(savedBaseline);
    }

    @PatchMapping("/{restaurantId}")
    public BaselineResponse update(@PathVariable UUID restaurantId,
                                   @Valid @RequestBody UpdateBaselineRequest request,
                                   HttpServletRequest httpRequest) {
        currentUser.require(httpRequest, Role.OWNER, Role.ADMIN);
        Role role = currentUser.role(httpRequest);

        RestaurantBaseline baseline = repository.findByRestaurantId(restaurantId)
                .orElseThrow(() -> new IllegalArgumentException("Restaurant baseline not found"));
        baseline.setAverageCheck(request.averageCheck());
        baseline.setDailyCustomerFlow(request.dailyCustomerFlow());
        baseline.setSeasonalCoefficient(request.seasonalCoefficient());
        baseline.setAllowedDeviationPercent(request.allowedDeviationPercent());

        RestaurantBaseline saved = repository.save(baseline);
        audit.record(role, "BASELINE_UPDATED", "restaurant_baseline", saved.getId(),
                "Updated calculation baseline for " + saved.getRestaurant().getName());
        return toResponse(saved);
    }

    private BaselineResponse toResponse(RestaurantBaseline baseline) {
        return new BaselineResponse(
                baseline.getRestaurant().getId(),
                baseline.getRestaurant().getName(),
                baseline.getRestaurant().getCity(),
                baseline.getAverageCheck(),
                baseline.getDailyCustomerFlow(),
                baseline.getSeasonalCoefficient(),
                baseline.getAllowedDeviationPercent());
    }

    public record BaselineResponse(UUID restaurantId, String restaurantName, String city, BigDecimal averageCheck,
                                   Integer dailyCustomerFlow, BigDecimal seasonalCoefficient,
                                   BigDecimal allowedDeviationPercent) {
    }

    public record UpdateBaselineRequest(
            @NotNull @DecimalMin("1.00") @DecimalMax("1000.00") BigDecimal averageCheck,
            @NotNull @Min(1) @Max(100000) Integer dailyCustomerFlow,
            @NotNull @DecimalMin("0.10") @DecimalMax("5.00") BigDecimal seasonalCoefficient,
            @NotNull @DecimalMin("0.00") @DecimalMax("100.00") BigDecimal allowedDeviationPercent) {
    }

    public record CreateRestaurantRequest(
            @NotBlank @Size(max = 120) String name,
            @NotBlank @Size(max = 80) String city,
            @NotNull @DecimalMin("1.00") @DecimalMax("1000.00") BigDecimal averageCheck,
            @NotNull @Min(1) @Max(100000) Integer dailyCustomerFlow,
            @NotNull @DecimalMin("0.10") @DecimalMax("5.00") BigDecimal seasonalCoefficient,
            @NotNull @DecimalMin("0.00") @DecimalMax("100.00") BigDecimal allowedDeviationPercent) {
    }
}
