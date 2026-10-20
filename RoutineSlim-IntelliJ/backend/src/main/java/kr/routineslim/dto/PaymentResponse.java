package kr.routineslim.dto;
import java.time.LocalDate;
public record PaymentResponse(Long id,Long subscriptionId,String description,long amount,LocalDate paidOn){}
