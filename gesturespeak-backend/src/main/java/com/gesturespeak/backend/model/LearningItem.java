package com.gesturespeak.backend.model;

public class LearningItem {
    private String id;
    private String category; // "alphabet" or "word"
    private String title;    // e.g. "A", "hello"
    private String description;
    private String animationUrl;
    private Integer progress;

    public LearningItem() {
    }

    public LearningItem(String id, String category, String title, String description, String animationUrl, Integer progress) {
        this.id = id;
        this.category = category;
        this.title = title;
        this.description = description;
        this.animationUrl = animationUrl;
        this.progress = progress;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getAnimationUrl() {
        return animationUrl;
    }

    public void setAnimationUrl(String animationUrl) {
        this.animationUrl = animationUrl;
    }

    public Integer getProgress() {
        return progress;
    }

    public void setProgress(Integer progress) {
        this.progress = progress;
    }
}
