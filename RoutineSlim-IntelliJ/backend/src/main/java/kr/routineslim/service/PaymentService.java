package kr.routineslim.service;
import kr.routineslim.dto.PaymentRequest;
import kr.routineslim.dto.PaymentResponse;
import kr.routineslim.entity.PaymentRecord;
import kr.routineslim.repository.PaymentRecordRepository;
import kr.routineslim.repository.SubscriptionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.time.*;
import java.util.*;
@Service public class PaymentService {
 private final PaymentRecordRepository records; private final SubscriptionRepository subscriptions;
 public PaymentService(PaymentRecordRepository records,SubscriptionRepository subscriptions){this.records=records;this.subscriptions=subscriptions;}
 public List<PaymentResponse> list(String user,YearMonth month){return records.findByUserIdAndPaidOnBetweenOrderByPaidOnDescIdDesc(user,month.atDay(1),month.atEndOfMonth()).stream().map(this::map).toList();}
 @Transactional public PaymentResponse create(String user,PaymentRequest request){
  if(request.subscriptionId()!=null && subscriptions.findByIdAndUserId(request.subscriptionId(),user).isEmpty())throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Unknown subscription");
  return map(records.save(new PaymentRecord(user,request.subscriptionId(),request.description().trim(),request.amount(),request.paidOn())));
 }
 @Transactional public void delete(String user,Long id){var row=records.findByIdAndUserId(id,user).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));records.delete(row);}
 public long total(String user,YearMonth month){return list(user,month).stream().mapToLong(PaymentResponse::amount).sum();}
 private PaymentResponse map(PaymentRecord p){return new PaymentResponse(p.id,p.subscriptionId,p.description,p.amount,p.paidOn);}
}
