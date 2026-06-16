package com.gesturespeak.backend.model;

public class EmergencyContact {
    private String id;
    private String userId;
    private String name;
    private String relationship;
    private String phoneNumber;
    private String email;
    private Long createdAt;
    private Boolean isPrimary;

    public EmergencyContact() {
    }

    public EmergencyContact(String id, String userId, String name, String relationship, String phoneNumber, String email, Long createdAt, Boolean isPrimary) {
        this.id = id;
        this.userId = userId;
        this.name = name;
        this.relationship = relationship;
        this.phoneNumber = phoneNumber;
        this.email = email;
        this.createdAt = createdAt;
        this.isPrimary = isPrimary;
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

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getRelationship() {
        return relationship;
    }

    public void setRelationship(String relationship) {
        this.relationship = relationship;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public Long getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Long createdAt) {
        this.createdAt = createdAt;
    }

    public Boolean getIsPrimary() {
        return isPrimary;
    }

    public void setIsPrimary(Boolean isPrimary) {
        this.isPrimary = isPrimary;
    }
}
