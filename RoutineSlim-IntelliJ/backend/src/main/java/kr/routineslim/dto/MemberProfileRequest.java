package kr.routineslim.dto;
import jakarta.validation.constraints.*;
public record MemberProfileRequest(@NotBlank @Size(max=120) String displayName, @Email @Size(max=255) String email) {}
