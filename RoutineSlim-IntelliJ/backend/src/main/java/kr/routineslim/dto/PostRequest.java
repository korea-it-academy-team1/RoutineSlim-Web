package kr.routineslim.dto;

import jakarta.validation.constraints.*;
import java.util.List;

public record PostRequest(
    @NotBlank @Size(max = 120) String title,
    @NotBlank @Size(max = 40) String category,
    @NotBlank @Size(max = 5000) String content,
    @Size(max = 100000) String html,
    @Size(max = 3) List<@NotNull @Size(max = 4194400) String> images,
    @Size(max = 10) List<@NotBlank @Size(max = 60) String> tags) {
  public PostRequest(String title, String category, String content) {
    this(title, category, content, null, null, null);
  }

  @AssertTrue(message = "Only JPG, PNG and GIF images up to 3MB are supported")
  public boolean isImagesValid() {
    if (images == null) return true;
    for (String image : images) {
      if (image == null || !image.matches("(?s)^data:image/(png|jpeg|gif);base64,[A-Za-z0-9+/=]+$"))
        return false;
      try {
        byte[] bytes =
            java.util.Base64.getDecoder().decode(image.substring(image.indexOf(',') + 1));
        if (bytes.length > 3 * 1024 * 1024) return false;
        boolean png =
            bytes.length >= 8
                && (bytes[0] & 255) == 137
                && bytes[1] == 80
                && bytes[2] == 78
                && bytes[3] == 71;
        boolean jpg =
            bytes.length >= 3
                && (bytes[0] & 255) == 255
                && (bytes[1] & 255) == 216
                && (bytes[2] & 255) == 255;
        boolean gif = bytes.length >= 6 && bytes[0] == 71 && bytes[1] == 73 && bytes[2] == 70;
        if (!(png && image.startsWith("data:image/png;")
            || jpg && image.startsWith("data:image/jpeg;")
            || gif && image.startsWith("data:image/gif;"))) return false;
      } catch (IllegalArgumentException e) {
        return false;
      }
    }
    return true;
  }
}
