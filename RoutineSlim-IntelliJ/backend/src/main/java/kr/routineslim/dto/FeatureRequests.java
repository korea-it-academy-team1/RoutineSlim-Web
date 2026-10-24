package kr.routineslim.dto;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.util.List;
public final class FeatureRequests {
 public record Trial(@NotBlank @Size(max=80) String name,@NotBlank @Size(max=40) String category,@NotNull LocalDate endDate,@NotNull @PositiveOrZero @Max(1000000000) Long amount,@Min(0) @Max(30) int notifyDays,@NotBlank @Pattern(regexp="ACTIVE|CANCELLED") String status){}
 public record Goal(@NotBlank @Size(max=120) String title,@NotBlank @Pattern(regexp="[0-9]{4}-(0[1-9]|1[0-2])") String month,@NotNull @Min(1) @Max(1000000000) Long target,List<@NotBlank @Size(max=120) String> tasks,List<Boolean> completed){}
 public record Saving(@NotBlank @Size(max=120) String title,@NotNull @Min(1) @Max(1000000000) Long amount,@NotNull LocalDate date){}
 public record Note(@Size(max=5000) String note){}
 public record Plan(@NotBlank @Size(max=80) String service,@NotBlank @Size(max=80) String plan,@NotBlank @Size(max=40) String category,@NotNull @PositiveOrZero @Max(1000000000) Long amount,@NotBlank @Pattern(regexp="monthly|yearly") String cycle,@Size(max=12) List<@NotBlank @Size(max=120) String> features,@Size(max=500) String sourceUrl,boolean active){}
 public record Article(@NotBlank @Size(max=120) String title,@NotBlank @Size(max=40) String category,@NotBlank @Size(max=10000) String content,boolean published){}
 public record Inquiry(@NotBlank @Size(max=40) String category,@NotBlank @Size(max=120) String title,@NotBlank @Size(max=5000) String content){}
 public record Answer(@NotBlank @Size(max=5000) String answer){}
 public record Suspension(boolean suspended){}
}
