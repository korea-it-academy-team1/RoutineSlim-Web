package kr.routineslim.service;

import java.nio.charset.StandardCharsets;

import kr.routineslim.repository.MemberRepository;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {

 private final AccountRestrictionService restrictions;
 private final MemberRepository members;
 private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

 public AuthService(
         MemberRepository members,
         AccountRestrictionService restrictions
 ) {
  this.members = members;
  this.restrictions = restrictions;
 }

 public void register(String id, String password) {
  if (id == null
          || id.startsWith("oauth_")
          || !id.matches("[a-zA-Z0-9_@.\\-]{3,120}")
          || password == null
          || password.length() < 8
          || password.getBytes(StandardCharsets.UTF_8).length > 72) {
   throw new ResponseStatusException(
           HttpStatus.BAD_REQUEST,
           "Invalid credentials"
   );
  }

  if (members.passwordHash(id).isPresent()) {
   throw new ResponseStatusException(
           HttpStatus.CONFLICT,
           "User exists"
   );
  }

  try {
   members.create(id, encoder.encode(password));
  } catch (DuplicateKeyException e) {
   throw new ResponseStatusException(
           HttpStatus.CONFLICT,
           "User exists"
   );
  }
 }

 public void login(String id, String password) {
  if (id == null
          || password == null
          || password.getBytes(StandardCharsets.UTF_8).length > 72
          || !members.passwordHash(id)
          .map(hash -> encoder.matches(password, hash))
          .orElse(false)) {
   throw new ResponseStatusException(
           HttpStatus.UNAUTHORIZED,
           "Invalid credentials"
   );
  }

  if (restrictions.suspended(id)) {
   throw new ResponseStatusException(
           HttpStatus.FORBIDDEN,
           "이용이 정지된 계정입니다."
   );
  }
 }

 @Transactional
 public void changePassword(
         String id,
         String currentPassword,
         String password
 ) {
  if (currentPassword == null
          || currentPassword.getBytes(StandardCharsets.UTF_8).length > 72
          || !members.passwordHash(id)
          .map(hash -> encoder.matches(currentPassword, hash))
          .orElse(false)) {
   throw new ResponseStatusException(
           HttpStatus.BAD_REQUEST,
           "현재 비밀번호가 일치하지 않습니다."
   );
  }

  if (password == null
          || password.length() < 8
          || password.getBytes(StandardCharsets.UTF_8).length > 72) {
   throw new ResponseStatusException(
           HttpStatus.BAD_REQUEST,
           "비밀번호는 8자 이상, UTF-8 기준 72바이트 이하로 입력해주세요."
   );
  }

  members.changePassword(id, encoder.encode(password));
  restrictions.invalidate(id);
 }

 @Transactional
 public void delete(String id) {
  members.delete(id);
 }
}