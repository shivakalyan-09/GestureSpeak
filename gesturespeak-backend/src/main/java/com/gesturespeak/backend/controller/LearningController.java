package com.gesturespeak.backend.controller;

import com.gesturespeak.backend.model.LearningItem;
import com.gesturespeak.backend.service.FirebaseService;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.cloud.firestore.QuerySnapshot;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/learning")
public class LearningController {

    private final FirebaseService firebaseService;

    // Seeding mock database of learning materials
    private static final Map<String, LearningItem> seededItems = new ConcurrentHashMap<>();

    public LearningController(FirebaseService firebaseService) {
        this.firebaseService = firebaseService;
        seedLearningContent();
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

        List<LearningItem> items = new ArrayList<>(seededItems.values());

        // Sync from Firestore if available
        if (firebaseService.isFirebaseInitialized()) {
            try {
                Firestore db = firebaseService.getDb();
                QuerySnapshot query = db.collection("learningContent").get().get();
                List<LearningItem> dbItems = query.getDocuments().stream()
                        .map(doc -> doc.toObject(LearningItem.class))
                        .collect(Collectors.toList());
                if (!dbItems.isEmpty()) {
                    items = dbItems;
                }
            } catch (Exception e) {
                System.err.println("Firestore learning items sync failed: " + e.getMessage());
            }
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
        LearningItem item = seededItems.get(id);
        if (item != null) {
            item.setProgress(progress);
            
            if (firebaseService.isFirebaseInitialized()) {
                try {
                    Firestore db = firebaseService.getDb();
                    db.collection("learningContent").document(id).set(item).get();
                } catch (Exception e) {
                    System.err.println("Firestore progress update failed: " + e.getMessage());
                }
            }
            return ResponseEntity.ok(item);
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
