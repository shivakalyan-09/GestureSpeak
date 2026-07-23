package com.gesturespeak.backend.controller;

import com.gesturespeak.backend.service.RateLimiterService;
import com.gesturespeak.backend.service.TranslationService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

/**
 * Translation and Text-to-Speech controller.
 *
 * Security fixes applied:
 *  API-003 – Removed @CrossOrigin(origins="*") annotation; CORS managed centrally
 *  INJ-001 – Language code whitelist enforced on /tts to prevent SSRF
 *  INJ-002 – Language code whitelist enforced on /translate
 *  API-005 – Rate limiting applied to translation requests
 */
@RestController
@RequestMapping("/api")
// API-003: @CrossOrigin annotation removed – CORS is configured globally in SecurityConfig
public class TranslationController {

    private final TranslationService translationService;
    private final RateLimiterService rateLimiter;
    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * INJ-001 / INJ-002: Whitelist of allowed ISO 639-1 language codes.
     * Language codes outside this set are rejected before constructing any URL.
     */
    private static final Set<String> ALLOWED_LANG_CODES = Set.of(
        "en", "te", "hi", "ta", "kn", "ml", "fr", "es", "de", "ja", "zh",
        "ar", "pt", "ru", "ko", "it", "nl", "pl", "sv", "tr", "bn", "ur",
        "gu", "mr", "pa", "or", "as", "ne", "si"
    );

    public TranslationController(TranslationService translationService,
                                 RateLimiterService rateLimiter) {
        this.translationService = translationService;
        this.rateLimiter        = rateLimiter;
    }

    /** Extract a stable client key for rate limiting from the request */
    private String clientKey(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip != null && !ip.isBlank()) return ip.split(",")[0].trim();
        return request.getRemoteAddr();
    }

    @PostMapping("/translate")
    public ResponseEntity<?> translate(@RequestBody Map<String, String> request,
                                       HttpServletRequest httpRequest) {
        String text       = request.get("text");
        String targetLang = request.get("targetLang");
        String sourceLang = request.getOrDefault("sourceLang", "en");

        if (text == null || text.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Empty text parameter"));
        }
        // INP-003: Length limit
        if (text.length() > 2000) {
            return ResponseEntity.badRequest().body(Map.of("error", "Text exceeds maximum length of 2000 characters"));
        }
        // INJ-002: Validate language codes
        if (targetLang == null || !ALLOWED_LANG_CODES.contains(targetLang.toLowerCase().trim())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Unsupported or missing target language code"));
        }
        if (!ALLOWED_LANG_CODES.contains(sourceLang.toLowerCase().trim())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Unsupported source language code"));
        }

        // API-005: Rate limit translation requests
        if (!rateLimiter.isTranslationAllowed(clientKey(httpRequest))) {
            return ResponseEntity.status(429)
                    .body(Map.of("error", "Too many requests. Please slow down."));
        }

        try {
            String translated = translationService.translateText(
                    text, targetLang.toLowerCase().trim(), sourceLang.toLowerCase().trim());
            Map<String, String> response = new HashMap<>();
            response.put("translatedText", translated);
            response.put("sourceLang",     sourceLang);
            response.put("targetLang",     targetLang);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Translation failed. Please try again.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @PostMapping("/tts")
    public ResponseEntity<byte[]> streamTts(@RequestBody Map<String, String> request,
                                            HttpServletRequest httpRequest) {
        String text = request.get("text");
        String lang = request.get("lang");

        if (text == null || text.trim().isEmpty() || lang == null || lang.trim().isEmpty()) {
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
        // INP-003: Length limit for TTS
        if (text.length() > 500) {
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
        // INJ-001: Validate lang against allowlist to prevent SSRF
        if (!ALLOWED_LANG_CODES.contains(lang.toLowerCase().trim())) {
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }

        // API-005: Rate limit TTS requests
        if (!rateLimiter.isTranslationAllowed("tts:" + clientKey(httpRequest))) {
            return new ResponseEntity<>(HttpStatus.TOO_MANY_REQUESTS);
        }

        try {
            // INJ-001: Use only the validated lang code – never interpolate raw user input into the URL
            String safeLang = lang.toLowerCase().trim();
            String url = String.format(
                    "https://translate.google.com/translate_tts?ie=UTF-8&tl=%s&client=tw-ob&q=%s",
                    safeLang,
                    org.springframework.web.util.UriUtils.encode(text.trim(), "UTF-8")
            );

            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "Mozilla/5.0");
            headers.set("Referer", "https://translate.google.com/");

            ResponseEntity<byte[]> response = restTemplate.exchange(
                    url, HttpMethod.GET, new HttpEntity<>(headers), byte[].class);

            HttpHeaders responseHeaders = new HttpHeaders();
            responseHeaders.setContentType(MediaType.parseMediaType("audio/mpeg"));
            if (response.getBody() != null) {
                responseHeaders.setContentLength(response.getBody().length);
            }
            return new ResponseEntity<>(response.getBody(), responseHeaders, HttpStatus.OK);

        } catch (Exception e) {
            System.err.println("[TranslationController] TTS proxy error: " + e.getMessage());
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
