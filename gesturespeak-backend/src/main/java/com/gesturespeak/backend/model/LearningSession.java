package com.gesturespeak.backend.model;

public class LearningSession {
    private String id;
    private String userId;
    private String itemId;
    private String category;
    private Integer progress;
    private Long timestamp;

    public LearningSession() {
    }

    public LearningSession(String id, String userId, String itemId, String category, Integer progress, Long timestamp) {
        this.id = id;
        this.userId = userId;
        this.itemId = itemId;
        this.category = category;
        this.progress = progress;
        this.timestamp = timestamp;
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

    public String getItemId() {
        return itemId;
    }

    public void setItemId(String itemId) {
        this.itemId = itemId;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public Integer getProgress() {
        return progress;
    }

    public void setProgress(Integer progress) {
        this.progress = progress;
    }

    public Long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Long timestamp) {
        this.timestamp = timestamp;
    }
}
