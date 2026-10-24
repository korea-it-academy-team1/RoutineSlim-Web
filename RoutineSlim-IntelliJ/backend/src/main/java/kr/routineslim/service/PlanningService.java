package kr.routineslim.service;

import com.fasterxml.jackson.databind.node.ObjectNode;
import java.time.*;
import java.util.*;
import kr.routineslim.dto.FreeTrialRequest;
import kr.routineslim.dto.SavingsEntryRequest;
import kr.routineslim.dto.SavingsGoalRequest;
import kr.routineslim.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PlanningService {
  private final FeatureRecordRepository records;
  private final UserDataRepository users;

  public PlanningService(FeatureRecordRepository records, UserDataRepository users) {
    this.records = records;
    this.users = users;
  }

  public List<ObjectNode> trials(String user) {
    return records.list(user, "trial").stream()
        .sorted(Comparator.comparing(x -> x.path("endDate").asText()))
        .toList();
  }

  @Transactional
  public ObjectNode trial(String user, String id, FreeTrialRequest request) {
    if (id == null) return records.create(user, "trial", request);
    return records.save(user, "trial", id, request);
  }

  @Transactional
  public void deleteTrial(String user, String id) {
    records.delete(user, "trial", id);
  }

  public Map<String, Object> goals(String user, String month) {
    parseMonth(month);
    var goal =
        records.list(user, "goal").stream()
            .filter(x -> month.equals(x.path("month").asText()))
            .findFirst()
            .orElse(null);
    var entries =
        goal == null
            ? List.<ObjectNode>of()
            : records.list(user, "saving").stream()
                .filter(x -> goal.path("id").asText().equals(x.path("goalId").asText()))
                .toList();
    long saved = entries.stream().mapToLong(x -> x.path("amount").asLong()).sum();
    var out = new LinkedHashMap<String, Object>();
    out.put("goal", goal);
    out.put("entries", entries);
    out.put("saved", saved);
    out.put(
        "percent",
        goal == null ? 0 : Math.min(100, Math.round(saved * 100.0 / goal.path("target").asLong())));
    return out;
  }

  @Transactional
  public ObjectNode goal(String user, String id, SavingsGoalRequest request) {
    parseMonth(request.month());
    if (request.tasks() != null && request.tasks().size() > 20
        || request.completed() != null && request.completed().size() > 20)
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "실천 항목은 20개 이하입니다.");
    users.lockUser(user);
    if (id != null) {
      var existing = records.get(user, "goal", id);
      if (!request.month().equals(existing.path("month").asText())
          && records.list(user, "saving").stream()
              .anyMatch(entry -> id.equals(entry.path("goalId").asText()))) {
        throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST, "절약 내역이 있는 목표의 기준 월은 변경할 수 없습니다.");
      }
    }
    var duplicate =
        records.list(user, "goal").stream()
            .anyMatch(
                x ->
                    request.month().equals(x.path("month").asText())
                        && !x.path("id").asText().equals(id));
    if (duplicate) throw new ResponseStatusException(HttpStatus.CONFLICT, "이 달의 목표가 이미 있습니다.");
    return id == null
        ? records.create(user, "goal", request)
        : records.save(user, "goal", id, request);
  }

  @Transactional
  public void deleteGoal(String user, String id) {
    users.lockUser(user);
    records.get(user, "goal", id);
    for (var entry : records.list(user, "saving"))
      if (id.equals(entry.path("goalId").asText()))
        records.delete(user, "saving", entry.path("id").asText());
    records.delete(user, "goal", id);
  }

  @Transactional
  public ObjectNode saving(String user, String goalId, SavingsEntryRequest request) {
    users.lockUser(user);
    var goal = records.get(user, "goal", goalId);
    if (!YearMonth.from(request.date()).toString().equals(goal.path("month").asText()))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "목표와 같은 달의 절약 내역을 입력해주세요.");
    var data = records.object();
    data.put("goalId", goalId);
    data.put("title", request.title().trim());
    data.put("amount", request.amount());
    data.put("date", request.date().toString());
    return records.create(user, "saving", data);
  }

  @Transactional
  public void deleteSaving(String user, String id) {
    records.delete(user, "saving", id);
  }

  public static YearMonth parseMonth(String value) {
    try {
      var month = YearMonth.parse(value);
      if (month.getYear() < 1 || month.getYear() > 9999) throw new IllegalArgumentException();
      return month;
    } catch (Exception e) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "올바른 조회 월을 입력해주세요.");
    }
  }
}
