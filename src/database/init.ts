  /**
   * Requêtes SQL de création des tables de la base locale et compatibles Supabase/Postgres.
   * Gestion multi-enfants : les champs children_ids sont des strings JSON (ex: '[1,2,3]')
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

  export const CREATE_LOGS_TABLE = `
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

  // --- TABLES DEFI / HISTORIQUE DEFI ---
  export const CREATE_DEFI_CUSTOM_TABLE = `
  CREATE TABLE IF NOT EXISTS defi_custom (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    family_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    location TEXT,
    duration_min INTEGER,
    points_default INTEGER,
    photo_required TEXT,
    age_min INTEGER,
    age_max INTEGER,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_synced INTEGER DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_defi_custom_family_id ON defi_custom(family_id);
  `;

  export const CREATE_SESSION_TABLE = `
  CREATE TABLE IF NOT EXISTS session (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    family_id INTEGER NOT NULL,
    children_ids TEXT,               -- JSON string des id enfants participants à la session
    started_at DATETIME NOT NULL,
    ended_at DATETIME,
    created_by TEXT,
    is_synced INTEGER DEFAULT 0,
    session_type TEXT,               -- ex: 'random' | 'bundle'
    category TEXT,                   -- ex: 'pédagogique' | 'ludique'
    location TEXT,                   -- ex: 'intérieur' | 'extérieur'
    planned_duration_min INTEGER,    -- ex: 15 / 30 / 60
    total_defis_completed INTEGER DEFAULT 0,
    total_korocoins_awarded INTEGER DEFAULT 0,

    FOREIGN KEY(family_id) REFERENCES family(id)
  );
  CREATE INDEX IF NOT EXISTS idx_session_family_id ON session(family_id);
  CREATE INDEX IF NOT EXISTS idx_session_started_at ON session(started_at);
  `;


  export const CREATE_DEFI_HISTORY_TABLE = `
  CREATE TABLE IF NOT EXISTS defi_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    defi_id TEXT NOT NULL,             -- UUID Supabase ou id local (toujours string pour la compat)
    family_id INTEGER NOT NULL,
    children_ids TEXT,                 -- JSON string des id enfants concernés
    session_id INTEGER,
    completed_at DATETIME NOT NULL,
    completed_by TEXT,
    is_synced INTEGER DEFAULT 0,
    FOREIGN KEY(family_id) REFERENCES family(id)
  );
  CREATE INDEX IF NOT EXISTS idx_defi_history_defi_id ON defi_history(defi_id);
  CREATE INDEX IF NOT EXISTS idx_defi_history_session_id ON defi_history(session_id); -- Ajout pour requêtes par session
  `;

  export const CREATE_REWARD_CUSTOM_TABLE = `
  CREATE TABLE IF NOT EXISTS reward_custom (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    family_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    cost INTEGER NOT NULL,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_synced INTEGER DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_reward_custom_family_id ON reward_custom(family_id);
  `;

  export const CREATE_REWARD_HISTORY_TABLE = `
  CREATE TABLE IF NOT EXISTS reward_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reward_id INTEGER NOT NULL,
    family_id INTEGER NOT NULL,
    children_ids TEXT,               -- JSON string des id enfants concernés
    session_id INTEGER,
    received_at DATETIME NOT NULL,
    received_by TEXT,
    is_synced INTEGER DEFAULT 0,
    FOREIGN KEY(reward_id) REFERENCES reward_custom(id),
    FOREIGN KEY(session_id) REFERENCES session(id),
    FOREIGN KEY(family_id) REFERENCES family(id)
  );
  CREATE INDEX IF NOT EXISTS idx_reward_history_reward_id ON reward_history(reward_id);
  CREATE INDEX IF NOT EXISTS idx_reward_history_session_id ON reward_history(session_id); -- Ajout pour requêtes par session
  `;


  export const CREATE_COINS_HISTORY_TABLE = `
  CREATE TABLE IF NOT EXISTS coins_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    family_id INTEGER NOT NULL,
    child_id INTEGER NOT NULL,
    session_id INTEGER,
    defi_id TEXT,                         -- pour lier à un défi validé si pertinent
    amount INTEGER NOT NULL,              -- positif = crédit ; négatif = débit
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    is_synced INTEGER DEFAULT 0,
    FOREIGN KEY(family_id) REFERENCES family(id),
    FOREIGN KEY(child_id) REFERENCES children(id),
    FOREIGN KEY(session_id) REFERENCES session(id)
  );
  CREATE INDEX IF NOT EXISTS idx_coins_family_child ON coins_history(family_id, child_id);
  CREATE INDEX IF NOT EXISTS idx_coins_session ON coins_history(session_id);
  `;

  /**
   * NOUVELLE TABLE : session_media
   * Métadonnées locales des médias capturés pendant une session.
   * Le fichier réel est stocké dans la galerie locale (chemin/URI dans file_uri).
   */
  export const CREATE_SESSION_MEDIA_TABLE = `
  CREATE TABLE IF NOT EXISTS session_media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    family_id INTEGER NOT NULL,
    child_ids TEXT,                      -- JSON string si médias liés à un sous-ensemble d'enfants
    file_uri TEXT NOT NULL,              -- ex: 'file:///storage/emulated/0/Pictures/Kokoroji/2025-08-04_142233.jpg'
    media_type TEXT DEFAULT 'photo',     -- 'photo' | 'video'
    taken_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT,                       -- JSON string: exif, dimensions, device model, etc.
    is_synced INTEGER DEFAULT 0,
    FOREIGN KEY(session_id) REFERENCES session(id),
    FOREIGN KEY(family_id) REFERENCES family(id)
  );
  CREATE INDEX IF NOT EXISTS idx_session_media_session ON session_media(session_id);
  CREATE INDEX IF NOT EXISTS idx_session_media_family ON session_media(family_id);
  `;

  /**
   * Tableau de toutes les requêtes de création de schéma à exécuter lors de l'initialisation.
   */
  export const DB_SCHEMA_QUERIES = [
    CREATE_FAMILY_TABLE,
    CREATE_CHILDREN_TABLE,
    CREATE_APP_FLAGS_TABLE,
    CREATE_LOGS_TABLE,
    CREATE_DEFI_CUSTOM_TABLE,
    CREATE_DEFI_HISTORY_TABLE,
    CREATE_REWARD_CUSTOM_TABLE,
    CREATE_REWARD_HISTORY_TABLE,
    CREATE_SESSION_TABLE,
    CREATE_COINS_HISTORY_TABLE,   // nouvelle table
    CREATE_SESSION_MEDIA_TABLE,
  ];
