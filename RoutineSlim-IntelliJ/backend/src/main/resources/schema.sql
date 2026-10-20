CREATE TABLE IF NOT EXISTS app_users (id VARCHAR(120) PRIMARY KEY, password_hash VARCHAR(100) NOT NULL, display_name VARCHAR(120) NOT NULL, email VARCHAR(255), profile_json CLOB);
CREATE TABLE IF NOT EXISTS user_data (user_id VARCHAR(120) NOT NULL, data_key VARCHAR(60) NOT NULL, json_value CLOB NOT NULL, PRIMARY KEY(user_id,data_key), FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE);

CREATE TABLE IF NOT EXISTS community_data (data_key VARCHAR(60) PRIMARY KEY, json_value CLOB NOT NULL);
