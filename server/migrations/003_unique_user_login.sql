CREATE UNIQUE INDEX users_email_login_unique
ON users (lower(email))
WHERE deleted_at IS NULL;
