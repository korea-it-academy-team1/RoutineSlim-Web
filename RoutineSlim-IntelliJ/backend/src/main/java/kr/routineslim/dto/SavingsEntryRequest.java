package kr.routineslim.dto;

import jakarta.validation.constraints.*;
import java.time.LocalDate;

public record SavingsEntryRequest(
    @NotBlank @Size(max = 120) String title,
    @NotNull @Min(1) @Max(1000000000) Long amount,
    @NotNull LocalDate date) {}
