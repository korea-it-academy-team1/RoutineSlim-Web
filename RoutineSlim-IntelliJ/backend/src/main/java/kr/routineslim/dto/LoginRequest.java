package kr.routineslim.dto;

public record LoginRequest(String id, String password, Boolean rememberMe) {
  public LoginRequest(String id, String password) {
    this(id, password, false);
  }
}
