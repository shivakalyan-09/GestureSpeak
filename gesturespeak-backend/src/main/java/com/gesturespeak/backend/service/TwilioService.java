package com.gesturespeak.backend.service;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

/**
 * Twilio SMS service.
 *
 * Security fixes applied:
 *  SDE-004 – Full SMS message body is no longer logged to console
 *  INF-001 – Startup warning logged clearly when Twilio credentials are missing/placeholder
 */
@Service
public class TwilioService {

    @Value("${twilio.account-sid:}")
    private String accountSid;

    @Value("${twilio.auth-token:}")
    private String authToken;

    @Value("${twilio.from-number:}")
    private String fromNumber;

    private final HttpClient httpClient = HttpClient.newHttpClient();

    /** INF-001: Warn clearly at startup if Twilio is not configured */
    @PostConstruct
    public void validateConfig() {
        if (isMockMode()) {
            System.err.println("[TwilioService] WARNING: Twilio credentials are not configured. " +
                               "SMS sending is in mock/simulation mode. " +
                               "Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER " +
                               "environment variables for real SMS delivery.");
        }
    }

    private boolean isMockMode() {
        return accountSid == null || accountSid.isBlank() || accountSid.contains("placeholder")
            || authToken  == null || authToken.isBlank()  || authToken.contains("placeholder");
    }

    public boolean sendSms(String toPhoneNumber, String messageText) {
        if (isMockMode()) {
            // SDE-004: Log only the destination number and status – never log the message body
            System.out.printf("[TwilioService] MOCK – SMS simulated to %s (message body not logged)%n",
                    toPhoneNumber);
            return true; // Simulate success
        }

        try {
            String url = "https://api.twilio.com/2010-04-01/Accounts/" + accountSid + "/Messages.json";

            String form = "From=" + URLEncoder.encode(fromNumber, StandardCharsets.UTF_8)
                        + "&To="   + URLEncoder.encode(toPhoneNumber, StandardCharsets.UTF_8)
                        + "&Body=" + URLEncoder.encode(messageText, StandardCharsets.UTF_8);

            String auth       = accountSid + ":" + authToken;
            String base64Auth = Base64.getEncoder().encodeToString(auth.getBytes(StandardCharsets.UTF_8));

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Authorization", "Basic " + base64Auth)
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(form))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                // SDE-004: Log only status code, not the response body (which may echo the message)
                System.out.printf("[TwilioService] SMS delivered successfully to %s (HTTP %d)%n",
                        toPhoneNumber, response.statusCode());
                return true;
            } else {
                System.err.printf("[TwilioService] SMS delivery failed to %s (HTTP %d)%n",
                        toPhoneNumber, response.statusCode());
                return false;
            }

        } catch (Exception e) {
            System.err.printf("[TwilioService] SMS transmission error to %s: %s%n",
                    toPhoneNumber, e.getMessage());
            return false;
        }
    }
}
