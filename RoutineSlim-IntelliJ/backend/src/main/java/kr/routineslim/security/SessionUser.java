package kr.routineslim.security;

import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** Common session authentication guard for JSON endpoints. */
public final class SessionUser {
    private SessionUser() {}
    public static String require(HttpSession session) {
        Object user = session.getAttribute("user");
        if (user == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Login required");
        return user.toString();
    }
}
