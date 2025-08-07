/**
 * Requêtes SQL de création des tables de la base locale.
 * Chaque constante correspond à une table métier de l'application Kokoroji.
 */
export const CREATE_FAMILY_TABLE = `
CREATE TABLE IF NOT EXISTS family (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  parent_name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

export const CREATE_CHILDREN_TABLE = `
CREATE TABLE IF NOT EXISTS children (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  birthdate TEXT NOT NULL,
  avatar TEXT,
  korocoins INTEGER DEFAULT 0, 
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(family_id) REFERENCES family(id)
);
CREATE INDEX IF NOT EXISTS idx_children_family_id ON children(family_id);
`;

export const CREATE_APP_FLAGS_TABLE = `
CREATE TABLE IF NOT EXISTS app_flags (
  key TEXT PRIMARY KEY,
  value TEXT
);
`;

const CREATE_LOGS_TABLE = `
  CREATE TABLE IF NOT EXISTS app_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    family_id TEXT NOT NULL,
    child_ids TEXT,
    log_type TEXT NOT NULL,
    level TEXT NOT NULL,
    context TEXT,
    details TEXT,
    ref_id TEXT,
    is_synced INTEGER DEFAULT 0,
    device_info TEXT
  );
`;


/**
 * Tableau de toutes les requêtes de création de schéma à exécuter lors de l'initialisation.
 */
export const DB_SCHEMA_QUERIES = [
  CREATE_FAMILY_TABLE,
  CREATE_CHILDREN_TABLE,
  CREATE_APP_FLAGS_TABLE,
  CREATE_LOGS_TABLE,
];
