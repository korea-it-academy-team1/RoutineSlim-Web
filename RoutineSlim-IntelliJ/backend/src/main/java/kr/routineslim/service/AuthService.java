package kr.routineslim.service;
import kr.routineslim.repository.MemberRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.server.ResponseStatusException;
@Service public class AuthService {
 private final MemberRepository members;private final BCryptPasswordEncoder encoder=new BCryptPasswordEncoder();
 public AuthService(MemberRepository members){this.members=members;}
 public void register(String id,String password){if(id==null||!id.matches("[a-zA-Z0-9_@.\\-]{3,120}")||password==null||password.length()<8||password.length()>128)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid credentials");if(members.passwordHash(id).isPresent())throw new ResponseStatusException(HttpStatus.CONFLICT,"User exists");members.create(id,encoder.encode(password));}
 public void login(String id,String password){if(id==null||password==null||!members.passwordHash(id).map(h->encoder.matches(password,h)).orElse(false))throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Invalid credentials");}
 public void changePassword(String id,String currentPassword,String password){if(currentPassword==null||!members.passwordHash(id).map(h->encoder.matches(currentPassword,h)).orElse(false))throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Current password does not match");if(password==null||password.length()<8||password.length()>128)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Password must be 8-128 characters");members.changePassword(id,encoder.encode(password));}
 @org.springframework.transaction.annotation.Transactional
 public void delete(String id){members.delete(id);}
}
