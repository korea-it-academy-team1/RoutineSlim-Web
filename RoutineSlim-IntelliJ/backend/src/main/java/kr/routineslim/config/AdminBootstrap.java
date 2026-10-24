package kr.routineslim.config;

import java.nio.file.Path;
import kr.routineslim.service.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.*;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(0)
public class AdminBootstrap implements ApplicationRunner {
  private final AccountSecurityService accounts;
  private final AdminProvisioningService provisioning;
  private final boolean enabled;
  private final String password, file;

  public AdminBootstrap(
      AccountSecurityService accounts,
      AdminProvisioningService provisioning,
      @Value("${routineslim.admin.bootstrap.enabled:true}") boolean enabled,
      @Value("${routineslim.admin.bootstrap.password:}") String password,
      @Value("${routineslim.admin.bootstrap.credentials-file:./data/admin-initial-password.txt}")
          String file) {
    this.accounts = accounts;
    this.provisioning = provisioning;
    this.enabled = enabled;
    this.password = password;
    this.file = file;
  }

  public void run(ApplicationArguments args) throws Exception {
    if (enabled
        && (!accounts.isAdmin(accounts.adminId()) || "routinslim".equals(accounts.adminId()))
        && provisioning.provision(accounts.adminId(), password, Path.of(file)))
      org.slf4j.LoggerFactory.getLogger(getClass())
          .info("최초 관리자 계정 생성 완료. 로그인 정보 파일: {}", Path.of(file).toAbsolutePath());
  }
}
