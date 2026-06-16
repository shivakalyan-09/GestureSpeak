package com.gesturespeak.backend.model;

public class HistoryEntry {
    private String id;
    private String userId;
    private String original;
    private String translated;
    private String type;
    private Long timestamp;
    private String timeFormatted;
    private Float confidence;
    private String mode;

    public HistoryEntry() {
    }

    public HistoryEntry(String id, String userId, String original, String translated, String type, 
                        Long timestamp, String timeFormatted, Float confidence, String mode) {
        this.id = id;
        this.userId = userId;
        this.original = original;
        this.translated = translated;
        this.type = type;
        this.timestamp = timestamp;
        this.timeFormatted = timeFormatted;
        this.confidence = confidence;
        this.mode = mode;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getOriginal() {
        return original;
    }

    public void setOriginal(String original) {
        this.original = original;
    }

    public String getTranslated() {
        return translated;
    }

    public void setTranslated(String translated) {
        this.translated = translated;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public Long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Long timestamp) {
        this.timestamp = timestamp;
    }

    public String getTimeFormatted() {
        return timeFormatted;
    }

    public void setTimeFormatted(String timeFormatted) {
        this.timeFormatted = timeFormatted;
    }

    public Float getConfidence() {
        return confidence;
    }

    public void setConfidence(Float confidence) {
        this.confidence = confidence;
    }

    public String getMode() {
        return mode;
    }

    public void setMode(String mode) {
        this.mode = mode;
    }
}
