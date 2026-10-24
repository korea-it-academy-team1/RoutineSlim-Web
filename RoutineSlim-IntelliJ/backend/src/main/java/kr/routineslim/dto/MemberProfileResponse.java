package kr.routineslim.dto;

public record MemberProfileResponse(
    String id,
    String displayName,
    String email,
    String phone,
    String birth,
    String address,
    String addressDetail,
    String photo,
    boolean emailVerified) {
  public MemberProfileResponse(
      String id,
      String displayName,
      String email,
      String phone,
      String birth,
      String address,
      String addressDetail,
      String photo) {
    this(id, displayName, email, phone, birth, address, addressDetail, photo, false);
  }

  public MemberProfileResponse(String id, String displayName, String email) {
    this(id, displayName, email, "", "", "", "", "", false);
  }
}
