package com.gesturespeak.backend.controller;

import com.gesturespeak.backend.model.Activity;
import com.gesturespeak.backend.service.FirebaseService;
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
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final FirebaseService firebaseService;
    
    // In-memory mock databases for development fallback
    private static final Map<String, String> mockOtps = new ConcurrentHashMap<>();
    private static final Map<String, Map<String, Object>> mockUsers = new ConcurrentHashMap<>();

    public AuthController(FirebaseService firebaseService) {
        this.firebaseService = firebaseService;
        
        // Setup a mock admin user profile
        Map<String, Object> adminProfile = new HashMap<>();
        adminProfile.put("uid", "mock-admin-uid");
        adminProfile.put("email", "admin@gesturespeak.com");
        adminProfile.put("username", "System Administrator");
        adminProfile.put("role", "ADMIN");
        mockUsers.put("mock-admin-uid", adminProfile);

        Map<String, Object> userProfile = new HashMap<>();
        userProfile.put("uid", "mock-user-uid");
        userProfile.put("email", "user@gesturespeak.com");
        userProfile.put("username", "Gesture User");
        userProfile.put("role", "USER");
        mockUsers.put("mock-user-uid", userProfile);
    }

    private void logActivity(String uid, String details) {
        Activity activity = new Activity(
            java.util.UUID.randomUUID().toString(),
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
                System.err.println("Firestore profile activity save failed: " + e.getMessage());
            }
        } else {
            AnalyticsController.mockActivities.computeIfAbsent(uid, k -> new CopyOnWriteArrayList<>()).add(activity);
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody Map<String, String> request) {
        String uid = request.get("uid");
        String email = request.get("email");
        String username = request.get("username");

        if (uid == null || email == null) {
            return ResponseEntity.badRequest().body("uid and email are required");
        }

        Map<String, Object> profile = new HashMap<>();
        profile.put("uid", uid);
        profile.put("email", email);
        profile.put("username", username != null ? username : email.split("@")[0]);
        profile.put("role", "USER");
        profile.put("createdAt", System.currentTimeMillis());

        if (firebaseService.isFirebaseInitialized()) {
            try {
                Firestore db = firebaseService.getDb();
                ApiFuture<WriteResult> future = db.collection("users").document(uid).set(profile);
                future.get();
                return ResponseEntity.ok(profile);
            } catch (Exception e) {
                return ResponseEntity.internalServerError().body("Failed to save profile: " + e.getMessage());
            }
        } else {
            mockUsers.put(uid, profile);
            return ResponseEntity.ok(profile);
        }
    }

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile() {
        String uid = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();

        if (firebaseService.isFirebaseInitialized()) {
            try {
                Firestore db = firebaseService.getDb();
                DocumentReference docRef = db.collection("users").document(uid);
                ApiFuture<DocumentSnapshot> future = docRef.get();
                DocumentSnapshot document = future.get();
                if (document.exists()) {
                    return ResponseEntity.ok(document.getData());
                } else {
                    // Fallback to fetch from FirebaseAuth details
                    UserRecord userRecord = FirebaseAuth.getInstance().getUser(uid);
                    Map<String, Object> fallbackProfile = new HashMap<>();
                    fallbackProfile.put("uid", uid);
                    fallbackProfile.put("email", userRecord.getEmail());
                    fallbackProfile.put("username", userRecord.getDisplayName() != null ? userRecord.getDisplayName() : userRecord.getEmail().split("@")[0]);
                    fallbackProfile.put("role", "USER");
                    return ResponseEntity.ok(fallbackProfile);
                }
            } catch (Exception e) {
                return ResponseEntity.internalServerError().body("Error retrieving profile: " + e.getMessage());
            }
        } else {
            Map<String, Object> profile = mockUsers.get(uid);
            if (profile != null) {
                return ResponseEntity.ok(profile);
            }
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@RequestBody Map<String, String> request) {
        String uid = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        String username = request.get("username");
        logActivity(uid, "Updated username to: " + username);

        if (firebaseService.isFirebaseInitialized()) {
            try {
                Firestore db = firebaseService.getDb();
                db.collection("users").document(uid).update("username", username).get();
                
                try {
                    UserRecord.UpdateRequest authUpdate = new UserRecord.UpdateRequest(uid)
                            .setDisplayName(username);
                    FirebaseAuth.getInstance().updateUser(authUpdate);
                } catch (Exception ignored) {}

                return ResponseEntity.ok(Map.of("message", "Profile updated successfully"));
            } catch (Exception e) {
                return ResponseEntity.internalServerError().body("Update failed: " + e.getMessage());
            }
        } else {
            Map<String, Object> profile = mockUsers.get(uid);
            if (profile != null) {
                profile.put("username", username);
                mockUsers.put(uid, profile);
                return ResponseEntity.ok(Map.of("message", "Profile updated successfully"));
            }
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestParam String email) {
        // Generate a 6-digit OTP
        String otp = String.format("%06d", new Random().nextInt(999999));
        mockOtps.put(email, otp);

        System.out.println("=================================================");
        System.out.println("PASSWORD RESET OTP GENERATED FOR: " + email);
        System.out.println("OTP CODE: " + otp);
        System.out.println("=================================================");

        // In a real app, this would call EmailSenderService.sendOtpEmail(email, otp)
        return ResponseEntity.ok(Map.of(
            "message", "OTP sent to your email. For local development, check console output.",
            "email", email
        ));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestParam String email, @RequestParam String otp) {
        String savedOtp = mockOtps.get(email);
        if (savedOtp != null && savedOtp.equals(otp)) {
            return ResponseEntity.ok(Map.of("message", "OTP verified successfully", "verified", true));
        }
        return ResponseEntity.badRequest().body(Map.of("message", "Invalid OTP code", "verified", false));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String otp = request.get("otp");
        String newPassword = request.get("password");

        String savedOtp = mockOtps.get(email);
        if (savedOtp == null || !savedOtp.equals(otp)) {
            return ResponseEntity.badRequest().body("Invalid or expired OTP");
        }

        mockOtps.remove(email);

        if (firebaseService.isFirebaseInitialized()) {
            try {
                UserRecord userRecord = FirebaseAuth.getInstance().getUserByEmail(email);
                UserRecord.UpdateRequest updateRequest = new UserRecord.UpdateRequest(userRecord.getUid())
                        .setPassword(newPassword);
                FirebaseAuth.getInstance().updateUser(updateRequest);
                return ResponseEntity.ok(Map.of("message", "Password reset successfully"));
            } catch (Exception e) {
                return ResponseEntity.internalServerError().body("Failed to reset password: " + e.getMessage());
            }
        } else {
            System.out.println("Local reset simulated for user: " + email);
            return ResponseEntity.ok(Map.of("message", "Password reset successfully (Simulated)"));
        }
    }
}
