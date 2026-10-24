CREATE TABLE IF NOT EXISTS app_users (id VARCHAR(120) PRIMARY KEY, password_hash VARCHAR(100) NOT NULL, display_name VARCHAR(120) NOT NULL, email VARCHAR(255), profile_json LONGTEXT);
CREATE TABLE IF NOT EXISTS user_data (user_id VARCHAR(120) NOT NULL, data_key VARCHAR(60) NOT NULL, json_value LONGTEXT NOT NULL, PRIMARY KEY(user_id,data_key), FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS community_data (data_key VARCHAR(60) PRIMARY KEY, json_value LONGTEXT NOT NULL);

CREATE TABLE IF NOT EXISTS account_security (
 user_id VARCHAR(120) PRIMARY KEY, role VARCHAR(20) NOT NULL,
 verified_email VARCHAR(255) UNIQUE, terms_version VARCHAR(40), privacy_version VARCHAR(40),
 agreed_at TIMESTAMP, verified_at TIMESTAMP, age_over_14 BOOLEAN NOT NULL DEFAULT FALSE,
 FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS signup_email_codes (
 verification_id VARCHAR(36) PRIMARY KEY, email VARCHAR(255) NOT NULL,
 session_hash VARCHAR(64) NOT NULL, code_hash VARCHAR(100) NOT NULL,
 created_at TIMESTAMP NOT NULL, expires_at TIMESTAMP NOT NULL,
 verified_at TIMESTAMP, attempts INT NOT NULL DEFAULT 0, consumed BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE TABLE IF NOT EXISTS signup_mail_limits (
 bucket_key VARCHAR(128) PRIMARY KEY, started_at TIMESTAMP NOT NULL, requests INT NOT NULL
);

CREATE TABLE IF NOT EXISTS feature_records (
 record_id VARCHAR(36) PRIMARY KEY, owner_id VARCHAR(120) NOT NULL, user_id VARCHAR(120), record_type VARCHAR(32) NOT NULL,
 json_value LONGTEXT NOT NULL, created_at TIMESTAMP NOT NULL, updated_at TIMESTAMP NOT NULL,
 UNIQUE(owner_id,record_type,record_id), FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS account_restrictions (
 user_id VARCHAR(120) PRIMARY KEY, suspended BOOLEAN NOT NULL DEFAULT FALSE,
 session_revision INT NOT NULL DEFAULT 0,
 FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
);
