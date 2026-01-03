const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const bcryptjs = require('bcryptjs');
const { initializeDatabase, runAsync, getAsync, allAsync } = require('./database');
const nodemailer = require('nodemailer');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Email configuration (update with actual email service)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Initialize database
initializeDatabase().then(() => {
  console.log('Database initialized');
}).catch(err => {
  console.error('Database initialization error:', err);
});

// ============== AUTH ENDPOINTS ==============

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, emergencyContactName, emergencyContactPhone, userType } = req.body;
    
    if (!email || !password || !firstName || !lastName || !phone || !emergencyContactName || !emergencyContactPhone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const hashedPassword = bcryptjs.hashSync(password, 10);
    const userId = uuidv4();

    await runAsync(
      `INSERT INTO users (id, email, password, firstName, lastName, phone, emergencyContactName, emergencyContactPhone, userType)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, email, hashedPassword, firstName, lastName, phone, emergencyContactName, emergencyContactPhone, userType]
    );

    res.status(201).json({ message: 'User created successfully', userId });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await getAsync('SELECT * FROM users WHERE email = ?', [email]);
    
    if (!user || !bcryptjs.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      userType: user.userType
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============== TAG ENDPOINTS ==============

app.post('/api/tags/create', async (req, res) => {
  try {
    const { ownerId, itemName, itemDescription } = req.body;
    const tagId = uuidv4();
    const tagCode = Math.random().toString(36).substring(2, 15).toUpperCase();

    await runAsync(
      `INSERT INTO tags (id, ownerId, tagCode, itemName, itemDescription)
       VALUES (?, ?, ?, ?, ?)`,
      [tagId, ownerId, tagCode, itemName, itemDescription]
    );

    res.status(201).json({ tagId, tagCode, message: 'Tag created successfully' });
  } catch (error) {
    console.error('Tag creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/tags/:ownerId', async (req, res) => {
  try {
    const tags = await allAsync(
      'SELECT * FROM tags WHERE ownerId = ? ORDER BY createdAt DESC',
      [req.params.ownerId]
    );
    res.json(tags);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/tags/:tagId/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['active', 'lost', 'found', 'picked-up', 'discarded'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    await runAsync('UPDATE tags SET status = ? WHERE id = ?', [status, req.params.tagId]);
    res.json({ message: 'Tag status updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============== TAG LOOKUP ENDPOINTS ==============

app.get('/api/tags/lookup/:tagCode', async (req, res) => {
  try {
    const tag = await getAsync(
      `SELECT t.*, u.email, u.phone, u.firstName, u.lastName, u.emergencyContactName, u.emergencyContactPhone
       FROM tags t
       JOIN users u ON t.ownerId = u.id
       WHERE t.tagCode = ?`,
      [req.params.tagCode]
    );
    
    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    res.json(tag);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============== LOCATION ENDPOINTS ==============

app.post('/api/locations/create', async (req, res) => {
  try {
    const { staffId, name, address, phone, latitude, longitude } = req.body;
    const locationId = uuidv4();

    await runAsync(
      `INSERT INTO locations (id, staffId, name, address, phone, latitude, longitude)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [locationId, staffId, name, address, phone, latitude, longitude]
    );

    res.status(201).json({ locationId, message: 'Location created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/locations/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 5 } = req.query;
    
    const locations = await allAsync(`
      SELECT *, 
             (6371 * acos(cos(radians(?)) * cos(radians(latitude)) * 
             cos(radians(longitude) - radians(?)) + 
             sin(radians(?)) * sin(radians(latitude)))) AS distance
      FROM locations
      HAVING distance < ?
      ORDER BY distance ASC
    `, [lat, lng, lat, radius]);

    res.json(locations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============== SCAN ENDPOINTS ==============

app.post('/api/scans/record', async (req, res) => {
  try {
    const { tagId, locationId, scannedBy } = req.body;
    const scanId = uuidv4();

    await runAsync(
      `INSERT INTO scans (id, tagId, locationId, scannedBy)
       VALUES (?, ?, ?, ?)`,
      [scanId, tagId, locationId, scannedBy]
    );

    // Update tag status to found
    await runAsync('UPDATE tags SET status = ? WHERE id = ?', ['found', tagId]);

    res.json({ scanId, message: 'Scan recorded successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/scans/:tagId', async (req, res) => {
  try {
    const scans = await allAsync(
      `SELECT s.*, l.name as locationName, u.firstName, u.lastName
       FROM scans s
       LEFT JOIN locations l ON s.locationId = l.id
       LEFT JOIN users u ON s.scannedBy = u.id
       WHERE s.tagId = ?
       ORDER BY s.scannedAt DESC`,
      [req.params.tagId]
    );
    res.json(scans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============== MESSAGING ENDPOINTS ==============

app.post('/api/messages/send', async (req, res) => {
  try {
    const { fromUserId, toUserId, tagId, subject, message, sendEmail } = req.body;
    const messageId = uuidv4();

    await runAsync(
      `INSERT INTO messages (id, fromUserId, toUserId, tagId, subject, message, emailSent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [messageId, fromUserId, toUserId, tagId, subject, message, 0]
    );

    // Send email if requested
    if (sendEmail) {
      const toUser = await getAsync('SELECT email FROM users WHERE id = ?', [toUserId]);
      if (toUser) {
        try {
          await transporter.sendMail({
            from: process.env.EMAIL_USER || 'noreply@lostandfound.com',
            to: toUser.email,
            subject: `Lost & Found: ${subject}`,
            html: `<p>${message}</p>`
          });
          await runAsync('UPDATE messages SET emailSent = 1 WHERE id = ?', [messageId]);
        } catch (emailError) {
          console.error('Email sending error:', emailError);
        }
      }
    }

    res.json({ messageId, message: 'Message sent successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/messages/:userId', async (req, res) => {
  try {
    const messages = await allAsync(
      `SELECT m.*, 
              u1.firstName as fromFirstName, u1.lastName as fromLastName,
              t.itemName
       FROM messages m
       JOIN users u1 ON m.fromUserId = u1.id
       LEFT JOIN tags t ON m.tagId = t.id
       WHERE m.toUserId = ?
       ORDER BY m.createdAt DESC`,
      [req.params.userId]
    );
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============== USER ENDPOINTS ==============

app.get('/api/users/:userId', async (req, res) => {
  try {
    const user = await getAsync(
      'SELECT id, email, firstName, lastName, phone, emergencyContactName, emergencyContactPhone, userType FROM users WHERE id = ?',
      [req.params.userId]
    );
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Static pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'owner.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
