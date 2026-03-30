ALTER TABLE conversations
    ADD COLUMN IF NOT EXISTS wallpaper_id VARCHAR(80);
