const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

// Initialize database tables
function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          firstName TEXT NOT NULL,
          lastName TEXT NOT NULL,
          phone TEXT NOT NULL,
          emergencyContactName TEXT NOT NULL,
          emergencyContactPhone TEXT NOT NULL,
          userType TEXT CHECK(userType IN ('owner', 'staff')),
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // NFC Tags table
      db.run(`
        CREATE TABLE IF NOT EXISTS tags (
          id TEXT PRIMARY KEY,
          ownerId TEXT NOT NULL,
          tagCode TEXT UNIQUE NOT NULL,
          itemName TEXT NOT NULL,
          itemDescription TEXT,
          status TEXT DEFAULT 'active' CHECK(status IN ('active', 'lost', 'found', 'picked-up', 'discarded')),
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (ownerId) REFERENCES users(id)
        )
      `);

      // Locations table
      db.run(`
        CREATE TABLE IF NOT EXISTS locations (
          id TEXT PRIMARY KEY,
          staffId TEXT NOT NULL,
          name TEXT NOT NULL,
          address TEXT NOT NULL,
          phone TEXT NOT NULL,
          latitude REAL,
          longitude REAL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (staffId) REFERENCES users(id)
        )
      `);

      // Tag Scan History
      db.run(`
        CREATE TABLE IF NOT EXISTS scans (
          id TEXT PRIMARY KEY,
          tagId TEXT NOT NULL,
          locationId TEXT,
          scannedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          scannedBy TEXT,
          FOREIGN KEY (tagId) REFERENCES tags(id),
          FOREIGN KEY (locationId) REFERENCES locations(id),
          FOREIGN KEY (scannedBy) REFERENCES users(id)
        )
      `);

      // Messages table
      db.run(`
        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          fromUserId TEXT NOT NULL,
          toUserId TEXT NOT NULL,
          tagId TEXT,
          subject TEXT NOT NULL,
          message TEXT NOT NULL,
          emailSent BOOLEAN DEFAULT 0,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (fromUserId) REFERENCES users(id),
          FOREIGN KEY (toUserId) REFERENCES users(id),
          FOREIGN KEY (tagId) REFERENCES tags(id)
        )
      `, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });
}

// Helper functions
function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function getAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function allAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

module.exports = {
  db,
  initializeDatabase,
  runAsync,
  getAsync,
  allAsync
};
