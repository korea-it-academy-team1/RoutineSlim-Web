package kr.routineslim.service;

import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.validation.Validator;
import kr.routineslim.dto.*;
import kr.routineslim.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class MemberService {
  private final AccountSecurityService security;
  private final MemberRepository members;
  private final UserDataRepository data;
  private final ObjectMapper json;
  private final Validator validator;

  public MemberService(
      MemberRepository members,
      UserDataRepository data,
      ObjectMapper json,
      Validator validator,
      AccountSecurityService security) {
    this.security = security;
    this.members = members;
    this.data = data;
    this.json = json;
    this.validator = validator;
  }

  private ObjectNode stored(String id) {
    try {
      JsonNode value = json.readTree(data.get(id, "profile"));
      return value != null && value.isObject() ? (ObjectNode) value : json.createObjectNode();
    } catch (Exception e) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid stored profile");
    }
  }

  @Transactional(readOnly = true)
  public MemberProfileResponse get(String id) {
    var base = members.profile(id);
    var extra = stored(id);
    String name =
        base.displayName().equals(id) && !extra.path("name").asText("").isBlank()
            ? extra.path("name").asText()
            : base.displayName();
    String email = base.email().isBlank() ? extra.path("email").asText("") : base.email();
    return new MemberProfileResponse(
        id,
        name,
        email,
        extra.path("phone").asText(""),
        extra.path("birth").asText(""),
        extra.path("address").asText(""),
        extra.path("addressDetail").asText(""),
        extra.path("photo").asText(""),
        security.emailVerified(id, email));
  }

  @Transactional
  public MemberProfileResponse update(String id, MemberProfileRequest r) {
    if (!validator.validate(r).isEmpty())
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid profile");
    if (r.birth() != null && !r.birth().isBlank())
      try {
        if (java.time.LocalDate.parse(r.birth()).isAfter(java.time.LocalDate.now()))
          throw new IllegalArgumentException();
      } catch (Exception e) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid birth date");
      }
    if (r.photo() != null && !r.photo().isBlank() && !validPhoto(r.photo()))
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Invalid profile photo (JPG/PNG/GIF, maximum 5MB)");
    if (security.hasVerifiedEmail(id) && !security.emailVerified(id, r.email()))
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "인증된 이메일은 변경할 수 없습니다. 이메일 변경에는 별도 재인증이 필요합니다.");
    data.lockUser(id);
    ObjectNode extra = stored(id);
    extra.put("name", r.displayName().trim());
    extra.put("email", r.email() == null ? "" : r.email().trim());
    if (r.phone() != null) extra.put("phone", r.phone().trim());
    if (r.birth() != null) extra.put("birth", r.birth());
    if (r.address() != null) extra.put("address", r.address().trim());
    if (r.addressDetail() != null) extra.put("addressDetail", r.addressDetail().trim());
    if (r.photo() != null) extra.put("photo", r.photo());
    members.updateProfile(id, extra.path("name").asText(), extra.path("email").asText());
    data.save(id, "profile", extra.toString());
    return get(id);
  }

  public String legacyProfile(String id) {
    var p = get(id);
    ObjectNode out = stored(id);
    out.put("name", p.displayName());
    out.put("email", p.email());
    return out.toString();
  }

  @Transactional
  public void saveLegacy(String id, String value) {
    try {
      JsonNode n = json.readTree(value);
      if (n == null || !n.isObject()) throw new IllegalArgumentException();
      var old = get(id);
      update(
          id,
          new MemberProfileRequest(
              text(n, "name", old.displayName()),
              text(n, "email", old.email()),
              text(n, "phone", null),
              text(n, "birth", null),
              text(n, "address", null),
              text(n, "addressDetail", null),
              text(n, "photo", "")));
    } catch (ResponseStatusException e) {
      throw e;
    } catch (Exception e) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid profile");
    }
  }

  private String text(JsonNode node, String key, String fallback) {
    return node.hasNonNull(key) ? node.get(key).asText() : fallback;
  }

  private boolean validPhoto(String value) {
    try {
      if (!value.matches("^data:image/(png|jpeg|gif);base64,[A-Za-z0-9+/=]+$")) return false;
      byte[] b = java.util.Base64.getDecoder().decode(value.substring(value.indexOf(',') + 1));
      if (b.length > 5 * 1024 * 1024) return false;
      return value.startsWith("data:image/png;")
              && b.length >= 8
              && (b[0] & 255) == 137
              && b[1] == 80
              && b[2] == 78
              && b[3] == 71
          || value.startsWith("data:image/jpeg;")
              && b.length >= 3
              && (b[0] & 255) == 255
              && (b[1] & 255) == 216
              && (b[2] & 255) == 255
          || value.startsWith("data:image/gif;")
              && b.length >= 6
              && b[0] == 71
              && b[1] == 73
              && b[2] == 70;
    } catch (Exception e) {
      return false;
    }
  }
}
