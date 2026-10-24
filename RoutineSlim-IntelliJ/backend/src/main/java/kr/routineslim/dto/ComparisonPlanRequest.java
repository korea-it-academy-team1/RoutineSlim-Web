package kr.routineslim.dto;

import jakarta.validation.constraints.*;
import java.util.List;

public record ComparisonPlanRequest(
    @NotBlank @Size(max = 80) String service,
    @NotBlank @Size(max = 80) String plan,
    @NotBlank @Size(max = 40) String category,
    @NotNull @PositiveOrZero @Max(1000000000) Long amount,
    @NotBlank @Pattern(regexp = "monthly|yearly") String cycle,
    @Size(max = 12) List<@NotBlank @Size(max = 120) String> features,
    @Size(max = 500) String sourceUrl,
    boolean active) {}
