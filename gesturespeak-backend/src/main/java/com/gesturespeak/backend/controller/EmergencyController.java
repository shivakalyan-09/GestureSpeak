package com.gesturespeak.backend.controller;

import com.gesturespeak.backend.model.EmergencyContact;
import com.gesturespeak.backend.model.EmergencyLog;
import com.gesturespeak.backend.model.Activity;
import com.gesturespeak.backend.service.FirebaseService;
import com.gesturespeak.backend.service.RateLimiterService;
import com.gesturespeak.backend.service.TwilioService;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QuerySnapshot;
import com.google.cloud.firestore.DocumentSnapshot;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Emergency contacts and SOS controller.
 *
 * Security fixes applied:
 *  AUTHZ-001 – getAuthUserId() throws if principal is missing (no hardcoded fallback)
 *  AUTHZ-002 – send-sos ignores client-supplied userId; always uses session uid
 *  AUTHZ-004 – Delete contact validates ownership before deletion
 *  INP-002   – Phone number validated against E.164 format pattern
 *  BIZ-001   – SOS endpoint rate-limited to 1 per 60 seconds per user
 */
@RestController
@RequestMapping("/api/emergency")
public class EmergencyController {

    private final FirebaseService    firebaseService;
    private final TwilioService      twilioService;
    private final RateLimiterService rateLimiter;

    // In-memory fallback databases (used only when Firebase is configured but temporarily unavailable)
    private static final Map<String, List<EmergencyContact>> mockContacts = new ConcurrentHashMap<>();
    private static final Map<String, List<EmergencyLog>>     mockLogs     = new ConcurrentHashMap<>();

    // E.164 phone number pattern: + followed by 7-15 digits (INP-002)
    private static final Pattern E164_PATTERN = Pattern.compile("^\\+[1-9]\\d{6,14}$");

    public EmergencyController(FirebaseService firebaseService,
                               TwilioService twilioService,
                               RateLimiterService rateLimiter) {
        this.firebaseService = firebaseService;
        this.twilioService   = twilioService;
        this.rateLimiter     = rateLimiter;
    }

    // ── Utility: resolve authenticated user id ────────────────────────────────

    /**
     * AUTHZ-001: Always derive uid from the authenticated session.
     * Returns HTTP 401 (via thrown exception) if the principal is absent.
     */
    private String getAuthUserId() {
        try {
            Object principal = SecurityContextHolder.getContext()
                    .getAuthentication().getPrincipal();
            if (principal instanceof String uid && !uid.isBlank()) {
                return uid;
            }
        } catch (Exception ignored) {}
        throw new SecurityException("Unauthenticated request");
    }

    private void logActivity(String uid, String details) {
        Activity activity = new Activity(
            UUID.randomUUID().toString(), uid, "emergency_contact_update",
            System.currentTimeMillis(), details
        );
        if (firebaseService.isFirebaseInitialized()) {
            try {
                Firestore db = firebaseService.getDb();
                db.collection("activities").document(activity.getId()).set(activity);
            } catch (Exception e) {
                System.err.println("[EmergencyController] activity log failed: " + e.getMessage());
            }
        } else {
            AnalyticsController.mockActivities
                .computeIfAbsent(uid, k -> new CopyOnWriteArrayList<>())
                .add(activity);
        }
    }

    // ── Phone normalisation & validation ─────────────────────────────────────

    /**
     * INP-002: Normalise to E.164 and validate.
     * Returns null if the number cannot be normalised to a valid E.164 format.
     */
    private String normalizeAndValidatePhone(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String digits = raw.replaceAll("[^0-9+]", "");
        if (!digits.startsWith("+")) {
            if (digits.length() == 10) {
                digits = "+91" + digits;   // Default India prefix for 10-digit numbers
            } else {
                digits = "+" + digits;
            }
        }
        return E164_PATTERN.matcher(digits).matches() ? digits : null;
    }

    // ── Exception handler for auth failures ───────────────────────────────────

    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<?> handleSecurityException(SecurityException ex) {
        return ResponseEntity.status(401).body(Map.of("error", ex.getMessage()));
    }

    // ── Contacts CRUD ─────────────────────────────────────────────────────────

    @GetMapping("/contacts")
    public ResponseEntity<List<EmergencyContact>> getContacts() {
        String uid = getAuthUserId();
        if (firebaseService.isFirebaseInitialized()) {
            try {
                Firestore db = firebaseService.getDb();
                QuerySnapshot query = db.collection("users").document(uid)
                        .collection("emergencyContacts").get().get();
                List<EmergencyContact> items = query.getDocuments().stream().map(doc -> {
                    EmergencyContact contact = doc.toObject(EmergencyContact.class);
                    contact.setId(doc.getId());
                    return contact;
                }).collect(Collectors.toList());
                return ResponseEntity.ok(items);
            } catch (Exception e) {
                System.err.println("[EmergencyController] Firestore contacts fetch failed: " + e.getMessage());
            }
        }
        return ResponseEntity.ok(mockContacts.getOrDefault(uid, new ArrayList<>()));
    }

    @PostMapping("/contacts")
    public ResponseEntity<?> addContact(@RequestBody EmergencyContact contact) {
        String uid = getAuthUserId();

        // INP-002: Validate phone number
        String validatedPhone = normalizeAndValidatePhone(contact.getPhoneNumber());
        if (validatedPhone == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Invalid phone number format. Please use E.164 format (e.g., +919876543210)."));
        }
        contact.setPhoneNumber(validatedPhone);

        // Load current contacts for validation
        List<EmergencyContact> currentContacts = new ArrayList<>();
        if (firebaseService.isFirebaseInitialized()) {
            try {
                Firestore db = firebaseService.getDb();
                QuerySnapshot query = db.collection("users").document(uid)
                        .collection("emergencyContacts").get().get();
                currentContacts = query.getDocuments().stream()
                        .map(doc -> doc.toObject(EmergencyContact.class))
                        .collect(Collectors.toList());
            } catch (Exception e) {
                System.err.println("[EmergencyController] Failed to load existing contacts: " + e.getMessage());
            }
        } else {
            currentContacts = mockContacts.getOrDefault(uid, new ArrayList<>());
        }

        boolean isEdit = contact.getId() != null && !contact.getId().trim().isEmpty()
                && currentContacts.stream().anyMatch(c -> c.getId().equals(contact.getId()));

        if (!isEdit) {
            if (currentContacts.size() >= 5) {
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "Maximum limit of 5 emergency contacts reached."));
            }
            contact.setId(UUID.randomUUID().toString());
        }

        contact.setUserId(uid);
        contact.setCreatedAt(System.currentTimeMillis());
        if (contact.getIsPrimary() == null) contact.setIsPrimary(false);

        // Duplicate phone check
        for (EmergencyContact existing : currentContacts) {
            if (isEdit && existing.getId().equals(contact.getId())) continue;
            if (existing.getPhoneNumber().equals(validatedPhone)) {
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "A contact with this phone number already exists."));
            }
        }

        logActivity(uid, (isEdit ? "Updated" : "Added") + " emergency contact");

        if (firebaseService.isFirebaseInitialized()) {
            try {
                Firestore db = firebaseService.getDb();
                if (Boolean.TRUE.equals(contact.getIsPrimary())) {
                    clearPrimaryStatusInFirestore(db, uid);
                }
                db.collection("users").document(uid)
                        .collection("emergencyContacts")
                        .document(contact.getId()).set(contact).get();
                return ResponseEntity.ok(contact);
            } catch (Exception e) {
                System.err.println("[EmergencyController] Firestore contacts add failed: " + e.getMessage());
                return ResponseEntity.internalServerError()
                        .body(Map.of("message", "Database write failed"));
            }
        }

        List<EmergencyContact> list = mockContacts.computeIfAbsent(uid, k -> new CopyOnWriteArrayList<>());
        if (Boolean.TRUE.equals(contact.getIsPrimary())) {
            list.forEach(c -> c.setIsPrimary(false));
        }
        list.add(contact);
        return ResponseEntity.ok(contact);
    }

    @DeleteMapping("/contacts/{id}")
    public ResponseEntity<?> deleteContact(@PathVariable String id) {
        String uid = getAuthUserId();
        logActivity(uid, "Deleted emergency contact");

        if (firebaseService.isFirebaseInitialized()) {
            try {
                Firestore db = firebaseService.getDb();
                // AUTHZ-004: Verify the contact belongs to this user before deleting
                DocumentSnapshot doc = db.collection("users").document(uid)
                        .collection("emergencyContacts").document(id).get().get();
                if (!doc.exists()) {
                    return ResponseEntity.status(403)
                            .body(Map.of("message", "Contact not found or access denied"));
                }
                db.collection("users").document(uid)
                        .collection("emergencyContacts").document(id).delete().get();
                return ResponseEntity.ok(Map.of("message", "Contact deleted"));
            } catch (Exception e) {
                System.err.println("[EmergencyController] Firestore contacts delete failed: " + e.getMessage());
            }
        }

        List<EmergencyContact> list = mockContacts.get(uid);
        if (list != null) {
            boolean removed = list.removeIf(c -> c.getId().equals(id));
            if (!removed) {
                return ResponseEntity.status(403)
                        .body(Map.of("message", "Contact not found or access denied"));
            }
        }
        return ResponseEntity.ok(Map.of("message", "Contact deleted"));
    }

    @PutMapping("/contacts/primary/{id}")
    public ResponseEntity<?> setPrimaryContact(@PathVariable String id) {
        String uid = getAuthUserId();
        logActivity(uid, "Updated primary emergency contact");

        if (firebaseService.isFirebaseInitialized()) {
            try {
                Firestore db = firebaseService.getDb();
                // Verify ownership
                DocumentSnapshot doc = db.collection("users").document(uid)
                        .collection("emergencyContacts").document(id).get().get();
                if (!doc.exists()) {
                    return ResponseEntity.status(403)
                            .body(Map.of("message", "Contact not found or access denied"));
                }
                clearPrimaryStatusInFirestore(db, uid);
                db.collection("users").document(uid)
                        .collection("emergencyContacts").document(id)
                        .update("isPrimary", true).get();
                return ResponseEntity.ok(Map.of("message", "Primary contact updated"));
            } catch (Exception e) {
                System.err.println("[EmergencyController] Firestore set primary failed: " + e.getMessage());
            }
        }

        List<EmergencyContact> list = mockContacts.get(uid);
        if (list != null) {
            list.forEach(c -> c.setIsPrimary(c.getId().equals(id)));
        }
        return ResponseEntity.ok(Map.of("message", "Primary contact updated"));
    }

    // ── SOS ───────────────────────────────────────────────────────────────────

    @PostMapping("/send-sos")
    public ResponseEntity<?> sendSos(@RequestBody Map<String, String> request) {
        // AUTHZ-002: uid ALWAYS from the authenticated session – ignore client-supplied userId
        String uid       = getAuthUserId();
        String latitude  = request.getOrDefault("latitude",  "0.0");
        String longitude = request.getOrDefault("longitude", "0.0");
        String mapsUrl   = request.getOrDefault("mapsUrl",
                "https://maps.google.com/?q=" + latitude + "," + longitude);

        // BIZ-001: Rate-limit SOS to 1 per 60 seconds per user
        if (!rateLimiter.isSosAllowed(uid)) {
            return ResponseEntity.status(429).body(Map.of(
                "message", "SOS already sent recently. Please wait 60 seconds before sending another alert."
            ));
        }

        // Fetch contacts
        List<EmergencyContact> contactsList = new ArrayList<>();
        if (firebaseService.isFirebaseInitialized()) {
            try {
                Firestore db = firebaseService.getDb();
                QuerySnapshot query = db.collection("users").document(uid)
                        .collection("emergencyContacts").get().get();
                contactsList = query.getDocuments().stream()
                        .map(doc -> doc.toObject(EmergencyContact.class))
                        .collect(Collectors.toList());
            } catch (Exception e) {
                System.err.println("[EmergencyController] Failed to load contacts for SOS: " + e.getMessage());
                contactsList = mockContacts.getOrDefault(uid, new ArrayList<>());
            }
        } else {
            contactsList = mockContacts.getOrDefault(uid, new ArrayList<>());
        }

        if (contactsList.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                "message", "No emergency contacts configured. Please configure contacts first."
            ));
        }

        String emergencyMessage =
                "EMERGENCY ALERT\n\nI need immediate assistance.\n\nMy current location:\n"
                + mapsUrl + "\n\nSent from GestureSpeak Emergency System.";

        int successCount = 0;
        for (EmergencyContact contact : contactsList) {
            // INP-002: Normalise and validate phone before sending
            String phone = normalizeAndValidatePhone(contact.getPhoneNumber());
            if (phone == null) {
                System.err.println("[EmergencyController] Skipping contact with invalid phone number");
                continue;
            }
            if (twilioService.sendSms(phone, emergencyMessage)) {
                successCount++;
            }
        }

        String status  = successCount > 0 ? "SENT" : "FAILED";
        // SDE-004: Do not log the full message body
        String details = "SOS Alert dispatched to " + successCount + " of "
                + contactsList.size() + " contacts";

        EmergencyLog log = new EmergencyLog();
        log.setId(UUID.randomUUID().toString());
        log.setUserId(uid);
        log.setType("SOS");
        log.setDetails(details);
        log.setLocationLink(mapsUrl);
        log.setTimestamp(System.currentTimeMillis());
        log.setLatitude(latitude);
        log.setLongitude(longitude);
        log.setMapsUrl(mapsUrl);
        log.setContactsNotified(successCount);
        log.setStatus(status);
        logActivity(uid, "Triggered SOS Emergency Alert");

        if (firebaseService.isFirebaseInitialized()) {
            try {
                Firestore db = firebaseService.getDb();
                db.collection("emergencyLogs").document(log.getId()).set(log).get();
            } catch (Exception e) {
                System.err.println("[EmergencyController] Firestore emergency log save failed: " + e.getMessage());
            }
        } else {
            mockLogs.computeIfAbsent(uid, k -> new CopyOnWriteArrayList<>()).add(log);
        }

        return ResponseEntity.ok(log);
    }

    /** Legacy /sos alias – delegates to send-sos */
    @PostMapping("/sos")
    public ResponseEntity<?> triggerSOS(@RequestBody Map<String, String> body) {
        Map<String, String> mappedRequest = new HashMap<>();
        // AUTHZ-002: Do NOT pass userId from body; let sendSos derive it from session
        String locationLink = body.getOrDefault("locationLink", "https://maps.google.com/?q=0,0");
        mappedRequest.put("mapsUrl", locationLink);
        try {
            if (locationLink.contains("?q=")) {
                String coords = locationLink.split("\\?q=")[1];
                String[] parts = coords.split(",");
                mappedRequest.put("latitude",  parts[0]);
                mappedRequest.put("longitude", parts[1]);
            }
        } catch (Exception ignored) {}
        return sendSos(mappedRequest);
    }

    @GetMapping("/logs")
    public ResponseEntity<List<EmergencyLog>> getLogs() {
        String uid = getAuthUserId();
        if (firebaseService.isFirebaseInitialized()) {
            try {
                Firestore db = firebaseService.getDb();
                QuerySnapshot query = db.collection("emergencyLogs")
                        .whereEqualTo("userId", uid).get().get();
                List<EmergencyLog> items = query.getDocuments().stream().map(doc -> {
                    EmergencyLog log = doc.toObject(EmergencyLog.class);
                    log.setId(doc.getId());
                    return log;
                }).collect(Collectors.toList());
                items.sort((a, b) -> b.getTimestamp().compareTo(a.getTimestamp()));
                return ResponseEntity.ok(items);
            } catch (Exception e) {
                System.err.println("[EmergencyController] Firestore logs fetch failed: " + e.getMessage());
            }
        }
        List<EmergencyLog> list = mockLogs.getOrDefault(uid, new ArrayList<>());
        list.sort((a, b) -> b.getTimestamp().compareTo(a.getTimestamp()));
        return ResponseEntity.ok(list);
    }

    @DeleteMapping("/logs")
    public ResponseEntity<?> clearLogs() {
        String uid = getAuthUserId();
        if (firebaseService.isFirebaseInitialized()) {
            try {
                Firestore db = firebaseService.getDb();
                QuerySnapshot query = db.collection("emergencyLogs")
                        .whereEqualTo("userId", uid).get().get();
                com.google.cloud.firestore.WriteBatch batch = db.batch();
                for (com.google.cloud.firestore.DocumentSnapshot doc : query.getDocuments()) {
                    batch.delete(doc.getReference());
                }
                batch.commit().get();
                return ResponseEntity.ok(Map.of("message", "Emergency logs cleared"));
            } catch (Exception e) {
                System.err.println("[EmergencyController] Firestore logs clear failed: " + e.getMessage());
            }
        }
        mockLogs.remove(uid);
        return ResponseEntity.ok(Map.of("message", "Emergency logs cleared"));
    }

    private void clearPrimaryStatusInFirestore(Firestore db, String uid) throws Exception {
        QuerySnapshot query = db.collection("users").document(uid)
                .collection("emergencyContacts")
                .whereEqualTo("isPrimary", true).get().get();
        for (com.google.cloud.firestore.QueryDocumentSnapshot doc : query.getDocuments()) {
            doc.getReference().update("isPrimary", false).get();
        }
    }
}
