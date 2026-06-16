package com.gesturespeak.backend.service;

import com.google.cloud.firestore.Firestore;
import com.google.firebase.FirebaseApp;
import com.google.firebase.cloud.FirestoreClient;
import org.springframework.stereotype.Service;

@Service
public class FirebaseService {

    public Firestore getDb() {
        if (FirebaseApp.getApps().isEmpty()) {
            return null;
        }
        try {
            return FirestoreClient.getFirestore();
        } catch (Exception e) {
            System.err.println("Firestore client retrieval failed: " + e.getMessage());
            return null;
        }
    }

    public boolean isFirebaseInitialized() {
        return !FirebaseApp.getApps().isEmpty();
    }
}
