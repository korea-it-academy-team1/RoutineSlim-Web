package kr.routineslim.dto;
import jakarta.validation.constraints.*;
public record PostRequest(@NotBlank @Size(max=120) String title,@NotBlank @Size(max=40) String category,@NotBlank @Size(max=5000) String content){}
