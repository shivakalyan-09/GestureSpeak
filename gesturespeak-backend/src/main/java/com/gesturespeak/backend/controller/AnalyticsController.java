package com.gesturespeak.backend.controller;

import com.gesturespeak.backend.model.*;
import com.gesturespeak.backend.service.FirebaseService;
import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final FirebaseService firebaseService;

    // In-memory fallback collections for local dev
    public static final Map<String, List<Activity>> mockActivities = new ConcurrentHashMap<>();
    public static final Map<String, List<Translation>> mockTranslations = new ConcurrentHashMap<>();
    public static final Map<String, List<LearningSession>> mockLearningSessions = new ConcurrentHashMap<>();
    public static final Map<String, UsageStatistics> mockUsageStatistics = new ConcurrentHashMap<>();

    public AnalyticsController(FirebaseService firebaseService) {
        this.firebaseService = firebaseService;
    }

    private String getAuthUserId() {
        return (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    @GetMapping("/dashboard")
    public ResponseEntity<?> getDashboardData() {
        String uid = getAuthUserId();
        
        String username = "Gesture User";
        List<Activity> activities = new ArrayList<>();
        List<Translation> translations = new ArrayList<>();
        List<LearningSession> learningSessions = new ArrayList<>();
        
        // 1. Fetch User Profile
        if (firebaseService.isFirebaseInitialized()) {
            try {
                Firestore db = firebaseService.getDb();
                DocumentSnapshot userDoc = db.collection("users").document(uid).get().get();
                if (userDoc.exists() && userDoc.get("username") != null) {
                    username = userDoc.getString("username");
                }
                
                // Fetch activities
                QuerySnapshot actQuery = db.collection("activities").whereEqualTo("userId", uid).get().get();
                activities = actQuery.getDocuments().stream().map(doc -> doc.toObject(Activity.class)).collect(Collectors.toList());
                
                // Fetch translations
                QuerySnapshot transQuery = db.collection("translations").whereEqualTo("userId", uid).get().get();
                translations = transQuery.getDocuments().stream().map(doc -> doc.toObject(Translation.class)).collect(Collectors.toList());
                
                // Fetch learning sessions
                QuerySnapshot learnQuery = db.collection("learningSessions").whereEqualTo("userId", uid).get().get();
                learningSessions = learnQuery.getDocuments().stream().map(doc -> doc.toObject(LearningSession.class)).collect(Collectors.toList());
            } catch (Exception e) {
                System.err.println("Firestore dashboard fetch failed, using mock data fallback: " + e.getMessage());
                activities = mockActivities.getOrDefault(uid, new ArrayList<>());
                translations = mockTranslations.getOrDefault(uid, new ArrayList<>());
                learningSessions = mockLearningSessions.getOrDefault(uid, new ArrayList<>());
            }
        } else {
            // Read from AuthController mockUsers if possible
            activities = mockActivities.getOrDefault(uid, new ArrayList<>());
            translations = mockTranslations.getOrDefault(uid, new ArrayList<>());
            learningSessions = mockLearningSessions.getOrDefault(uid, new ArrayList<>());
        }

        // Sort lists by timestamp descending for recent processing
        activities.sort((a, b) -> b.getTimestamp().compareTo(a.getTimestamp()));
        translations.sort((a, b) -> b.getTimestamp().compareTo(a.getTimestamp()));
        learningSessions.sort((a, b) -> b.getTimestamp().compareTo(a.getTimestamp()));

        LocalDate today = LocalDate.now();
        ZoneId zone = ZoneId.systemDefault();

        // 2. Compute Today's counts
        int todaySignToText = 0;
        int todayTextToSign = 0;
        int todayLiveTranslate = 0;
        int todayVoiceTranslate = 0;
        int todayLearningSessions = 0;

        for (Translation t : translations) {
            LocalDate tDate = Instant.ofEpochMilli(t.getTimestamp()).atZone(zone).toLocalDate();
            if (tDate.equals(today)) {
                String type = t.getType().toLowerCase();
                if (type.contains("sign to text") || type.contains("sign language to text")) {
                    todaySignToText++;
                } else if (type.contains("text to sign")) {
                    todayTextToSign++;
                } else if (type.contains("live translate") || type.contains("live translation")) {
                    todayLiveTranslate++;
                } else if (type.contains("voice translate") || type.contains("voice translation")) {
                    todayVoiceTranslate++;
                }
            }
        }

        for (LearningSession s : learningSessions) {
            LocalDate sDate = Instant.ofEpochMilli(s.getTimestamp()).atZone(zone).toLocalDate();
            if (sDate.equals(today)) {
                todayLearningSessions++;
            }
        }

        int totalTodayTranslations = todaySignToText + todayTextToSign + todayLiveTranslate + todayVoiceTranslate;

        Map<String, Object> dailyProgress = new HashMap<>();
        dailyProgress.put("signToText", todaySignToText);
        dailyProgress.put("textToSign", todayTextToSign);
        dailyProgress.put("liveTranslate", todayLiveTranslate);
        dailyProgress.put("voiceTranslate", todayVoiceTranslate);
        dailyProgress.put("learningSessions", todayLearningSessions);
        dailyProgress.put("totalToday", totalTodayTranslations);

        // 3. Compute Total translations
        int totalTranslations = translations.size();

        // 4. Compute Most Used Signs
        Map<String, Integer> signCounts = new HashMap<>();
        for (Translation t : translations) {
            String type = t.getType().toLowerCase();
            if (type.contains("sign") || type.contains("gesture")) {
                String val = t.getTranslated(); // e.g. "A", "hello", "thank_you"
                if (val != null && !val.trim().isEmpty()) {
                    // Normalize display text
                    String normalized = val.replace("_", " ").substring(0, 1).toUpperCase() + val.replace("_", " ").substring(1);
                    signCounts.put(normalized, signCounts.getOrDefault(normalized, 0) + 1);
                }
            }
        }
        
        List<Map.Entry<String, Integer>> sortedSigns = new ArrayList<>(signCounts.entrySet());
        sortedSigns.sort((a, b) -> b.getValue().compareTo(a.getValue()));
        
        List<Map<String, Object>> mostUsedSigns = new ArrayList<>();
        for (int i = 0; i < Math.min(4, sortedSigns.size()); i++) {
            Map<String, Object> item = new HashMap<>();
            item.put("sign", sortedSigns.get(i).getKey());
            item.put("count", sortedSigns.get(i).getValue());
            mostUsedSigns.add(item);
        }

        // 5. Weekly Activity Chart (Mon..Sun of current week)
        LocalDate startOfWeek = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate endOfWeek = today.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));

        Map<DayOfWeek, Integer> weeklyTrans = new EnumMap<>(DayOfWeek.class);
        Map<DayOfWeek, Integer> weeklyDect = new EnumMap<>(DayOfWeek.class);
        Map<DayOfWeek, Integer> weeklyLearn = new EnumMap<>(DayOfWeek.class);
        for (DayOfWeek day : DayOfWeek.values()) {
            weeklyTrans.put(day, 0);
            weeklyDect.put(day, 0);
            weeklyLearn.put(day, 0);
        }

        for (Translation t : translations) {
            LocalDate tDate = Instant.ofEpochMilli(t.getTimestamp()).atZone(zone).toLocalDate();
            if (!tDate.isBefore(startOfWeek) && !tDate.isAfter(endOfWeek)) {
                DayOfWeek dow = tDate.getDayOfWeek();
                weeklyTrans.put(dow, weeklyTrans.get(dow) + 1);
                if (t.getType().toLowerCase().contains("sign") || t.getType().toLowerCase().contains("gesture")) {
                    weeklyDect.put(dow, weeklyDect.get(dow) + 1);
                }
            }
        }

        for (LearningSession s : learningSessions) {
            LocalDate sDate = Instant.ofEpochMilli(s.getTimestamp()).atZone(zone).toLocalDate();
            if (!sDate.isBefore(startOfWeek) && !sDate.isAfter(endOfWeek)) {
                DayOfWeek dow = sDate.getDayOfWeek();
                weeklyLearn.put(dow, weeklyLearn.get(dow) + 1);
            }
        }

        String[] daysOrder = {"Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"};
        DayOfWeek[] daysOfWeekOrder = {DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY, DayOfWeek.SUNDAY};
        
        List<Map<String, Object>> weeklyActivity = new ArrayList<>();
        for (int i = 0; i < 7; i++) {
            Map<String, Object> dayMap = new HashMap<>();
            dayMap.put("day", daysOrder[i]);
            dayMap.put("translations", weeklyTrans.get(daysOfWeekOrder[i]));
            dayMap.put("detections", weeklyDect.get(daysOfWeekOrder[i]));
            dayMap.put("learningSessions", weeklyLearn.get(daysOfWeekOrder[i]));
            weeklyActivity.add(dayMap);
        }

        // 6. Monthly Analytics
        int monthTranslations = 0;
        Map<String, Integer> monthFeatures = new HashMap<>();
        Set<LocalDate> activeDaysSet = new HashSet<>();

        for (Translation t : translations) {
            LocalDate tDate = Instant.ofEpochMilli(t.getTimestamp()).atZone(zone).toLocalDate();
            if (tDate.getYear() == today.getYear() && tDate.getMonth() == today.getMonth()) {
                monthTranslations++;
                activeDaysSet.add(tDate);
                
                String feat = t.getType();
                monthFeatures.put(feat, monthFeatures.getOrDefault(feat, 0) + 1);
            }
        }

        for (LearningSession s : learningSessions) {
            LocalDate sDate = Instant.ofEpochMilli(s.getTimestamp()).atZone(zone).toLocalDate();
            if (sDate.getYear() == today.getYear() && sDate.getMonth() == today.getMonth()) {
                activeDaysSet.add(sDate);
            }
        }

        String mostUsedFeature = "Sign to Text";
        int maxFeatCount = -1;
        for (Map.Entry<String, Integer> entry : monthFeatures.entrySet()) {
            if (entry.getValue() > maxFeatCount) {
                maxFeatCount = entry.getValue();
                mostUsedFeature = entry.getKey();
            }
        }

        int activeDays = activeDaysSet.size();
        double avgDailyUsage = activeDays == 0 ? 0.0 : (double) monthTranslations / activeDays;

        Map<String, Object> monthlyAnalytics = new HashMap<>();
        monthlyAnalytics.put("totalTranslations", monthTranslations);
        monthlyAnalytics.put("mostUsedFeature", mostUsedFeature);
        monthlyAnalytics.put("activeDays", activeDays);
        monthlyAnalytics.put("averageDailyUsage", Math.round(avgDailyUsage * 10.0) / 10.0);

        // 7. Recent Activity Section (Latest 10 activities)
        List<Map<String, Object>> recentActivity = new ArrayList<>();
        DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("hh:mm a", Locale.ENGLISH);
        for (int i = 0; i < Math.min(10, activities.size()); i++) {
            Activity act = activities.get(i);
            Map<String, Object> item = new HashMap<>();
            String time = Instant.ofEpochMilli(act.getTimestamp()).atZone(zone).toLocalTime().format(timeFormatter);
            item.put("id", act.getId());
            item.put("timeFormatted", time);
            item.put("activity", act.getActionType() + (act.getDetails() != null && !act.getDetails().isEmpty() ? " (" + act.getDetails() + ")" : ""));
            recentActivity.add(item);
        }

        // 8. Feature Usage Breakdown (percentages)
        int signToTextCount = 0;
        int textToSignCount = 0;
        int liveTranslateCount = 0;
        int voiceTranslateCount = 0;

        for (Translation t : translations) {
            String type = t.getType().toLowerCase();
            if (type.contains("sign to text") || type.contains("sign language to text")) {
                signToTextCount++;
            } else if (type.contains("text to sign")) {
                textToSignCount++;
            } else if (type.contains("live translate") || type.contains("live translation")) {
                liveTranslateCount++;
            } else if (type.contains("voice translate") || type.contains("voice translation")) {
                voiceTranslateCount++;
            }
        }

        double signPct = 0.0, textPct = 0.0, livePct = 0.0, voicePct = 0.0;
        int totalBreakdown = signToTextCount + textToSignCount + liveTranslateCount + voiceTranslateCount;
        if (totalBreakdown > 0) {
            signPct = Math.round(((double) signToTextCount / totalBreakdown) * 1000.0) / 10.0;
            textPct = Math.round(((double) textToSignCount / totalBreakdown) * 1000.0) / 10.0;
            livePct = Math.round(((double) liveTranslateCount / totalBreakdown) * 1000.0) / 10.0;
            voicePct = Math.round(((double) voiceTranslateCount / totalBreakdown) * 1000.0) / 10.0;
        }

        Map<String, Double> featureUsage = new HashMap<>();
        featureUsage.put("signToText", signPct);
        featureUsage.put("textToSign", textPct);
        featureUsage.put("liveTranslate", livePct);
        featureUsage.put("voiceTranslate", voicePct);

        // 9. User Streak System
        // Find unique active days, sort descending
        List<LocalDate> sortedActiveDates = activeDaysSet.stream()
                .sorted(Comparator.reverseOrder())
                .collect(Collectors.toList());

        int streak = 0;
        if (!sortedActiveDates.isEmpty()) {
            LocalDate checkDate = today;
            // If the user hasn't logged an activity today, check if they had one yesterday
            if (!sortedActiveDates.contains(today)) {
                checkDate = today.minusDays(1);
            }
            
            while (sortedActiveDates.contains(checkDate)) {
                streak++;
                checkDate = checkDate.minusDays(1);
            }
        }

        // 10. Learning Progress
        long alphabetsLearned = learningSessions.stream()
                .filter(s -> s.getCategory().equalsIgnoreCase("alphabet") && s.getProgress() == 100)
                .map(LearningSession::getItemId)
                .distinct()
                .count();

        long wordsLearned = learningSessions.stream()
                .filter(s -> s.getCategory().equalsIgnoreCase("word") && s.getProgress() == 100)
                .map(LearningSession::getItemId)
                .distinct()
                .count();

        int practiceSessions = learningSessions.size();

        Map<String, Object> learningProgress = new HashMap<>();
        learningProgress.put("alphabetsLearned", alphabetsLearned);
        learningProgress.put("wordsLearned", wordsLearned);
        learningProgress.put("practiceSessions", practiceSessions);

        // Assemble Dashboard payload
        Map<String, Object> dashboard = new HashMap<>();
        dashboard.put("userGreeting", "Welcome, " + username);
        dashboard.put("dailyProgress", dailyProgress);
        dashboard.put("totalTranslations", totalTranslations);
        dashboard.put("signUsage", mostUsedSigns);
        dashboard.put("weeklyActivity", weeklyActivity);
        dashboard.put("monthlyAnalytics", monthlyAnalytics);
        dashboard.put("recentActivity", recentActivity);
        dashboard.put("featureUsageBreakdown", featureUsage);
        dashboard.put("streak", streak);
        dashboard.put("learningProgress", learningProgress);

        return ResponseEntity.ok(dashboard);
    }
}
