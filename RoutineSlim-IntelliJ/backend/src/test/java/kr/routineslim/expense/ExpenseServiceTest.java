package kr.routineslim.expense;
import kr.routineslim.service.ExpenseService;
import kr.routineslim.entity.Subscription;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
class ExpenseServiceTest {
 @Test void monthlyConversion(){
 assertEquals(1000,ExpenseService.monthly(new Subscription("u","a","c",12000,"yearly",1,"active")));
 assertEquals(5200,ExpenseService.monthly(new Subscription("u","a","c",1200,"weekly",1,"active")));
 assertEquals(3000,ExpenseService.monthly(new Subscription("u","a","c",3000,"monthly",1,"active")));
 }
}
