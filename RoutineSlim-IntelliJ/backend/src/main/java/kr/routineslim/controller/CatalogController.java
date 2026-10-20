package kr.routineslim.controller;
import kr.routineslim.dto.CatalogItem;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController @RequestMapping("/api/v1/catalog") public class CatalogController {
 @GetMapping public List<CatalogItem> list(){return List.of(
 new CatalogItem("넷플릭스","OTT/영상","N","#171717"),new CatalogItem("YouTube Premium","OTT/영상","▶","#ff0033"),
 new CatalogItem("디즈니플러스","OTT/영상","D+","#1536a1"),new CatalogItem("Spotify","음악","♫","#1db954"),
 new CatalogItem("Apple Music","음악","♪","#f25168"),new CatalogItem("iCloud+","생활/기타","☁","#d9f4ff"),
 new CatalogItem("ChatGPT Plus","생활/기타","✦","#e6f5ee"),new CatalogItem("네이버플러스","멤버십","N+","#04c75a"));}
}
