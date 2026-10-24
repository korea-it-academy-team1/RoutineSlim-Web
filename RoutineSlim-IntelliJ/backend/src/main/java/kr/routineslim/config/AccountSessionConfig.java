package kr.routineslim.config;

import jakarta.servlet.http.*;
import kr.routineslim.repository.MemberRepository;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.*;
import org.springframework.web.servlet.config.annotation.*;

@Configuration
public class AccountSessionConfig implements WebMvcConfigurer {
  private final kr.routineslim.service.AccountRestrictionService restrictions;
  private final MemberRepository members;

  public AccountSessionConfig(
      MemberRepository members, kr.routineslim.service.AccountRestrictionService restrictions) {
    this.members = members;
    this.restrictions = restrictions;
  }

  @Override
  public void addInterceptors(InterceptorRegistry registry) {
    registry
        .addInterceptor(
            new HandlerInterceptor() {
              @Override
              public boolean preHandle(
                  HttpServletRequest request, HttpServletResponse response, Object handler) {
                HttpSession session = request.getSession(false);
                Object user = session == null ? null : session.getAttribute("user");
                if (user instanceof String id
                    && (members.passwordHash(id).isEmpty()
                        || restrictions.suspended(id)
                        || restrictions.revision(id)
                            != (session.getAttribute("accountRevision") instanceof Number n
                                ? n.intValue()
                                : 0))) {
                  session.invalidate();
                  String path = request.getRequestURI();
                  if (java.util.Set.of(
                          "/api/login",
                          "/api/register",
                          "/api/logout",
                          "/api/csrf",
                          "/api/oauth/providers")
                      .contains(path)) return true;
                  throw new ResponseStatusException(
                      HttpStatus.UNAUTHORIZED, "세션이 만료되었거나 이용할 수 없는 계정입니다. 다시 로그인해주세요.");
                }
                return true;
              }
            })
        .addPathPatterns("/api/**");
  }
}
