package kr.routineslim.dto;
import java.time.LocalDate;
public record PaymentEvent(Long subscriptionId,String name,LocalDate date,long amount,String category) {}
