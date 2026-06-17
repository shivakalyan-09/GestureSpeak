package com.gesturespeak.backend.model;

public class Activity {
    private String id;
    private String userId;
    private String actionType;
    private Long timestamp;
    private String details;

    public Activity() {
    }

    public Activity(String id, String userId, String actionType, Long timestamp, String details) {
        this.id = id;
        this.userId = userId;
        this.actionType = actionType;
        this.timestamp = timestamp;
        this.details = details;
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

    public String getActionType() {
        return actionType;
    }

    public void setActionType(String actionType) {
        this.actionType = actionType;
    }

    public Long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Long timestamp) {
        this.timestamp = timestamp;
    }

    public String getDetails() {
        return details;
    }

    public void setDetails(String details) {
        this.details = details;
    }
}
