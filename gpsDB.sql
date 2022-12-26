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
    has_company TINYINT(1) NOT NULL,
    status TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

CREATE TABLE companies (
    id int NOT NULL AUTO_INCREMENT,
    user_id int NOT NULL, -- sera rempli si l'utilisateur a une entreprise (personne morale)
    company_name varchar(255) UNIQUE,
    company_address varchar(255),
    company_website varchar(255),
    company_description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE vehicles (
    id int NOT NULL AUTO_INCREMENT,
    user_id int DEFAULT NULL, -- sera rempli si l'utilisateur n'a pas d'entreprise (personne physique)
    company_id int DEFAULT NULL, -- sera rempli si l'utilisateur a une entreprise (personne morale)
    make varchar(50) NOT NULL,
    model varchar(50) NOT NULL,
    year SMALLINT(4) NOT NULL,
    mileage int NOT NULL,
    type varchar(15) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
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

