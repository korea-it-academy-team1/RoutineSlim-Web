package kr.routineslim.config;

import java.util.*;
import kr.routineslim.dto.SupportArticleRequest;
import kr.routineslim.repository.FeatureRecordRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.*;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Order(50)
public class SupportContentBootstrap implements ApplicationRunner {
  private final FeatureRecordRepository records;
  private final boolean enabled;

  public SupportContentBootstrap(
      FeatureRecordRepository records,
      @Value("${routineslim.content.seed.enabled:true}") boolean enabled) {
    this.records = records;
    this.enabled = enabled;
  }

  @Transactional
  public void run(ApplicationArguments args) {
    if (!enabled || !records.list(FeatureRecordRepository.PUBLIC, "content_seed").isEmpty()) return;
    if (records.list(FeatureRecordRepository.PUBLIC, "faq").isEmpty()) {
      records.create(
          FeatureRecordRepository.PUBLIC,
          "faq",
          new SupportArticleRequest(
              "회원가입 인증 메일이 오지 않아요.",
              "회원·인증",
              "이메일 주소와 스팸함을 확인해주세요. 재발송은 기본 60초 후 가능합니다. 계속 발송되지 않으면 고객센터에 문의해주세요.",
              true));
      records.create(
          FeatureRecordRepository.PUBLIC,
          "faq",
          new SupportArticleRequest(
              "아이디나 비밀번호를 잊었어요.",
              "회원·인증",
              "로그인 화면의 아이디·비밀번호 찾기에서 가입 시 인증한 이메일로 인증해주세요. 소셜 전용 계정은 해당 제공자의 로그인을 이용해주세요.",
              true));
      records.create(
          FeatureRecordRepository.PUBLIC,
          "faq",
          new SupportArticleRequest(
              "무료체험 해지를 대신해주나요?",
              "구독 관리",
              "실제 해지는 해당 서비스에서 직접 진행해야 합니다. 해지한 뒤 무료체험 관리에서 해지 확인 상태로 바꿔주세요.",
              true));
      records.create(
          FeatureRecordRepository.PUBLIC,
          "faq",
          new SupportArticleRequest(
              "월간 결산의 지출은 어떻게 계산하나요?",
              "지출·데이터",
              "직접 기록한 실제 결제 내역을 월별로 합산합니다. 예상 구독료와는 구분하며, 지난달 기록이 없으면 증감액을 임의로 만들지 않습니다.",
              true));
    }
    records.create(FeatureRecordRepository.PUBLIC, "content_seed", Map.of("initialized", true));
  }
}
