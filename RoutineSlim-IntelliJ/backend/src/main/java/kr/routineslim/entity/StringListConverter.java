package kr.routineslim.entity;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.*;
import java.util.*;

@Converter
public class StringListConverter implements AttributeConverter<List<String>, String> {
  private static final ObjectMapper JSON = new ObjectMapper();

  public String convertToDatabaseColumn(List<String> value) {
    try {
      return JSON.writeValueAsString(value == null ? List.of() : value);
    } catch (Exception e) {
      throw new IllegalArgumentException("Invalid list", e);
    }
  }

  public List<String> convertToEntityAttribute(String value) {
    if (value == null || value.isBlank()) return new ArrayList<>();
    try {
      return JSON.readValue(value, new TypeReference<List<String>>() {});
    } catch (Exception e) {
      throw new IllegalArgumentException("Invalid stored list", e);
    }
  }
}
