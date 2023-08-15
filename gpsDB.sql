CREATE DATABASE gpsDB;

CREATE TABLE users (
    id int NOT NULL AUTO_INCREMENT,
    last_name varchar(255) NOT NULL,
    first_name varchar(255) NOT NULL,
    email varchar(255) NOT NULL UNIQUE,
    cin varchar(10) NOT NULL UNIQUE,
    address varchar(255) NOT NULL,
    city varchar(50) NOT NULL,
    postal_code varchar(50) NOT NULL,
    cell_phone varchar(15) NOT NULL UNIQUE,
    work_phone varchar(15) UNIQUE,
    password varchar(255) NOT NULL,
    status TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

CREATE TABLE settings (
    id int NOT NULL AUTO_INCREMENT,
    name varchar(255) NOT NULL,
    description varchar(400) NOT NULL,
    status TINYINT(1) DEFAULT 1,
    user_id int NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (id),
    UNIQUE KEY unique_setting_user (name, user_id)
    -- NB: Champ "user_id" utilisé ici pour vérifier si "settings or setting" est pour l'utilisateur actuel lors de la demande de récupération, également utilisé pour rendre les champs "name" et "user_id" uniques ensemble
);

CREATE TABLE rules (
    id int NOT NULL AUTO_INCREMENT,
    name varchar(255) NOT NULL,
    description varchar(400) DEFAULT NULL,
    type int NOT NULL, -- select : Geo zone (entré ou sortie) | Speed limit (km/h) | fuel consumption (L/j) | travel distance (Km/j)
    params TEXT DEFAULT NULL,
    value varchar(255) NOT NULL,
    user_id int NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (id),
    UNIQUE KEY unique_rule_user (name, user_id)
    -- NB: Champ "user_id" utilisé ici pour vérifier si "rules or rule" est pour l'utilisateur actuel lors de la demande de récupération, également utilisé pour rendre les champs "name" et "user_id" uniques ensemble
);

CREATE TABLE setting_rules (
    id int NOT NULL AUTO_INCREMENT,
    setting_id int NOT NULL,
    rule_id int NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (setting_id) REFERENCES settings(id) ON DELETE CASCADE,
    FOREIGN KEY (rule_id) REFERENCES rules(id) ON DELETE CASCADE,
    UNIQUE (setting_id, rule_id)
);

CREATE TABLE groupes (
    id int NOT NULL AUTO_INCREMENT,
    user_id int DEFAULT NULL,
    setting_id int DEFAULT NULL,
    name varchar(255) NOT NULL UNIQUE,
    description varchar(400) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (setting_id) REFERENCES settings(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (id)
);

CREATE TABLE vehicles (
    id int NOT NULL AUTO_INCREMENT,
    imei varchar(255) NOT NULL UNIQUE,
    groupe_id int DEFAULT NULL,
    make varchar(50) NOT NULL,
    model varchar(50) NOT NULL,
    year SMALLINT(4) NOT NULL,
    mileage int NOT NULL,
    type varchar(15) NOT NULL,
    registration_number varchar(15) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (groupe_id) REFERENCES groupes(id) ON DELETE CASCADE,
    PRIMARY KEY (id)
);

CREATE TABLE geo_parameters (
    id int NOT NULL AUTO_INCREMENT,
    user_id int NOT NULL,
    reference int NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE admins (
    id int NOT NULL AUTO_INCREMENT,
    last_name varchar(255) NOT NULL,
    first_name varchar(255) NOT NULL,
    email varchar(255) NOT NULL UNIQUE,
    password varchar(255) NOT NULL,
    roles TEXT,
    status TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);
