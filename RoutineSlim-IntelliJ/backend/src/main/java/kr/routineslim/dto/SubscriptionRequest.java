package kr.routineslim.dto;
import jakarta.validation.constraints.*;
public record SubscriptionRequest(@NotBlank String name,@NotBlank String category,@NotNull @PositiveOrZero Long amount,@NotBlank String cycle,@Min(1) @Max(31) int day,String status, java.time.LocalDate billingAnchorDate){}
