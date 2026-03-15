CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    concept2_id INTEGER UNIQUE NOT NULL,
    email TEXT,
    display_name TEXT,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    concept2_result_id INTEGER UNIQUE NOT NULL,
    workout_date TIMESTAMP NOT NULL,
    workout_type TEXT NOT NULL,
    description TEXT,
    distance_meters INTEGER,
    duration_seconds INTEGER,
    avg_split_seconds DECIMAL(10,2),
    avg_spm DECIMAL(10,2),
    avg_watts DECIMAL(10,2),
    total_calories INTEGER,
    heart_rate_avg INTEGER,
    heart_rate_max INTEGER,
    raw_csv_path TEXT,
    stroke_data_parsed BOOLEAN NOT NULL DEFAULT false,
    ai_analysis_id UUID,
    drive_to_recovery_ratio DECIMAL(10,4),
    pace_consistency_stddev DECIMAL(10,4),
    power_consistency_stddev DECIMAL(10,4),
    spm_consistency_stddev DECIMAL(10,4),
    power_curve_json JSONB,
    pace_curve_json JSONB,
    first_quarter_avg_watts DECIMAL(10,2),
    last_quarter_avg_watts DECIMAL(10,2),
    peak_power_watts DECIMAL(10,2),
    peak_power_stroke_number INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON workouts(user_id, workout_date);
CREATE INDEX IF NOT EXISTS idx_workouts_type ON workouts(workout_type);

CREATE TABLE IF NOT EXISTS stroke_data_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    stroke_number INTEGER NOT NULL,
    elapsed_time_ms INTEGER,
    stroke_rate DECIMAL(10,2),
    pace_split_secs DECIMAL(10,2),
    power_watts DECIMAL(10,2),
    drive_length_m DECIMAL(10,4),
    drive_time_secs DECIMAL(10,4),
    stroke_distance_m DECIMAL(10,4),
    cumulative_distance_m DECIMAL(10,2),
    heart_rate INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stroke_data_workout ON stroke_data_points(workout_id, stroke_number);

CREATE TABLE IF NOT EXISTS ai_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_id UUID UNIQUE NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    model_version TEXT NOT NULL,
    analysis_json JSONB NOT NULL,
    narrative_text TEXT,
    generated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS personal_bests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    value DECIMAL(12,2) NOT NULL,
    workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    achieved_at TIMESTAMP NOT NULL,
    UNIQUE(user_id, category)
);

CREATE TABLE IF NOT EXISTS trend_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    report_json JSONB NOT NULL,
    narrative_text TEXT,
    generated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trend_reports_user ON trend_reports(user_id, generated_at);

CREATE TABLE IF NOT EXISTS job_failures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_name TEXT NOT NULL,
    job_id TEXT NOT NULL,
    error TEXT NOT NULL,
    payload JSONB,
    failed_at TIMESTAMP NOT NULL DEFAULT NOW()
);
