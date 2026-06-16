package com.gesturespeak.backend.controller;

import com.gesturespeak.backend.service.TranslationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class TranslationController {

    private final TranslationService translationService;

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
}
