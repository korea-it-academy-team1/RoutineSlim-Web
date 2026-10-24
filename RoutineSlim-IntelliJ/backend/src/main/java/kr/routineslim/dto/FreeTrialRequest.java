package kr.routineslim.dto;

import jakarta.validation.constraints.*;
import java.time.LocalDate;

public record FreeTrialRequest(
    @NotBlank @Size(max = 80) String name,
    @NotBlank @Size(max = 40) String category,
    @NotNull LocalDate endDate,
    @NotNull @PositiveOrZero @Max(1000000000) Long amount,
    @Min(0) @Max(30) int notifyDays,
    @NotBlank @Pattern(regexp = "ACTIVE|CANCELLED") String status) {}
