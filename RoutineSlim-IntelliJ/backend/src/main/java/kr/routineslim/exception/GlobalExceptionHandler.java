package kr.routineslim.exception;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.http.converter.HttpMessageNotReadableException;
@RestControllerAdvice
public class GlobalExceptionHandler {
 @ExceptionHandler(ResponseStatusException.class)
 public ResponseEntity<Map<String,String>> status(ResponseStatusException e){return ResponseEntity.status(e.getStatusCode()).body(Map.of("error",e.getReason()==null?"Request failed":e.getReason()));}
 @ExceptionHandler(MethodArgumentNotValidException.class)
 public ResponseEntity<Map<String,String>> invalid(MethodArgumentNotValidException e){return ResponseEntity.badRequest().body(Map.of("error","Invalid input"));}
 @ExceptionHandler(HttpMessageNotReadableException.class)
 public ResponseEntity<Map<String,String>> malformed(HttpMessageNotReadableException e){return ResponseEntity.badRequest().body(Map.of("error","Malformed JSON request"));}
}
