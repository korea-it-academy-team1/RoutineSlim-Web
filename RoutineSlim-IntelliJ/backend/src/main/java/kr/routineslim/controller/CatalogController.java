package kr.routineslim.controller;

import java.util.List;
import kr.routineslim.dto.CatalogItem;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/catalog")
public class CatalogController {
  @GetMapping
  public List<CatalogItem> list() {
    return List.of(
        new CatalogItem("넷플릭스", "OTT/영상", "N", "#171717"),
        new CatalogItem("YouTube Premium", "OTT/영상", "▶", "#ff0033"),
        new CatalogItem("디즈니플러스", "OTT/영상", "D+", "#1536a1"),
        new CatalogItem("티빙", "OTT/영상", "T", "#ff153c"),
        new CatalogItem("웨이브", "OTT/영상", "W", "#1968ff"),
        new CatalogItem("쿠팡플레이", "OTT/영상", "C", "#1599ee"),
        new CatalogItem("Spotify", "음악", "♫", "#1db954"),
        new CatalogItem("Apple Music", "음악", "♪", "#f25168"),
        new CatalogItem("멜론", "음악", "M", "#00c73c"),
        new CatalogItem("iCloud+", "생활/기타", "☁", "#58b3ed"),
        new CatalogItem("Google One", "생활/기타", "G", "#4285f4"),
        new CatalogItem("ChatGPT Plus", "생산성", "✦", "#259b7e"),
        new CatalogItem("쿠팡 와우", "멤버십", "C", "#f25842"),
        new CatalogItem("네이버플러스", "멤버십", "N+", "#04c75a"),
        new CatalogItem("KT 인터넷", "통신", "kt", "#e93742"),
        new CatalogItem("SKT", "통신", "S", "#ee6738"),
        new CatalogItem("LG U+", "통신", "U+", "#dc1d78"),
        new CatalogItem("Adobe", "생산성", "A", "#e43333"),
        new CatalogItem("Notion", "생산성", "N", "#333333"),
        new CatalogItem("월세", "주거/생활", "⌂", "#9b80d7"),
        new CatalogItem("관리비", "주거/생활", "▦", "#7ba8cf"),
        new CatalogItem("보험료", "생활/기타", "＋", "#5cbea7"));
  }
}
