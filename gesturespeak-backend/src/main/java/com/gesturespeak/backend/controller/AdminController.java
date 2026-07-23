package com.gesturespeak.backend.controller;

import com.gesturespeak.backend.service.FirebaseService;
import com.google.cloud.firestore.Firestore;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.*;

/**
 * Admin analytics controller.
 *
 * Security fixes applied:
 *  BIZ-002 – Removed hardcoded fake statistics.
 *            All figures now come from real Firestore counts.
 *            When Firestore is unavailable, returns zero values rather than
 *            misleading hardcoded numbers.
 */
@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final FirebaseService firebaseService;

    public AdminController(FirebaseService firebaseService) {
        this.firebaseService = firebaseService;
    }

    @GetMapping("/analytics")
    public ResponseEntity<?> getDashboardAnalytics() {
        long totalUsers        = 0;
        long totalPredictions  = 0;
        long emergencyAlerts   = 0;

        if (firebaseService.isFirebaseInitialized()) {
            try {
                Firestore db = firebaseService.getDb();

                // Real Firestore counts
                totalUsers       = db.collection("users").get().get().size();
                totalPredictions = db.collection("translations").get().get().size();
                emergencyAlerts  = db.collection("emergencyLogs").get().get().size();

            } catch (Exception e) {
                System.err.println("[AdminController] Firestore analytics aggregation failed: " + e.getMessage());
            }
        } else {
            return ResponseEntity.status(503).body(
                Map.of("error", "Analytics unavailable – Firebase is not configured")
            );
        }

        Map<String, Object> analytics = new HashMap<>();
        analytics.put("totalUsers",       totalUsers);
        analytics.put("totalPredictions", totalPredictions);
        analytics.put("emergencyAlerts",  emergencyAlerts);
        // accuracyRate removed – this was a fabricated value; real accuracy requires an ML model

        return ResponseEntity.ok(analytics);
    }
}
