package com.gesturespeak.backend.model;

public class EmergencyLog {
    private String id;
    private String userId;
    private String type; // e.g. "SOS", "Siren", "Flashlight"
    private String details;
    private String locationLink;
    private Long timestamp;
    private String latitude;
    private String longitude;
    private String mapsUrl;
    private Integer contactsNotified;
    private String status; // e.g. "SENT", "FAILED"

    public EmergencyLog() {
    }

    public EmergencyLog(String id, String userId, String type, String details, String locationLink, Long timestamp) {
        this.id = id;
        this.userId = userId;
        this.type = type;
        this.details = details;
        this.locationLink = locationLink;
        this.timestamp = timestamp;
    }

    public EmergencyLog(String id, String userId, String type, String details, String locationLink, Long timestamp, 
                        String latitude, String longitude, String mapsUrl, Integer contactsNotified, String status) {
        this.id = id;
        this.userId = userId;
        this.type = type;
        this.details = details;
        this.locationLink = locationLink;
        this.timestamp = timestamp;
        this.latitude = latitude;
        this.longitude = longitude;
        this.mapsUrl = mapsUrl;
        this.contactsNotified = contactsNotified;
        this.status = status;
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

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getDetails() {
        return details;
    }

    public void setDetails(String details) {
        this.details = details;
    }

    public String getLocationLink() {
        return locationLink;
    }

    public void setLocationLink(String locationLink) {
        this.locationLink = locationLink;
    }

    public Long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Long timestamp) {
        this.timestamp = timestamp;
    }

    public String getLatitude() {
        return latitude;
    }

    public void setLatitude(String latitude) {
        this.latitude = latitude;
    }

    public String getLongitude() {
        return longitude;
    }

    public void setLongitude(String longitude) {
        this.longitude = longitude;
    }

    public String getMapsUrl() {
        return mapsUrl;
    }

    public void setMapsUrl(String mapsUrl) {
        this.mapsUrl = mapsUrl;
    }

    public Integer getContactsNotified() {
        return contactsNotified;
    }

    public void setContactsNotified(Integer contactsNotified) {
        this.contactsNotified = contactsNotified;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
