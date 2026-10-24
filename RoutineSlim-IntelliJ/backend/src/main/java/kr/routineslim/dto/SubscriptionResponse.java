package kr.routineslim.dto;

public record SubscriptionResponse(
    Long id,
    String name,
    String category,
    long amount,
    String cycle,
    int day,
    String status,
    java.time.LocalDate billingAnchorDate) {}
