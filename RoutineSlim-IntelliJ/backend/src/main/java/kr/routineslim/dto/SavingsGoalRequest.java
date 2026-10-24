package kr.routineslim.dto;

import jakarta.validation.constraints.*;
import java.util.List;

public record SavingsGoalRequest(
    @NotBlank @Size(max = 120) String title,
    @NotBlank @Pattern(regexp = "[0-9]{4}-(0[1-9]|1[0-2])") String month,
    @NotNull @Min(1) @Max(1000000000) Long target,
    List<@NotBlank @Size(max = 120) String> tasks,
    List<Boolean> completed) {}
