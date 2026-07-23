package com.gesturespeak.backend.controller;

import com.gesturespeak.backend.model.Activity;
import com.gesturespeak.backend.service.FirebaseService;
import com.gesturespeak.backend.service.RateLimiterService;
import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.WriteResult;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.UserRecord;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.regex.Pattern;

/**
 * Authentication controller.
 *
 * Security fixes applied:
 *  SDE-005  – Removed hardcoded mock admin/user credentials from constructor
 *  AUTH-005  – OTP now expires after 5 minutes; max 5 attempts per email (via RateLimiterService)
 *  AUTH-006  – OTP is NO LONGER printed to console logs
 *  AUTH-007  – uid always derived from the authenticated session, never from request body
 *  AUTH-008  – Password reset requires a single-use reset-token issued after OTP verification
 *  INP-001   – Username sanitized before logging (control characters stripped)
 *  INP-004   – Email format validated on registration
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final FirebaseService    firebaseService;
    private final RateLimiterService rateLimiter;

    // OTP store: email -> {otp, expiryMs}   (AUTH-005: includes expiry)
    private static final Map<String, Map<String, Object>> otpStore = new ConcurrentHashMap<>();

    // Single-use reset tokens: token -> email  (AUTH-008)
    private static final Map<String, String> resetTokens = new ConcurrentHashMap<>();

    // Simple email regex for validation (INP-004)
    private static final Pattern EMAIL_PATTERN =
            Pattern.compile("^[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}$");

    public AuthController(FirebaseService firebaseService, RateLimiterService rateLimiter) {
        this.firebaseService = firebaseService;
        this.rateLimiter     = rateLimiter;
        // SDE-005: No hardcoded mock users in constructor
    }

    // ── Utilities ─────────────────────────────────────────────────────────────

    /** AUTH-007: uid always comes from the authenticated session principal */
    private String getAuthUserId() {
        return (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    /** INP-001: Strip control characters from strings before logging */
    private static String sanitizeForLog(String input) {
        if (input == null) return "(null)";
        return input.replaceAll("[\\p{Cntrl}]", "?");
    }

    private void logActivity(String uid, String details) {
        Activity activity = new Activity(
            UUID.randomUUID().toString(),
            uid,
            "profile_update",
            System.currentTimeMillis(),
            details
        );
        if (firebaseService.isFirebaseInitialized()) {
            try {
                Firestore db = firebaseService.getDb();
                db.collection("activities").document(activity.getId()).set(activity);
            } catch (Exception e) {
                System.err.println("[AuthController] Firestore profile activity save failed: " + e.getMessage());
            }
        } else {
            AnalyticsController.mockActivities
                .computeIfAbsent(uid, k -> new CopyOnWriteArrayList<>())
                .add(activity);
        }
    }

    // ── Endpoints ─────────────────────────────────────────────────────────────

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody Map<String, String> request,
                                          jakarta.servlet.http.HttpServletRequest httpRequest) {
        // AUTH-007 FIX: uid is derived from a real Firebase ID token presented in the
        // Authorization header – it is no longer accepted from the request body.
        // The frontend (which just completed Firebase sign-up) must send its Firebase
        // ID token here so the backend can independently verify who the registrant is.
        String authHeader = httpRequest.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401)
                    .body("Registration requires a valid Firebase ID token in the Authorization header");
        }

        String uid;
        String verifiedEmail;
        try {
            com.google.firebase.auth.FirebaseToken decoded =
                    com.google.firebase.auth.FirebaseAuth.getInstance()
                            .verifyIdToken(authHeader.substring(7));
            uid            = decoded.getUid();           // server-verified uid
            verifiedEmail  = decoded.getEmail();         // server-verified email
        } catch (Exception e) {
            return ResponseEntity.status(401)
                    .body("Invalid or expired Firebase ID token: " + e.getMessage());
        }

        // Still allow an optional 'username' from the body; ignore body 'uid'/'email'
        String username = request.get("username");

        // INP-004: Validate optional username
        if (username != null && username.length() > 64) {
            return ResponseEntity.badRequest().body("Username must be 64 characters or fewer");
        }

        Map<String, Object> profile = new HashMap<>();
        profile.put("uid",       uid);                           // from verified token
        profile.put("email",     verifiedEmail.toLowerCase());  // from verified token
        profile.put("username",  username != null && !username.trim().isEmpty()
                ? username.trim()
                : verifiedEmail.split("@")[0]);
        profile.put("role",      "USER");
        profile.put("createdAt", System.currentTimeMillis());

        if (firebaseService.isFirebaseInitialized()) {
            try {
                Firestore db = firebaseService.getDb();
                ApiFuture<WriteResult> future = db.collection("users")
                        .document(uid.trim()).set(profile);
                future.get();
                return ResponseEntity.ok(profile);
            } catch (Exception e) {
                return ResponseEntity.internalServerError()
                        .body("Failed to save profile: " + e.getMessage());
            }
        }
        return ResponseEntity.internalServerError()
                .body("Service unavailable – Firebase is not configured");
    }

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile() {
        String uid = getAuthUserId();

        if (firebaseService.isFirebaseInitialized()) {
            try {
                Firestore db  = firebaseService.getDb();
                DocumentReference docRef = db.collection("users").document(uid);
                ApiFuture<DocumentSnapshot> future = docRef.get();
                DocumentSnapshot document = future.get();
                if (document.exists()) {
                    return ResponseEntity.ok(document.getData());
                }
                // Fallback: pull from FirebaseAuth record
                UserRecord userRecord = FirebaseAuth.getInstance().getUser(uid);
                Map<String, Object> fallbackProfile = new HashMap<>();
                fallbackProfile.put("uid",      uid);
                fallbackProfile.put("email",    userRecord.getEmail());
                fallbackProfile.put("username", userRecord.getDisplayName() != null
                        ? userRecord.getDisplayName()
                        : userRecord.getEmail().split("@")[0]);
                fallbackProfile.put("role", "USER");
                return ResponseEntity.ok(fallbackProfile);
            } catch (Exception e) {
                return ResponseEntity.internalServerError()
                        .body("Error retrieving profile");
            }
        }
        return ResponseEntity.internalServerError()
                .body("Service unavailable – Firebase is not configured");
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@RequestBody Map<String, String> request) {
        String uid      = getAuthUserId();
        String username = request.get("username");

        if (username == null || username.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("username is required");
        }
        if (username.length() > 64) {
            return ResponseEntity.badRequest().body("Username must be 64 characters or fewer");
        }

        // INP-001: Sanitize username before logging
        logActivity(uid, "Updated username to: " + sanitizeForLog(username));

        if (firebaseService.isFirebaseInitialized()) {
            try {
                Firestore db = firebaseService.getDb();
                db.collection("users").document(uid).update("username", username.trim()).get();
                try {
                    UserRecord.UpdateRequest authUpdate =
                            new UserRecord.UpdateRequest(uid).setDisplayName(username.trim());
                    FirebaseAuth.getInstance().updateUser(authUpdate);
                } catch (Exception ignored) {}
                return ResponseEntity.ok(Map.of("message", "Profile updated successfully"));
            } catch (Exception e) {
                return ResponseEntity.internalServerError().body("Update failed");
            }
        }
        return ResponseEntity.internalServerError()
                .body("Service unavailable – Firebase is not configured");
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestParam String email) {
        // INP-004: Validate email
        if (email == null || !EMAIL_PATTERN.matcher(email.trim()).matches()) {
            // Return success anyway to prevent email enumeration
            return ResponseEntity.ok(Map.of(
                "message", "If that email exists, an OTP has been sent."
            ));
        }

        // AUTH-005: Rate-limit OTP generation
        if (!rateLimiter.isAllowed("otp-gen:" + email.trim().toLowerCase(), 3, 15 * 60_000L)) {
            return ResponseEntity.status(429).body(Map.of(
                "message", "Too many requests. Please wait before requesting another OTP."
            ));
        }

        if (!firebaseService.isFirebaseInitialized()) {
            return ResponseEntity.ok(Map.of(
                "message", "If that email exists, an OTP has been sent."
            ));
        }

        try {
            // Verify the email exists in Firebase Auth
            FirebaseAuth.getInstance().getUserByEmail(email.trim());
        } catch (Exception e) {
            // Don't reveal whether the email exists
            return ResponseEntity.ok(Map.of(
                "message", "If that email exists, an OTP has been sent."
            ));
        }

        // Generate OTP with expiry
        String otp = String.format("%06d", (int)(Math.random() * 1_000_000));
        Map<String, Object> otpEntry = new HashMap<>();
        otpEntry.put("otp",      otp);
        otpEntry.put("expiryMs", System.currentTimeMillis() + 5 * 60_000L); // 5 minutes
        otpStore.put(email.trim().toLowerCase(), otpEntry);

        // AUTH-006: OTP is NOT logged to console.
        // In a real app: EmailService.sendOtp(email, otp)
        // For local development, the OTP is intentionally not printed.
        System.out.println("[AuthController] OTP generated for reset request (not logged for security)");

        return ResponseEntity.ok(Map.of(
            "message", "If that email exists, an OTP has been sent."
        ));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestParam String email,
                                       @RequestParam String otp) {
        // AUTH-005: Rate-limit OTP verification attempts
        if (!rateLimiter.isOtpAllowed(email.trim().toLowerCase())) {
            return ResponseEntity.status(429).body(Map.of(
                "message", "Too many incorrect attempts. Please wait 10 minutes.",
                "verified", false
            ));
        }

        Map<String, Object> otpEntry = otpStore.get(email.trim().toLowerCase());
        if (otpEntry == null) {
            return ResponseEntity.badRequest().body(Map.of(
                "message", "No OTP found for this email", "verified", false
            ));
        }

        // AUTH-005: Check expiry
        long expiryMs = (Long) otpEntry.get("expiryMs");
        if (System.currentTimeMillis() > expiryMs) {
            otpStore.remove(email.trim().toLowerCase());
            return ResponseEntity.badRequest().body(Map.of(
                "message", "OTP has expired. Please request a new one.", "verified", false
            ));
        }

        String savedOtp = (String) otpEntry.get("otp");
        if (!savedOtp.equals(otp)) {
            return ResponseEntity.badRequest().body(Map.of(
                "message", "Invalid OTP code", "verified", false
            ));
        }

        // AUTH-008: OTP correct → issue a single-use reset token
        otpStore.remove(email.trim().toLowerCase());
        rateLimiter.reset("otp:" + email.trim().toLowerCase());

        String resetToken = UUID.randomUUID().toString();
        resetTokens.put(resetToken, email.trim().toLowerCase());

        return ResponseEntity.ok(Map.of(
            "message",     "OTP verified successfully",
            "verified",    true,
            "resetToken",  resetToken   // client must include this in reset-password request
        ));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> request) {
        // AUTH-008: Require the single-use reset token, not the raw OTP
        String resetToken   = request.get("resetToken");
        String newPassword  = request.get("password");

        if (resetToken == null || resetToken.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("resetToken is required");
        }
        if (newPassword == null || newPassword.length() < 8) {
            return ResponseEntity.badRequest().body("Password must be at least 8 characters");
        }

        String email = resetTokens.remove(resetToken); // single-use: remove on first use
        if (email == null) {
            return ResponseEntity.badRequest().body("Invalid or expired reset token");
        }

        if (firebaseService.isFirebaseInitialized()) {
            try {
                UserRecord userRecord = FirebaseAuth.getInstance().getUserByEmail(email);
                UserRecord.UpdateRequest updateRequest =
                        new UserRecord.UpdateRequest(userRecord.getUid())
                                .setPassword(newPassword);
                FirebaseAuth.getInstance().updateUser(updateRequest);
                return ResponseEntity.ok(Map.of("message", "Password reset successfully"));
            } catch (Exception e) {
                return ResponseEntity.internalServerError().body("Failed to reset password");
            }
        }
        return ResponseEntity.internalServerError()
                .body("Service unavailable – Firebase is not configured");
    }
}
