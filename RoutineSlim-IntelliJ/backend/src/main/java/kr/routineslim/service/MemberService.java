package kr.routineslim.service;
import kr.routineslim.dto.MemberProfileRequest;
import kr.routineslim.dto.MemberProfileResponse;
import kr.routineslim.repository.MemberRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
@Service
public class MemberService {
 private final MemberRepository repository;
 public MemberService(MemberRepository repository){this.repository=repository;}
 @Transactional(readOnly=true)
 public MemberProfileResponse get(String id){return repository.profile(id);}
 @Transactional
 public MemberProfileResponse update(String id,MemberProfileRequest request){
  repository.updateProfile(id,request.displayName().trim(),request.email()==null?"":request.email().trim());
  return repository.profile(id);
 }
}
