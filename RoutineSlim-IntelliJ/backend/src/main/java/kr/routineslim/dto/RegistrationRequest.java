package kr.routineslim.dto;

import jakarta.validation.constraints.*;

public record RegistrationRequest(
    @NotBlank @Pattern(regexp = "[a-zA-Z][a-zA-Z0-9_]{3,19}") String id,
    @NotBlank @Size(min = 2, max = 50) String name,
    @NotBlank @Email @Size(max = 255) String email,
    @NotBlank @Size(min = 8, max = 72) String password,
    @NotBlank String confirmPassword,
    @NotBlank @Size(max = 36) String verificationId,
    Boolean agreeTerms,
    Boolean agreePrivacy,
    Boolean ageOver14,
    @NotBlank String termsVersion,
    @NotBlank String privacyVersion) {}
