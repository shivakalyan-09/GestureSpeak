package com.gesturespeak.backend.service;

import org.springframework.stereotype.Service;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Simple in-memory rate limiter using a sliding window counter.
 * Designed for college-project use; for production, use Bucket4j + Redis.
 *
 * Security fixes: AUTH-005, BIZ-001, API-005
 */
@Service
public class RateLimiterService {

    private static class Window {
        final AtomicLong windowStart = new AtomicLong(System.currentTimeMillis());
        final AtomicInteger count    = new AtomicInteger(0);
    }

    // key -> sliding-window state
    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();

    /**
     * Returns true if the key is within the allowed rate, false if it has been exceeded.
     *
     * @param key         Unique identifier (e.g. "otp:email@example.com" or "sos:userId")
     * @param maxRequests Maximum requests allowed in the window
     * @param windowMs    Window size in milliseconds
     */
    public boolean isAllowed(String key, int maxRequests, long windowMs) {
        long now = System.currentTimeMillis();
        Window w = windows.computeIfAbsent(key, k -> new Window());

        synchronized (w) {
            long age = now - w.windowStart.get();
            if (age > windowMs) {
                // Reset window
                w.windowStart.set(now);
                w.count.set(0);
            }
            if (w.count.get() >= maxRequests) {
                return false;
            }
            w.count.incrementAndGet();
            return true;
        }
    }

    /** Convenience: 5 attempts per 10 minutes – OTP brute-force protection (AUTH-005) */
    public boolean isOtpAllowed(String email) {
        return isAllowed("otp:" + email, 5, 10 * 60 * 1000L);
    }

    /** Convenience: 1 SOS per 60 seconds per user (BIZ-001) */
    public boolean isSosAllowed(String userId) {
        return isAllowed("sos:" + userId, 1, 60 * 1000L);
    }

    /** Convenience: 10 translation requests per minute (API-005) */
    public boolean isTranslationAllowed(String clientKey) {
        return isAllowed("translate:" + clientKey, 10, 60 * 1000L);
    }

    /** Reset the rate limit counter for a key (e.g. after successful OTP) */
    public void reset(String key) {
        windows.remove(key);
    }
}
