package kr.routineslim.dto;

import jakarta.validation.constraints.*;

public record CommentRequest(@NotBlank @Size(max = 2000) String content) {}
