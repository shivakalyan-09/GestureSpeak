package com.gesturespeak.backend.controller;

import com.gesturespeak.backend.service.TranslationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class TranslationController {

    private final TranslationService translationService;
    private final RestTemplate restTemplate = new RestTemplate();

    public TranslationController(TranslationService translationService) {
        this.translationService = translationService;
    }

    @PostMapping("/translate")
    public ResponseEntity<?> translate(@RequestBody Map<String, String> request) {
        String text = request.get("text");
        String targetLang = request.get("targetLang");
        String sourceLang = request.getOrDefault("sourceLang", "en");

        if (text == null || text.trim().isEmpty()) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Empty text parameter");
            return ResponseEntity.badRequest().body(error);
        }

        try {
            String translated = translationService.translateText(text, targetLang, sourceLang);
            Map<String, String> response = new HashMap<>();
            response.put("translatedText", translated);
            response.put("sourceLang", sourceLang);
            response.put("targetLang", targetLang);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.err.println("Translation endpoint error: " + e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage() != null ? e.getMessage() : "Translation Failed. Please try again.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @PostMapping("/tts")
    public ResponseEntity<byte[]> streamTts(@RequestBody Map<String, String> request) {
        try {
            String text = request.get("text");
            String lang = request.get("lang");

            if (text == null || text.trim().isEmpty() || lang == null || lang.trim().isEmpty()) {
                return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
            }

            System.out.println("TTS Stream Proxy POST - Text: " + text + " | Lang: " + lang);

            String url = String.format("https://translate.google.com/translate_tts?ie=UTF-8&tl=%s&client=tw-ob&q=%s",
                    lang,
                    org.springframework.web.util.UriUtils.encode(text, "UTF-8")
            );

            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
            headers.set("Referer", "https://translate.google.com/");

            HttpEntity<Void> entity = new HttpEntity<>(headers);
            
            ResponseEntity<byte[]> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    entity,
                    byte[].class
            );

            HttpHeaders responseHeaders = new HttpHeaders();
            responseHeaders.setContentType(MediaType.parseMediaType("audio/mpeg"));
            if (response.getBody() != null) {
                responseHeaders.setContentLength(response.getBody().length);
            }
            
            return new ResponseEntity<>(response.getBody(), responseHeaders, HttpStatus.OK);
        } catch (Exception e) {
            System.err.println("TTS Proxy POST error: " + e.getMessage());
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
