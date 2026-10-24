package kr.routineslim.dto;

import jakarta.validation.constraints.*;

public record SupportArticleRequest(
    @NotBlank @Size(max = 120) String title,
    @NotBlank @Size(max = 40) String category,
    @NotBlank @Size(max = 10000) String content,
    boolean published) {}
