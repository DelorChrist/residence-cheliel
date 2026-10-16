CREATE TABLE IF NOT EXISTS admins (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS rooms (
  id VARCHAR(120) PRIMARY KEY,
  name VARCHAR(190) NOT NULL,
  price_night INT UNSIGNED NOT NULL DEFAULT 0,
  price_day INT UNSIGNED NOT NULL DEFAULT 0,
  capacity VARCHAR(80) NOT NULL,
  description TEXT NOT NULL,
  long_description TEXT NOT NULL,
  amenities JSON NOT NULL,
  image_principale VARCHAR(500) NOT NULL DEFAULT '',
  images JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX rooms_name_idx (name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reservations (
  id VARCHAR(32) PRIMARY KEY,
  client_name VARCHAR(190) NOT NULL,
  phone VARCHAR(40) NOT NULL,
  email VARCHAR(190) NULL,
  room_id VARCHAR(120) NOT NULL,
  stay_type ENUM('nuitée', 'journée') NOT NULL DEFAULT 'nuitée',
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  remarks TEXT NULL,
  payment_method ENUM('Orange Money', 'Wave') NOT NULL,
  status ENUM('En attente', 'Confirmé', 'Annulé') NOT NULL DEFAULT 'En attente',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT reservations_dates_chk CHECK (check_out > check_in),
  INDEX reservations_phone_idx (phone),
  INDEX reservations_status_idx (status),
  INDEX reservations_created_idx (created_at),
  CONSTRAINT reservations_room_fk FOREIGN KEY (room_id) REFERENCES rooms(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS gallery (
  id CHAR(36) PRIMARY KEY,
  url VARCHAR(500) NOT NULL,
  name VARCHAR(190) NOT NULL,
  storage_path VARCHAR(500) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX gallery_created_idx (created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audit_log (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  admin_id INT UNSIGNED NULL,
  action VARCHAR(80) NOT NULL,
  table_name VARCHAR(80) NOT NULL,
  record_id VARCHAR(120) NOT NULL,
  old_data JSON NULL,
  new_data JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT audit_admin_fk FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB;
