package com.gesturespeak.backend.controller;

import com.gesturespeak.backend.model.LearningItem;
import com.gesturespeak.backend.model.LearningSession;
import com.gesturespeak.backend.model.Activity;
import com.gesturespeak.backend.service.FirebaseService;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.cloud.firestore.QuerySnapshot;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/learning")
public class LearningController {

    private final FirebaseService firebaseService;

    // Seeding mock database of learning materials
    private static final Map<String, LearningItem> seededItems = new ConcurrentHashMap<>();

    // User-specific progress fallback map for in-memory mode
    private static final Map<String, Map<String, Integer>> mockUserLearningProgress = new ConcurrentHashMap<>();

    public LearningController(FirebaseService firebaseService) {
        this.firebaseService = firebaseService;
        seedLearningContent();
    }

    private String getAuthUserId() {
        try {
            Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            if (principal instanceof String) {
                return (String) principal;
            }
        } catch (Exception ignored) {}
        return null;
    }

    private void seedLearningContent() {
        // Seed Alphabets A to Z
        for (char ch = 'A'; ch <= 'Z'; ch++) {
            String id = "alpha-" + ch;
            seededItems.put(id, new LearningItem(
                    id,
                    "alphabet",
                    String.valueOf(ch),
                    "Learn how to fingerspell the letter " + ch + " using sign language.",
                    "https://gesturespeak-placeholder.web.app/animations/alphabets/" + ch + ".mp4",
                    0
            ));
        }

        // Seed words from classes.txt labels
        String[] words = {"help", "no", "please", "school", "thank_you", "what", "who", "why", "yes", "you"};
        for (String word : words) {
            String id = "word-" + word;
            String formattedTitle = word.replace("_", " ").substring(0, 1).toUpperCase() + word.replace("_", " ").substring(1);
            seededItems.put(id, new LearningItem(
                    id,
                    "word",
                    formattedTitle,
                    "Learn the sign gesture for the phrase '" + formattedTitle + "'.",
                    "https://gesturespeak-placeholder.web.app/animations/words/" + word + ".mp4",
                    0
            ));
        }
    }

    @GetMapping("/public/list")
    public ResponseEntity<Collection<LearningItem>> getAllItemsPublic(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String search) {

        String uid = getAuthUserId();
        Map<String, Integer> userProgress = new HashMap<>();

        if (uid != null) {
            if (firebaseService.isFirebaseInitialized()) {
                try {
                    Firestore db = firebaseService.getDb();
                    QuerySnapshot progressQuery = db.collection("users").document(uid).collection("learningProgress").get().get();
                    for (QueryDocumentSnapshot doc : progressQuery.getDocuments()) {
                        String itemId = doc.getId();
                        Integer prog = doc.getLong("progress") != null ? doc.getLong("progress").intValue() : 0;
                        userProgress.put(itemId, prog);
                    }
                } catch (Exception e) {
                    System.err.println("Firestore learning progress fetch failed: " + e.getMessage());
                }
            } else {
                userProgress = mockUserLearningProgress.getOrDefault(uid, new HashMap<>());
            }
        }

        List<LearningItem> items = new ArrayList<>();
        for (LearningItem item : seededItems.values()) {
            LearningItem copy = new LearningItem(
                    item.getId(),
                    item.getCategory(),
                    item.getTitle(),
                    item.getDescription(),
                    item.getAnimationUrl(),
                    userProgress.getOrDefault(item.getId(), 0)
            );
            items.add(copy);
        }

        // Filter
        return ResponseEntity.ok(items.stream()
                .filter(item -> category == null || item.getCategory().equalsIgnoreCase(category))
                .filter(item -> search == null || item.getTitle().toLowerCase().contains(search.toLowerCase()) 
                                || item.getDescription().toLowerCase().contains(search.toLowerCase()))
                .collect(Collectors.toList()));
    }

    @GetMapping
    public ResponseEntity<Collection<LearningItem>> getAllItems(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String search) {
        return getAllItemsPublic(category, search);
    }

    @PostMapping("/progress/{id}")
    public ResponseEntity<?> updateProgress(@PathVariable String id, @RequestParam Integer progress) {
        String uid = getAuthUserId();
        if (uid == null) {
            uid = "mock-user-uid";
        }

        LearningItem item = seededItems.get(id);
        if (item != null) {
            // Save to user-specific progress map/collection
            if (firebaseService.isFirebaseInitialized()) {
                try {
                    Firestore db = firebaseService.getDb();
                    Map<String, Object> progressData = new HashMap<>();
                    progressData.put("progress", progress);
                    progressData.put("updatedAt", System.currentTimeMillis());
                    
                    db.collection("users").document(uid).collection("learningProgress").document(id).set(progressData).get();
                } catch (Exception e) {
                    System.err.println("Firestore learning progress update failed: " + e.getMessage());
                }
            } else {
                mockUserLearningProgress.computeIfAbsent(uid, k -> new ConcurrentHashMap<>()).put(id, progress);
            }

            // Save LearningSession for analytics
            LearningSession session = new LearningSession(
                    UUID.randomUUID().toString(),
                    uid,
                    id,
                    item.getCategory(),
                    progress,
                    System.currentTimeMillis()
            );

            // Save Activity for analytics
            Activity activity = new Activity(
                    UUID.randomUUID().toString(),
                    uid,
                    "learning_session",
                    System.currentTimeMillis(),
                    "Completed learning: " + item.getCategory() + " " + item.getTitle()
            );

            if (firebaseService.isFirebaseInitialized()) {
                try {
                    Firestore db = firebaseService.getDb();
                    db.collection("learningSessions").document(session.getId()).set(session);
                    db.collection("activities").document(activity.getId()).set(activity);
                } catch (Exception e) {
                    System.err.println("Firestore learning analytics save failed: " + e.getMessage());
                }
            } else {
                AnalyticsController.mockLearningSessions.computeIfAbsent(uid, k -> new CopyOnWriteArrayList<>()).add(session);
                AnalyticsController.mockActivities.computeIfAbsent(uid, k -> new CopyOnWriteArrayList<>()).add(activity);
            }

            LearningItem responseItem = new LearningItem(
                    item.getId(),
                    item.getCategory(),
                    item.getTitle(),
                    item.getDescription(),
                    item.getAnimationUrl(),
                    progress
            );
            return ResponseEntity.ok(responseItem);
        }
        return ResponseEntity.notFound().build();
    }

    // Admin endpoints for adding/editing learning items
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> addLearningItem(@RequestBody LearningItem item) {
        if (item.getId() == null) {
            item.setId(UUID.randomUUID().toString());
        }
        if (item.getProgress() == null) {
            item.setProgress(0);
        }
        seededItems.put(item.getId(), item);

        if (firebaseService.isFirebaseInitialized()) {
            try {
                Firestore db = firebaseService.getDb();
                db.collection("learningContent").document(item.getId()).set(item).get();
            } catch (Exception e) {
                System.err.println("Firestore learning item write failed: " + e.getMessage());
            }
        }
        return ResponseEntity.ok(item);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateLearningItem(@PathVariable String id, @RequestBody LearningItem item) {
        if (!seededItems.containsKey(id)) {
            return ResponseEntity.notFound().build();
        }
        item.setId(id);
        seededItems.put(id, item);

        if (firebaseService.isFirebaseInitialized()) {
            try {
                Firestore db = firebaseService.getDb();
                db.collection("learningContent").document(id).set(item).get();
            } catch (Exception e) {
                System.err.println("Firestore learning item update failed: " + e.getMessage());
            }
        }
        return ResponseEntity.ok(item);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteLearningItem(@PathVariable String id) {
        if (!seededItems.containsKey(id)) {
            return ResponseEntity.notFound().build();
        }
        seededItems.remove(id);

        if (firebaseService.isFirebaseInitialized()) {
            try {
                Firestore db = firebaseService.getDb();
                db.collection("learningContent").document(id).delete().get();
            } catch (Exception e) {
                System.err.println("Firestore learning item delete failed: " + e.getMessage());
            }
        }
        return ResponseEntity.ok(Map.of("message", "Learning item deleted"));
    }
}
