package com.gesturespeak.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Service
public class TwilioService {

    @Value("${twilio.account-sid:}")
    private String accountSid;

    @Value("${twilio.auth-token:}")
    private String authToken;

    @Value("${twilio.from-number:}")
    private String fromNumber;

    private final HttpClient httpClient = HttpClient.newHttpClient();

    public boolean sendSms(String toPhoneNumber, String messageText) {
        if (accountSid == null || accountSid.trim().isEmpty() || accountSid.contains("placeholder") ||
            authToken == null || authToken.trim().isEmpty() || authToken.contains("placeholder")) {
            System.out.println("================= TWILIO MOCK Dispatched =================");
            System.out.println("TO: " + toPhoneNumber);
            System.out.println("FROM (Mock): " + fromNumber);
            System.out.println("MESSAGE: " + messageText);
            System.out.println("Reason: Twilio credentials not configured in application.properties.");
            System.out.println("==========================================================");
            return true; // Return true to indicate successful mock simulation
        }

        try {
            String url = "https://api.twilio.com/2010-04-01/Accounts/" + accountSid + "/Messages.json";
            
            String form = "From=" + URLEncoder.encode(fromNumber, StandardCharsets.UTF_8) +
                          "&To=" + URLEncoder.encode(toPhoneNumber, StandardCharsets.UTF_8) +
                          "&Body=" + URLEncoder.encode(messageText, StandardCharsets.UTF_8);

            String auth = accountSid + ":" + authToken;
            String base64Auth = Base64.getEncoder().encodeToString(auth.getBytes(StandardCharsets.UTF_8));

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Authorization", "Basic " + base64Auth)
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(form))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                System.out.println("Twilio SMS sent successfully to " + toPhoneNumber);
                return true;
            } else {
                System.err.println("Failed to send Twilio SMS. HTTP Status: " + response.statusCode());
                System.err.println("Response Body: " + response.body());
                return false;
            }
        } catch (Exception e) {
            System.err.println("Twilio SMS transmission error to " + toPhoneNumber + ": " + e.getMessage());
            return false;
        }
    }
}
