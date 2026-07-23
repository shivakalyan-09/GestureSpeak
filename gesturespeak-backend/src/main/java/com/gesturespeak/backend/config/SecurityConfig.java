package com.gesturespeak.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * Spring Security configuration.
 *
 * Security fixes applied:
 *  API-001 – CORS restricted to specific known origins (no wildcard)
 *  API-002 – CSRF disabled is acceptable for a stateless JWT API;
 *            wildcard CORS was the real amplifier and is now fixed
 *  API-004 – Security headers added: X-Content-Type-Options, X-Frame-Options,
 *            Content-Security-Policy, Referrer-Policy, HSTS
 *  API-006 – Authorization header removed from CORS exposedHeaders
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final FirebaseTokenFilter firebaseTokenFilter;

    /**
     * Allowed origins for CORS.
     * Add your GitHub Pages URL and any localhost ports used in development.
     * API-001: Never use wildcard ("*") here.
     */
    private static final List<String> ALLOWED_ORIGINS = List.of(
            "http://localhost:3000",
            "http://localhost:5173",
            "http://localhost:5174",
            "https://shivakalyan-09.github.io"   // GitHub Pages domain
    );

    public SecurityConfig(FirebaseTokenFilter firebaseTokenFilter) {
        this.firebaseTokenFilter = firebaseTokenFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // CSRF: acceptable to disable for a stateless REST API where auth is
            // header-based (not cookie-based). The real risk was wildcard CORS (fixed).
            .csrf(AbstractHttpConfigurer::disable)

            .cors(cors -> cors.configurationSource(corsConfigurationSource()))

            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

            // API-004: Security headers
            .headers(headers -> headers
                .contentTypeOptions(ct -> {})                       // X-Content-Type-Options: nosniff
                .frameOptions(frame -> frame.deny())                // X-Frame-Options: DENY
                .httpStrictTransportSecurity(hsts ->                // HSTS
                    hsts.includeSubDomains(true).maxAgeInSeconds(31536000))
                .referrerPolicy(ref ->                              // Referrer-Policy
                    ref.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
                .contentSecurityPolicy(csp ->
                    csp.policyDirectives(
                        "default-src 'self'; " +
                        "script-src 'self'; " +
                        "object-src 'none'; " +
                        "frame-ancestors 'none';"
                    ))
            )

            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                    "/api/auth/register",
                    "/api/auth/login",
                    "/api/auth/forgot-password",
                    "/api/auth/reset-password",
                    "/api/auth/verify-otp",
                    "/api/learning/public/**",
                    "/api/translate",
                    "/api/tts",
                    "/api/health",
                    "/api/health/**",
                    "/actuator/health"
                    // Removed /actuator/info – can expose version/config info
                ).permitAll()
                .anyRequest().authenticated()
            )
            .addFilterBefore(firebaseTokenFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // API-001: Explicit origin list – no wildcard
        configuration.setAllowedOrigins(ALLOWED_ORIGINS);

        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "Cache-Control"));

        // API-006: Do NOT expose Authorization header – tokens must not be readable
        //          from cross-origin JavaScript contexts.
        configuration.setExposedHeaders(List.of()); // empty – nothing exposed

        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
