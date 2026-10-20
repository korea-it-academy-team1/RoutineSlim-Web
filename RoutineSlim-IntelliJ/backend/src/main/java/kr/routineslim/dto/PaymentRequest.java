package kr.routineslim.dto;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
public record PaymentRequest(Long subscriptionId,@NotBlank @Size(max=150) String description,@NotNull @PositiveOrZero Long amount,@NotNull LocalDate paidOn){}
