package com.gesturespeak.backend.controller;

import com.gesturespeak.backend.model.EmergencyContact;
import com.gesturespeak.backend.model.EmergencyLog;
import com.gesturespeak.backend.model.Activity;
import com.gesturespeak.backend.service.FirebaseService;
import com.gesturespeak.backend.service.TwilioService;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QuerySnapshot;
import com.google.cloud.firestore.DocumentReference;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/emergency")
public class EmergencyController {

    private final FirebaseService firebaseService;
    private final TwilioService twilioService;

    // In-memory fallback databases
    private static final Map<String, List<EmergencyContact>> mockContacts = new ConcurrentHashMap<>();
    private static final Map<String, List<EmergencyLog>> mockLogs = new ConcurrentHashMap<>();

    public EmergencyController(FirebaseService firebaseService, TwilioService twilioService) {
        this.firebaseService = firebaseService;
        this.twilioService = twilioService;
    }

    private void logActivity(String uid, String details) {
        Activity activity = new Activity(
            UUID.randomUUID().toString(),
            uid,
            "emergency_contact_update",
            System.currentTimeMillis(),
            details
        );
        if (firebaseService.isFirebaseInitialized()) {
            try {
                Firestore db = firebaseService.getDb();
                db.collection("activities").document(activity.getId()).set(activity);
            } catch (Exception e) {
                System.err.println("Firestore emergency activity save failed: " + e.getMessage());
            }
        } else {
            AnalyticsController.mockActivities.computeIfAbsent(uid, k -> new CopyOnWriteArrayList<>()).add(activity);
        }
    }

    private String getAuthUserId() {
        try {
            Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            if (principal instanceof String) {
                return (String) principal;
            }
        } catch (Exception ignored) {}
        return "mock-user-uid";
    }

    @GetMapping("/contacts")
    public ResponseEntity<List<EmergencyContact>> getContacts() {
        String uid = getAuthUserId();
        if (firebaseService.isFirebaseInitialized()) {
            try {
                Firestore db = firebaseService.getDb();
                QuerySnapshot query = db.collection("users").document(uid).collection("emergencyContacts").get().get();
                List<EmergencyContact> items = query.getDocuments().stream().map(doc -> {
                    EmergencyContact contact = doc.toObject(EmergencyContact.class);
                    contact.setId(doc.getId());
                    return contact;
                }).collect(Collectors.toList());
                return ResponseEntity.ok(items);
            } catch (Exception e) {
                System.err.println("Firestore emergency contacts fetch failed: " + e.getMessage());
            }
        }

        return ResponseEntity.ok(mockContacts.getOrDefault(uid, new ArrayList<>()));
    }

    @PostMapping("/contacts")
    public ResponseEntity<?> addContact(@RequestBody EmergencyContact contact) {
        String uid = getAuthUserId();
        
        // Fetch current contacts for validation
        List<EmergencyContact> currentContacts = new ArrayList<>();
        if (firebaseService.isFirebaseInitialized()) {
            try {
                Firestore db = firebaseService.getDb();
                QuerySnapshot query = db.collection("users").document(uid).collection("emergencyContacts").get().get();
                currentContacts = query.getDocuments().stream().map(doc -> doc.toObject(EmergencyContact.class)).collect(Collectors.toList());
            } catch (Exception e) {
                System.err.println("Failed to load existing contacts: " + e.getMessage());
            }
        } else {
            currentContacts = mockContacts.getOrDefault(uid, new ArrayList<>());
        }

        boolean isEdit = contact.getId() != null && !contact.getId().trim().isEmpty() &&
                         currentContacts.stream().anyMatch(c -> c.getId().equals(contact.getId()));

        if (!isEdit) {
            // 1. Max 5 contacts validation
            if (currentContacts.size() >= 5) {
                return ResponseEntity.badRequest().body(Map.of("message", "Maximum limit of 5 emergency contacts reached."));
            }
            contact.setId(UUID.randomUUID().toString());
        }

        contact.setUserId(uid);
        contact.setCreatedAt(System.currentTimeMillis());
        if (contact.getIsPrimary() == null) {
            contact.setIsPrimary(false);
        }

        // 2. Duplicate phone numbers validation
        String formattedNewPhone = contact.getPhoneNumber().replaceAll("[^0-9+]", "");
        for (EmergencyContact existing : currentContacts) {
            if (isEdit && existing.getId().equals(contact.getId())) {
                continue;
            }
            String existingPhone = existing.getPhoneNumber().replaceAll("[^0-9+]", "");
            if (existingPhone.equals(formattedNewPhone)) {
                return ResponseEntity.badRequest().body(Map.of("message", "A contact with this phone number already exists."));
            }
        }

        // Save Contact
        logActivity(uid, (isEdit ? "Updated" : "Added") + " emergency contact: " + contact.getName());
        if (firebaseService.isFirebaseInitialized()) {
            try {
                Firestore db = firebaseService.getDb();
                if (Boolean.TRUE.equals(contact.getIsPrimary())) {
                    clearPrimaryStatusInFirestore(db, uid);
                }
                db.collection("users").document(uid).collection("emergencyContacts").document(contact.getId()).set(contact).get();
                return ResponseEntity.ok(contact);
            } catch (Exception e) {
                System.err.println("Firestore contacts add failed: " + e.getMessage());
                return ResponseEntity.internalServerError().body(Map.of("message", "Database write failed: " + e.getMessage()));
            }
        }

        List<EmergencyContact> list = mockContacts.computeIfAbsent(uid, k -> new CopyOnWriteArrayList<>());
        if (Boolean.TRUE.equals(contact.getIsPrimary())) {
            for (EmergencyContact c : list) {
                c.setIsPrimary(false);
            }
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
                db.collection("users").document(uid).collection("emergencyContacts").document(id).delete().get();
                return ResponseEntity.ok(Map.of("message", "Contact deleted"));
            } catch (Exception e) {
                System.err.println("Firestore contacts delete failed: " + e.getMessage());
            }
        }

        List<EmergencyContact> list = mockContacts.get(uid);
        if (list != null) {
            list.removeIf(c -> c.getId().equals(id));
        }
        return ResponseEntity.ok(Map.of("message", "Contact deleted (Mock)"));
    }

    @PutMapping("/contacts/primary/{id}")
    public ResponseEntity<?> setPrimaryContact(@PathVariable String id) {
        String uid = getAuthUserId();
        logActivity(uid, "Updated primary emergency contact");
        if (firebaseService.isFirebaseInitialized()) {
            try {
                Firestore db = firebaseService.getDb();
                clearPrimaryStatusInFirestore(db, uid);
                db.collection("users").document(uid).collection("emergencyContacts").document(id).update("isPrimary", true).get();
                return ResponseEntity.ok(Map.of("message", "Primary contact updated"));
            } catch (Exception e) {
                System.err.println("Firestore set primary failed: " + e.getMessage());
            }
        }

        List<EmergencyContact> list = mockContacts.get(uid);
        if (list != null) {
            for (EmergencyContact c : list) {
                c.setIsPrimary(c.getId().equals(id));
            }
        }
        return ResponseEntity.ok(Map.of("message", "Primary contact updated (Mock)"));
    }

    @PostMapping("/send-sos")
    public ResponseEntity<?> sendSos(@RequestBody Map<String, String> request) {
        String reqUserId = request.get("userId");
        String uid = (reqUserId != null && !reqUserId.trim().isEmpty()) ? reqUserId : getAuthUserId();
        String latitude = request.getOrDefault("latitude", "0.0");
        String longitude = request.getOrDefault("longitude", "0.0");
        String mapsUrl = request.getOrDefault("mapsUrl", "https://maps.google.com/?q=" + latitude + "," + longitude);

        // Fetch Emergency Contacts
        List<EmergencyContact> contactsList = new ArrayList<>();
        if (firebaseService.isFirebaseInitialized()) {
            try {
                Firestore db = firebaseService.getDb();
                QuerySnapshot query = db.collection("users").document(uid).collection("emergencyContacts").get().get();
                contactsList = query.getDocuments().stream().map(doc -> doc.toObject(EmergencyContact.class)).collect(Collectors.toList());
            } catch (Exception e) {
                System.err.println("Failed to load contacts for SOS: " + e.getMessage());
                contactsList = mockContacts.getOrDefault(uid, new ArrayList<>());
            }
        } else {
            contactsList = mockContacts.getOrDefault(uid, new ArrayList<>());
        }

        if (contactsList.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "No emergency contacts configured. Please configure contacts first."));
        }

        // Generate SOS Message
        String emergencyMessage = "EMERGENCY ALERT\n\nI need immediate assistance.\n\nMy current location:\n" + mapsUrl + "\n\nSent from GestureSpeak Emergency System.";

        // Dispatch messages
        int successCount = 0;
        for (EmergencyContact contact : contactsList) {
            String phone = contact.getPhoneNumber().trim();
            // Twilio requires E.164 format (starting with '+'). If missing, normalize it.
            if (!phone.startsWith("+")) {
                if (phone.length() == 10) {
                    phone = "+91" + phone; // Default to India (+91) for 10-digit numbers
                } else {
                    phone = "+" + phone;
                }
            }
            boolean success = twilioService.sendSms(phone, emergencyMessage);
            if (success) {
                successCount++;
            }
        }

        String status = successCount > 0 ? "SENT" : "FAILED";
        String details = "SOS Alert sent to " + successCount + " of " + contactsList.size() + " contacts. Message details: " + emergencyMessage;

        // Build log
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

        // Save Log to Firestore (Root collection emergencyLogs)
        if (firebaseService.isFirebaseInitialized()) {
            try {
                Firestore db = firebaseService.getDb();
                db.collection("emergencyLogs").document(log.getId()).set(log).get();
            } catch (Exception e) {
                System.err.println("Firestore emergency log save failed: " + e.getMessage());
            }
        } else {
            mockLogs.computeIfAbsent(uid, k -> new CopyOnWriteArrayList<>()).add(log);
        }

        return ResponseEntity.ok(log);
    }

    // Keep legacy fallback mapping for compatibility if frontend sends directly to /sos
    @PostMapping("/sos")
    public ResponseEntity<?> triggerSOS(@RequestBody Map<String, String> body) {
        Map<String, String> mappedRequest = new HashMap<>();
        mappedRequest.put("userId", getAuthUserId());
        String locationLink = body.getOrDefault("locationLink", "https://maps.google.com/?q=0,0");
        mappedRequest.put("mapsUrl", locationLink);
        
        // Extract coordinate guesses from maps link
        try {
            if (locationLink.contains("?q=")) {
                String coords = locationLink.split("\\?q=")[1];
                String[] parts = coords.split(",");
                mappedRequest.put("latitude", parts[0]);
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
                        .whereEqualTo("userId", uid)
                        .get().get();
                List<EmergencyLog> items = query.getDocuments().stream().map(doc -> {
                    EmergencyLog log = doc.toObject(EmergencyLog.class);
                    log.setId(doc.getId());
                    return log;
                }).collect(Collectors.toList());
                items.sort((a, b) -> b.getTimestamp().compareTo(a.getTimestamp()));
                return ResponseEntity.ok(items);
            } catch (Exception e) {
                System.err.println("Firestore root emergency logs fetch failed: " + e.getMessage());
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
                        .whereEqualTo("userId", uid)
                        .get().get();
                com.google.cloud.firestore.WriteBatch batch = db.batch();
                for (com.google.cloud.firestore.DocumentSnapshot doc : query.getDocuments()) {
                    batch.delete(doc.getReference());
                }
                batch.commit().get();
                return ResponseEntity.ok(Map.of("message", "Emergency logs cleared"));
            } catch (Exception e) {
                System.err.println("Firestore root emergency logs clear failed: " + e.getMessage());
            }
        }

        mockLogs.remove(uid);
        return ResponseEntity.ok(Map.of("message", "Emergency logs cleared (Mock)"));
    }

    private void clearPrimaryStatusInFirestore(Firestore db, String uid) throws Exception {
        QuerySnapshot query = db.collection("users").document(uid).collection("emergencyContacts")
                .whereEqualTo("isPrimary", true).get().get();
        for (com.google.cloud.firestore.QueryDocumentSnapshot doc : query.getDocuments()) {
            doc.getReference().update("isPrimary", false).get();
        }
    }
}
