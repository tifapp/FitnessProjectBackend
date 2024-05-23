export const createUserTableSQL = `
CREATE TABLE IF NOT EXISTS user (
id char(36) NOT NULL,
name varchar(50) NOT NULL,
handle varchar(15) NOT NULL,
createdDateTime datetime NOT NULL DEFAULT current_timestamp(),
updatedDateTime datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
bio varchar(500),
profileImageURL varchar(200),
PRIMARY KEY (id),
UNIQUE KEY handle (handle),
CONSTRAINT format_user_handle CHECK (REGEXP_LIKE(handle, _utf8mb4 '^[a-z_0-9]{1,15}$'))
)`
