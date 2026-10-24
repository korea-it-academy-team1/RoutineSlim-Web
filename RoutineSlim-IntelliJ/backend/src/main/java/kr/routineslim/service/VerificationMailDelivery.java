package kr.routineslim.service;

public interface VerificationMailDelivery {
  boolean available();

  void send(String email, String code, int expiresInMinutes);

  default void sendRecovery(String email, String code, int minutes) {
    send(email, code, minutes);
  }
}
