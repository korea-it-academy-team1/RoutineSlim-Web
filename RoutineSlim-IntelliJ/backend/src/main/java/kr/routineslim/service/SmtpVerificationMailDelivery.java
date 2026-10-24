package kr.routineslim.service;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class SmtpVerificationMailDelivery implements VerificationMailDelivery {
  private final ObjectProvider<JavaMailSender> sender;
  private final Environment env;

  public SmtpVerificationMailDelivery(ObjectProvider<JavaMailSender> sender, Environment env) {
    this.sender = sender;
    this.env = env;
  }

  public boolean available() {
    return !env.getProperty("spring.mail.host", "").isBlank()
        && !env.getProperty("routineslim.mail.from", "").isBlank()
        && sender.getIfAvailable() != null;
  }

  public void send(String email, String code, int minutes) {
    sendCode(email, code, minutes, "회원가입 이메일 인증");
  }

  @Override
  public void sendRecovery(String email, String code, int minutes) {
    sendCode(email, code, minutes, "계정 복구");
  }

  private void sendCode(String email, String code, int minutes, String purpose) {
    if (!available())
      throw new ResponseStatusException(
          HttpStatus.SERVICE_UNAVAILABLE, "인증 메일 발송 서버가 설정되지 않았습니다. 관리자에게 SMTP 설정을 요청해주세요.");
    try {
      var message = new SimpleMailMessage();
      message.setFrom(env.getProperty("routineslim.mail.from"));
      message.setTo(email);
      message.setSubject("[RoutineSlim] " + purpose + " 인증번호");
      message.setText(
          "RoutineSlim "
              + purpose
              + " 인증번호는 "
              + code
              + " 입니다.\n"
              + minutes
              + "분 안에 가입 화면에 입력해주세요.\n본인이 요청하지 않았다면 이 메일을 무시하세요.");
      sender.getObject().send(message);
    } catch (Exception e) {
      throw new ResponseStatusException(
          HttpStatus.SERVICE_UNAVAILABLE, "인증 메일을 발송하지 못했습니다. 잠시 후 다시 시도하거나 관리자에게 문의해주세요.");
    }
  }
}
