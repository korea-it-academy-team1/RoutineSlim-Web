package kr.routineslim.dto;

import jakarta.validation.constraints.*;

public record InquiryAnswerRequest(@NotBlank @Size(max = 5000) String answer) {}
