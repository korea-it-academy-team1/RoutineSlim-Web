package kr.routineslim.dto;

import jakarta.validation.constraints.*;

public record SubscriptionNoteRequest(@Size(max = 5000) String note) {}
