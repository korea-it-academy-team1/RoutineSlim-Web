package kr.routineslim.dto;

import java.util.Map;

public record ExpenseSummary(
    double monthlyTotal,
    double annualTotal,
    int subscriptionCount,
    Map<String, Double> byCategory) {}
