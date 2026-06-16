package com.gesturespeak.backend.controller;

import com.gesturespeak.backend.model.HistoryEntry;
import com.gesturespeak.backend.service.FirebaseService;
import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.*;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/history")
public class HistoryController {

    private final FirebaseService firebaseService;

    // In-memory mock database
    private static final Map<String, List<HistoryEntry>> mockHistory = new ConcurrentHashMap<>();

    public HistoryController(FirebaseService firebaseService) {
        this.firebaseService = firebaseService;
    }

    private String getAuthUserId() {
        return (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    @GetMapping
    public ResponseEntity<List<HistoryEntry>> getHistory() {
        String uid = getAuthUserId();
        if (firebaseService.isFirebaseInitialized()) {
            try {
                Firestore db = firebaseService.getDb();
                CollectionReference historyRef = db.collection("users").document(uid).collection("history");
                ApiFuture<QuerySnapshot> querySnapshot = historyRef.orderBy("timestamp", Query.Direction.DESCENDING).get();
                
                List<HistoryEntry> items = querySnapshot.get().getDocuments().stream().map(doc -> {
                    HistoryEntry entry = doc.toObject(HistoryEntry.class);
                    entry.setId(doc.getId());
                    return entry;
                }).collect(Collectors.toList());
                return ResponseEntity.ok(items);
            } catch (Exception e) {
                System.err.println("Firestore history retrieval failed, falling back to mock: " + e.getMessage());
            }
        }
        
        List<HistoryEntry> list = mockHistory.getOrDefault(uid, new ArrayList<>());
        // Sort in memory by timestamp descending
        list.sort((a, b) -> b.getTimestamp().compareTo(a.getTimestamp()));
        return ResponseEntity.ok(list);
    }

    @PostMapping
    public ResponseEntity<?> saveHistory(@RequestBody Map<String, Object> body) {
        String uid = getAuthUserId();
        
        HistoryEntry entry = new HistoryEntry();
        entry.setId(UUID.randomUUID().toString());
        entry.setUserId(uid);
        entry.setOriginal((String) body.getOrDefault("original", ""));
        entry.setTranslated((String) body.getOrDefault("translated", ""));
        entry.setType((String) body.getOrDefault("type", ""));
        entry.setMode((String) body.getOrDefault("mode", ""));
        
        Object confidenceObj = body.get("confidence");
        if (confidenceObj instanceof Number) {
            entry.setConfidence(((Number) confidenceObj).floatValue());
        } else {
            entry.setConfidence(1.0f);
        }

        long timestamp = System.currentTimeMillis();
        entry.setTimestamp(timestamp);
        
        String timeFormatted = new SimpleDateFormat("hh:mm a", Locale.getDefault()).format(new Date(timestamp));
        entry.setTimeFormatted(timeFormatted);

        // Audit Logging to Backend Logs
        System.out.println("================= BACKEND TRANSLATION HISTORY LOG ================= ");
        System.out.println("User ID: " + uid);
        System.out.println("Original Text: " + entry.getOriginal());
        System.out.println("Translated Text: " + entry.getTranslated());
        System.out.println("Type: " + entry.getType());
        System.out.println("Mode: " + entry.getMode());
        System.out.println("Confidence: " + entry.getConfidence());
        System.out.println("Timestamp: " + entry.getTimestamp());
        System.out.println("===================================================================");

        if (firebaseService.isFirebaseInitialized()) {
            try {
                Firestore db = firebaseService.getDb();
                DocumentReference docRef = db.collection("users").document(uid).collection("history").document(entry.getId());
                docRef.set(entry).get();
                return ResponseEntity.ok(entry);
            } catch (Exception e) {
                System.err.println("Firestore history save failed, using mock: " + e.getMessage());
            }
        }

        mockHistory.computeIfAbsent(uid, k -> new CopyOnWriteArrayList<>()).add(entry);
        return ResponseEntity.ok(entry);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteHistoryItem(@PathVariable String id) {
        String uid = getAuthUserId();
        if (firebaseService.isFirebaseInitialized()) {
            try {
                Firestore db = firebaseService.getDb();
                db.collection("users").document(uid).collection("history").document(id).delete().get();
                return ResponseEntity.ok(Map.of("message", "History item deleted"));
            } catch (Exception e) {
                System.err.println("Firestore history deletion failed, using mock: " + e.getMessage());
            }
        }

        List<HistoryEntry> list = mockHistory.get(uid);
        if (list != null) {
            list.removeIf(item -> item.getId().equals(id));
        }
        return ResponseEntity.ok(Map.of("message", "History item deleted (Mock)"));
    }

    @DeleteMapping
    public ResponseEntity<?> clearHistory() {
        String uid = getAuthUserId();
        if (firebaseService.isFirebaseInitialized()) {
            try {
                Firestore db = firebaseService.getDb();
                CollectionReference historyRef = db.collection("users").document(uid).collection("history");
                // Firestore doesn't support deleting a whole collection in one API call on client/server without paging
                ApiFuture<QuerySnapshot> future = historyRef.get();
                List<QueryDocumentSnapshot> documents = future.get().getDocuments();
                WriteBatch batch = db.batch();
                for (DocumentSnapshot doc : documents) {
                    batch.delete(doc.getReference());
                }
                batch.commit().get();
                return ResponseEntity.ok(Map.of("message", "History cleared"));
            } catch (Exception e) {
                System.err.println("Firestore history clear failed, using mock: " + e.getMessage());
            }
        }

        mockHistory.remove(uid);
        return ResponseEntity.ok(Map.of("message", "History cleared (Mock)"));
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportHistory() {
        String uid = getAuthUserId();
        List<HistoryEntry> list;
        
        if (firebaseService.isFirebaseInitialized()) {
            try {
                Firestore db = firebaseService.getDb();
                list = db.collection("users").document(uid).collection("history")
                        .orderBy("timestamp", Query.Direction.DESCENDING)
                        .get().get().getDocuments().stream().map(doc -> {
                            HistoryEntry entry = doc.toObject(HistoryEntry.class);
                            entry.setId(doc.getId());
                            return entry;
                        }).collect(Collectors.toList());
            } catch (Exception e) {
                list = mockHistory.getOrDefault(uid, new ArrayList<>());
            }
        } else {
            list = mockHistory.getOrDefault(uid, new ArrayList<>());
        }

        // Generate CSV string
        StringBuilder csv = new StringBuilder();
        csv.append("ID,Original,Translated,Type,Mode,Confidence,Timestamp,TimeFormatted\n");
        for (HistoryEntry entry : list) {
            csv.append(String.format("\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",%.2f,%d,\"%s\"\n",
                    entry.getId(),
                    entry.getOriginal().replace("\"", "\"\""),
                    entry.getTranslated().replace("\"", "\"\""),
                    entry.getType(),
                    entry.getMode(),
                    entry.getConfidence(),
                    entry.getTimestamp(),
                    entry.getTimeFormatted()
            ));
        }

        byte[] data = csv.toString().getBytes(StandardCharsets.UTF_8);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
        headers.setContentDispositionFormData("attachment", "history_export.csv");
        headers.setContentLength(data.length);

        return ResponseEntity.ok().headers(headers).body(data);
    }
}
