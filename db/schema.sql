-- ==========================================================
-- AI-Powered Alumni Career Intelligence System
-- PostgreSQL schema (Neon-compatible)
-- ==========================================================

DROP TABLE IF EXISTS alumni_advice CASCADE;
DROP TABLE IF EXISTS questions_answers CASCADE;
DROP TABLE IF EXISTS advice_questions CASCADE;
DROP TABLE IF EXISTS alumni_survey_responses CASCADE;
DROP TABLE IF EXISTS career_journeys CASCADE;
DROP TABLE IF EXISTS alumni_skills CASCADE;
DROP TABLE IF EXISTS student_interests CASCADE;
DROP TABLE IF EXISTS alumni_interests CASCADE;
DROP TABLE IF EXISTS alumni_profiles CASCADE;
DROP TABLE IF EXISTS student_profiles CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS skills CASCADE;
DROP TABLE IF EXISTS interests CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ==========================================================
-- CORE
-- ==========================================================

CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(20) NOT NULL CHECK (role IN ('student', 'alumni', 'admin')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Refresh tokens are stored server-side so logout can invalidate a session.
CREATE TABLE refresh_tokens (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked    BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE departments (
    id   SERIAL PRIMARY KEY,
    name VARCHAR(150) UNIQUE NOT NULL
);

CREATE TABLE companies (
    id   SERIAL PRIMARY KEY,
    name VARCHAR(150) UNIQUE NOT NULL
);

CREATE TABLE interests (
    id   SERIAL PRIMARY KEY,
    name VARCHAR(150) UNIQUE NOT NULL
);

CREATE TABLE skills (
    id   SERIAL PRIMARY KEY,
    name VARCHAR(150) UNIQUE NOT NULL
);

-- ==========================================================
-- PROFILES
-- ==========================================================

CREATE TABLE student_profiles (
    id                SERIAL PRIMARY KEY,
    user_id           INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name              VARCHAR(150) NOT NULL,
    enrollment_number VARCHAR(50) UNIQUE NOT NULL,
    department_id     INTEGER REFERENCES departments(id),
    year              INTEGER,
    graduation_year   INTEGER,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE student_interests (
    student_id  INTEGER NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    interest_id INTEGER NOT NULL REFERENCES interests(id) ON DELETE CASCADE,
    PRIMARY KEY (student_id, interest_id)
);

CREATE TABLE alumni_profiles (
    id                     SERIAL PRIMARY KEY,
    user_id                INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name                   VARCHAR(150) NOT NULL,
    department_id          INTEGER REFERENCES departments(id),
    graduation_year        INTEGER,
    company_id             INTEGER REFERENCES companies(id),
    job_role               VARCHAR(150),
    location               VARCHAR(150),
    bio                    TEXT,
    linkedin_url           VARCHAR(255),
    github_url             VARCHAR(255),
    experience_years       NUMERIC(4,1),
    mentorship_available   BOOLEAN NOT NULL DEFAULT false,
    referral_available     BOOLEAN NOT NULL DEFAULT false,
    onboarding_completed   BOOLEAN NOT NULL DEFAULT false,
    -- bumped every time semantically-relevant data changes; used to detect stale Qdrant points
    qdrant_synced_at       TIMESTAMPTZ,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE alumni_interests (
    alumni_id   INTEGER NOT NULL REFERENCES alumni_profiles(id) ON DELETE CASCADE,
    interest_id INTEGER NOT NULL REFERENCES interests(id) ON DELETE CASCADE,
    PRIMARY KEY (alumni_id, interest_id)
);

CREATE TABLE alumni_skills (
    alumni_id INTEGER NOT NULL REFERENCES alumni_profiles(id) ON DELETE CASCADE,
    skill_id  INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    PRIMARY KEY (alumni_id, skill_id)
);

-- ==========================================================
-- CAREER JOURNEY (timeline)
-- ==========================================================

CREATE TABLE career_journeys (
    id          SERIAL PRIMARY KEY,
    alumni_id   INTEGER NOT NULL REFERENCES alumni_profiles(id) ON DELETE CASCADE,
    company_id  INTEGER REFERENCES companies(id),
    role        VARCHAR(150) NOT NULL,
    start_date  DATE,
    end_date    DATE,           -- NULL = current role
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================================
-- SURVEY (flexible schema, see section 15 of spec)
-- ==========================================================

CREATE TABLE alumni_survey_responses (
    id          SERIAL PRIMARY KEY,
    alumni_id   INTEGER NOT NULL REFERENCES alumni_profiles(id) ON DELETE CASCADE,
    question_no INTEGER NOT NULL,
    answer_json JSONB NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (alumni_id, question_no)
);

-- ==========================================================
-- ADVICE SYSTEM
-- ==========================================================

CREATE TABLE advice_questions (
    id         SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    question   TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE alumni_advice (
    id          SERIAL PRIMARY KEY,
    question_id INTEGER NOT NULL REFERENCES advice_questions(id) ON DELETE CASCADE,
    alumni_id   INTEGER NOT NULL REFERENCES alumni_profiles(id) ON DELETE CASCADE,
    answer      TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================================
-- INDEXES for common lookups / filters
-- ==========================================================

CREATE INDEX idx_alumni_department   ON alumni_profiles(department_id);
CREATE INDEX idx_alumni_company      ON alumni_profiles(company_id);
CREATE INDEX idx_alumni_grad_year    ON alumni_profiles(graduation_year);
CREATE INDEX idx_alumni_location     ON alumni_profiles(location);
CREATE INDEX idx_alumni_name         ON alumni_profiles(name);
CREATE INDEX idx_career_alumni       ON career_journeys(alumni_id);
CREATE INDEX idx_survey_alumni       ON alumni_survey_responses(alumni_id);
CREATE INDEX idx_advice_question     ON alumni_advice(question_id);
CREATE INDEX idx_refresh_user        ON refresh_tokens(user_id);
