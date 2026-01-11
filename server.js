require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const bcryptjs = require('bcryptjs');
const { supabase, initializeDatabase } = require('./database');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? true  // Allow all origins in production for Vercel
  : ['http://localhost:3000', 'http://localhost:3001'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
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
initializeDatabase().catch(err => {
  console.error('Database initialization error:', err);
  process.exit(1);
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

    const { error } = await supabase.from('users').insert([{
      id: userId,
      email,
      password: hashedPassword,
      first_name: firstName,
      last_name: lastName,
      phone,
      emergency_contact_name: emergencyContactName,
      emergency_contact_phone: emergencyContactPhone,
      user_type: userType
    }]);

    if (error) throw error;

    res.status(201).json({ message: 'User created successfully', userId });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const { data: user, error } = await supabase.from('users').select('*').eq('email', email).single();
    
    if (error || !user || !bcryptjs.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({
      userId: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      userType: user.user_type
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

    const { error } = await supabase.from('tags').insert([{
      id: tagId,
      owner_id: ownerId,
      tag_code: tagCode,
      item_name: itemName,
      item_description: itemDescription
    }]);

    if (error) throw error;

    res.status(201).json({ tagId, tagCode, message: 'Tag created successfully' });
  } catch (error) {
    console.error('Tag creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/tags/:ownerId', async (req, res) => {
  try {
    const { data: tags, error } = await supabase
      .from('tags')
      .select('*')
      .eq('owner_id', req.params.ownerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Convert snake_case to camelCase
    const converted = (tags || []).map(tag => ({
      ...tag,
      itemName: tag.item_name,
      itemDescription: tag.item_description,
      tagCode: tag.tag_code,
      createdAt: tag.created_at,
      ownerId: tag.owner_id
    }));
    
    res.json(converted);
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

    const { error } = await supabase
      .from('tags')
      .update({ status })
      .eq('id', req.params.tagId);

    if (error) throw error;
    res.json({ message: 'Tag status updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============== TAG LOOKUP ENDPOINTS ==============

app.get('/api/tags/lookup/:tagCode', async (req, res) => {
  try {
    const { data: tag, error: tagError } = await supabase
      .from('tags')
      .select('*')
      .eq('tag_code', req.params.tagCode)
      .single();
    
    if (tagError || !tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    // Get owner information separately
    const { data: owner, error: ownerError } = await supabase
      .from('users')
      .select('*')
      .eq('id', tag.owner_id)
      .single();

    // Flatten the response with owner data
    const response = {
      id: tag.id,
      ownerId: tag.owner_id,
      itemName: tag.item_name,
      itemDescription: tag.item_description,
      tagCode: tag.tag_code,
      createdAt: tag.created_at,
      status: tag.status,
      email: owner?.email || '',
      phone: owner?.phone || '',
      firstName: owner?.first_name || 'Unknown',
      lastName: owner?.last_name || 'User',
      emergencyContactName: owner?.emergency_contact_name || '',
      emergencyContactPhone: owner?.emergency_contact_phone || ''
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============== LOCATION ENDPOINTS ==============

app.post('/api/locations/create', async (req, res) => {
  try {
    const { staffId, name, address, phone, latitude, longitude } = req.body;
    const locationId = uuidv4();

    const { error } = await supabase.from('locations').insert([{
      id: locationId,
      staff_id: staffId,
      name,
      address,
      phone,
      latitude,
      longitude
    }]);

    if (error) throw error;
    res.status(201).json({ locationId, message: 'Location created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/locations/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 5 } = req.query;
    
    // Use Supabase PostGIS distance calculation
    const { data: locations, error } = await supabase.rpc('nearby_locations', {
      user_lat: parseFloat(lat),
      user_lng: parseFloat(lng),
      distance_km: parseFloat(radius)
    });

    if (error) {
      // Fallback if RPC doesn't exist - fetch all and calculate client-side
      const { data: allLocs, error: fetchErr } = await supabase.from('locations').select('*');
      if (fetchErr) throw fetchErr;

      const locationsWithDistance = allLocs.map(loc => ({
        ...loc,
        distance: calculateDistance(lat, lng, loc.latitude, loc.longitude)
      })).filter(loc => loc.distance <= radius)
        .sort((a, b) => a.distance - b.distance);

      return res.json(locationsWithDistance);
    }

    res.json(locations || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to calculate distance
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ============== SCAN ENDPOINTS ==============

app.post('/api/scans/record', async (req, res) => {
  try {
    const { tagId, locationId, scannedBy } = req.body;
    const scanId = uuidv4();

    const { error: scanError } = await supabase.from('scans').insert([{
      id: scanId,
      tag_id: tagId,
      location_id: locationId,
      scanned_by: scannedBy
    }]);

    if (scanError) throw scanError;

    // Update tag status to found
    await supabase.from('tags').update({ status: 'found' }).eq('id', tagId);

    res.json({ scanId, message: 'Scan recorded successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/scans/:tagId', async (req, res) => {
  try {
    const { data: scans, error } = await supabase
      .from('scans')
      .select(`
        id,
        tag_id,
        location_id,
        scanned_at,
        scanned_by,
        locations:location_id (name),
        users:scanned_by (first_name, last_name)
      `)
      .eq('tag_id', req.params.tagId)
      .order('scanned_at', { ascending: false });

    if (error) throw error;

    // Flatten response
    const flattened = (scans || []).map(scan => ({
      ...scan,
      locationName: scan.locations?.[0]?.name || 'Unknown',
      firstName: scan.users?.[0]?.first_name || 'Unknown',
      lastName: scan.users?.[0]?.last_name || 'Staff'
    }));

    res.json(flattened);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============== MESSAGING ENDPOINTS ==============

app.post('/api/messages/send', async (req, res) => {
  try {
    const { fromUserId, toUserId, tagId, subject, message, sendEmail } = req.body;
    const messageId = uuidv4();

    const { error } = await supabase.from('messages').insert([{
      id: messageId,
      from_user_id: fromUserId,
      to_user_id: toUserId,
      tag_id: tagId,
      subject,
      message,
      email_sent: false
    }]);

    if (error) throw error;

    // Send email if requested
    if (sendEmail) {
      const { data: toUser } = await supabase.from('users').select('email').eq('id', toUserId).single();
      if (toUser) {
        try {
          await transporter.sendMail({
            from: process.env.EMAIL_USER || 'noreply@lostandfound.com',
            to: toUser.email,
            subject: `Lost & Found: ${subject}`,
            html: `<p>${message}</p>`
          });
          await supabase.from('messages').update({ email_sent: true }).eq('id', messageId);
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
    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        id,
        from_user_id,
        to_user_id,
        tag_id,
        subject,
        message,
        created_at,
        users:from_user_id (first_name, last_name),
        tags:tag_id (item_name)
      `)
      .eq('to_user_id', req.params.userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Flatten response
    const flattened = (messages || []).map(msg => ({
      ...msg,
      fromFirstName: msg.users?.[0]?.first_name || 'Unknown',
      fromLastName: msg.users?.[0]?.last_name || 'User',
      itemName: msg.tags?.[0]?.item_name || 'Item'
    }));

    res.json(flattened);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============== USER ENDPOINTS ==============

app.get('/api/users/:userId', async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, phone, emergency_contact_name, emergency_contact_phone, user_type')
      .eq('id', req.params.userId)
      .single();
    
    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============== STAFF ADMIN ENDPOINTS ==============

// Get all items with owner information
app.get('/api/admin/all-items', async (req, res) => {
  try {
    const { data: items, error } = await supabase
      .from('tags')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get all unique owner IDs
    const ownerIds = [...new Set((items || []).map(item => item.owner_id))];
    
    // Fetch all owner data
    const { data: owners } = await supabase
      .from('users')
      .select('*')
      .in('id', ownerIds);
    
    const ownerMap = {};
    (owners || []).forEach(owner => {
      ownerMap[owner.id] = owner;
    });

    // Flatten response with owner data
    const flattened = (items || []).map(item => {
      const owner = ownerMap[item.owner_id] || {};
      return {
        id: item.id,
        itemName: item.item_name,
        itemDescription: item.item_description,
        tagCode: item.tag_code,
        createdAt: item.created_at,
        status: item.status,
        ownerId: item.owner_id,
        firstName: owner.first_name || 'Unknown',
        lastName: owner.last_name || 'User',
        email: owner.email || '',
        phone: owner.phone || ''
      };
    });

    res.json(flattened);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Log status changes with notes
app.post('/api/admin/log-status-change', async (req, res) => {
  try {
    const { tagId, staffId, oldStatus, newStatus, notes } = req.body;
    const logId = uuidv4();

    const { error } = await supabase.from('status_changes').insert([{
      id: logId,
      tag_id: tagId,
      staff_id: staffId,
      old_status: oldStatus,
      new_status: newStatus,
      notes
    }]);

    if (error) throw error;
    res.json({ logId, message: 'Status change logged' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get item status change history
app.get('/api/admin/item-history/:tagId', async (req, res) => {
  try {
    const { data: history, error } = await supabase
      .from('status_changes')
      .select(`
        id,
        tag_id,
        staff_id,
        old_status,
        new_status,
        notes,
        changed_at,
        users:staff_id (first_name, last_name)
      `)
      .eq('tag_id', req.params.tagId)
      .order('changed_at', { ascending: false });

    if (error) throw error;

    // Flatten response
    const flattened = (history || []).map(item => ({
      ...item,
      firstName: item.users?.[0]?.first_name || 'Unknown',
      lastName: item.users?.[0]?.last_name || 'Staff'
    }));

    res.json(flattened);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get statistics dashboard
app.get('/api/admin/statistics', async (req, res) => {
  try {
    const { data: tags, error } = await supabase.from('tags').select('status');
    
    if (error) throw error;

    const stats = {
      totalItems: tags.length,
      foundItems: tags.filter(t => t.status === 'found').length,
      lostItems: tags.filter(t => t.status === 'lost').length,
      activeItems: tags.filter(t => t.status === 'active').length,
      pickedUpItems: tags.filter(t => t.status === 'picked-up').length
    };

    res.json(stats);
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
