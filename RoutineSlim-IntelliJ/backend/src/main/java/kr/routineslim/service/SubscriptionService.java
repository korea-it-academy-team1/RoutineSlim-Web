package kr.routineslim.service;
import kr.routineslim.repository.SubscriptionRepository;
import kr.routineslim.entity.Subscription;
import kr.routineslim.dto.SubscriptionRequest;
import kr.routineslim.dto.SubscriptionResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
@Service
public class SubscriptionService {
 private final SubscriptionRepository repository;
 public SubscriptionService(SubscriptionRepository repository){this.repository=repository;}
 public List<SubscriptionResponse> list(String user){return repository.findByUserIdOrderByIdDesc(user).stream().map(this::map).toList();}
 @Transactional public SubscriptionResponse create(String user,SubscriptionRequest request){validate(request);Subscription created=new Subscription(user,request.name(),request.category(),request.amount(),request.cycle(),request.day(),normalize(request.status()));created.billingAnchorDate=request.billingAnchorDate();return map(repository.save(created));}
 @Transactional public SubscriptionResponse update(String user,Long id,SubscriptionRequest request){validate(request);Subscription s=repository.findByIdAndUserId(id,user).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));s.name=request.name();s.category=request.category();s.amount=request.amount();s.cycle=request.cycle();s.day=request.day();s.status=normalize(request.status());s.billingAnchorDate=request.billingAnchorDate()!=null?request.billingAnchorDate():s.billingAnchorDate;return map(repository.save(s));}
 @Transactional public void delete(String user,Long id){Subscription s=repository.findByIdAndUserId(id,user).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));repository.delete(s);}
 private String normalize(String status){return "review".equals(status)?"review":"active";}
 private void validate(SubscriptionRequest r){if(r.amount()==null||r.amount()<0||r.name()==null||r.name().isBlank()||r.category()==null||r.category().isBlank()||r.day()<1||r.day()>31||!List.of("monthly","weekly","yearly").contains(r.cycle())|| (r.status()!=null && !List.of("active","review").contains(r.status())))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid subscription data or missing billing anchor date");}
 private SubscriptionResponse map(Subscription s){return new SubscriptionResponse(s.id,s.name,s.category,s.amount,s.cycle,s.day,s.status,s.billingAnchorDate);}
}
