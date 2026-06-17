package com.gesturespeak.backend.model;

public class UsageStatistics {
    private String id;
    private String userId;
    private Integer streakCount;
    private Long lastActiveTimestamp;
    private Integer totalTranslations;

    public UsageStatistics() {
    }

    public UsageStatistics(String id, String userId, Integer streakCount, Long lastActiveTimestamp, Integer totalTranslations) {
        this.id = id;
        this.userId = userId;
        this.streakCount = streakCount;
        this.lastActiveTimestamp = lastActiveTimestamp;
        this.totalTranslations = totalTranslations;
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

    public Integer getStreakCount() {
        return streakCount;
    }

    public void setStreakCount(Integer streakCount) {
        this.streakCount = streakCount;
    }

    public Long getLastActiveTimestamp() {
        return lastActiveTimestamp;
    }

    public void setLastActiveTimestamp(Long lastActiveTimestamp) {
        this.lastActiveTimestamp = lastActiveTimestamp;
    }

    public Integer getTotalTranslations() {
        return totalTranslations;
    }

    public void setTotalTranslations(Integer totalTranslations) {
        this.totalTranslations = totalTranslations;
    }
}
