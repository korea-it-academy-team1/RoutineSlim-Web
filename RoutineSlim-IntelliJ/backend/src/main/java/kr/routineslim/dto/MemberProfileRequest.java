package kr.routineslim.dto;

import jakarta.validation.constraints.*;

public record MemberProfileRequest(
    @NotBlank @Size(max = 120) String displayName,
    @Email @Size(max = 255) String email,
    @Size(max = 20) String phone,
    @Size(max = 10) String birth,
    @Size(max = 250) String address,
    @Size(max = 150) String addressDetail,
    @Size(max = 7000000) String photo) {
  public MemberProfileRequest(String displayName, String email) {
    this(displayName, email, null, null, null, null, null);
  }
}
