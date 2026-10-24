package kr.routineslim.dto;

import jakarta.validation.constraints.*;

public record SubscriptionRequest(
    @NotBlank @Size(max = 255) String name,
    @NotBlank @Size(max = 255) String category,
    @NotNull @PositiveOrZero Long amount,
    @NotBlank String cycle,
    @Min(1) @Max(31) int day,
    String status,
    java.time.LocalDate billingAnchorDate) {}
