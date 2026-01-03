# Lost & Found NFC Tag System

A comprehensive web-based lost and found system using NFC tags to help owners track their items and finders return them to designated locations.

## Features

### Owner Dashboard
- User registration with email, phone number, personal info, and emergency contact
- User login
- Purchase and register NFC tags
- Manage tag status (active, lost, found, picked-up, discarded)
- View all tags and their details
- Receive notifications when items are found
- View scan history and messages

### Finder Page
- Scan NFC tags to identify lost items
- View item owner information
- Find nearby drop-off locations based on current location or entered address
- Interactive chatbot for assistance
- Directions to locations

### Location Staff Dashboard
- Staff registration with location information
- Staff login
- Scan found items and record them
- View item owner contact information
- Notify owners via in-system messaging
- Send emails to owners about found items
- Auto-logging of scan time, tag, and location

## Technology Stack
- **Backend**: Node.js with Express.js
- **Database**: SQLite3
- **Frontend**: Vanilla HTML, CSS, and JavaScript
- **Email**: Nodemailer
- **Location Services**: Geolocation API

## Installation

1. **Clone or extract the project**
   ```bash
   cd "Ronald's App"
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure email (optional)**
   - Update the email configuration in `server.js` if you want to enable email notifications
   - Set `EMAIL_USER` and `EMAIL_PASS` environment variables

4. **Start the server**
   ```bash
   npm start
   ```
   
   The server will run on `http://localhost:3000`

## Usage

### Owner
1. Go to `http://localhost:3000` (Owner Dashboard)
2. Sign up with email, phone, and emergency contact
3. Create tags for your items
4. Manage your tags and track their status
5. Receive notifications when items are found

### Finder
1. Go to `http://localhost:3000/finder.html`
2. Scan an NFC tag or enter the tag code
3. View the item owner's information
4. Find nearby drop-off locations
5. Use the chatbot for help or contact the owner directly

### Location Staff
1. Go to `http://localhost:3000/staff.html`
2. Register your location with your information
3. Log in
4. Scan items when they're brought in
5. Notify owners and send emails
6. Track found items at your location

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register a new user
- `POST /api/auth/login` - User login

### Tags
- `POST /api/tags/create` - Create a new tag
- `GET /api/tags/:ownerId` - Get all tags for an owner
- `PUT /api/tags/:tagId/status` - Update tag status
- `GET /api/tags/lookup/:tagCode` - Look up item info by tag code

### Locations
- `POST /api/locations/create` - Create a new location
- `GET /api/locations/nearby` - Find nearby locations

### Scans
- `POST /api/scans/record` - Record a scan event
- `GET /api/scans/:tagId` - Get scan history for a tag

### Messages
- `POST /api/messages/send` - Send a message/notification
- `GET /api/messages/:userId` - Get messages for a user

## Database Schema

### Users
- id, email, password, firstName, lastName, phone, emergencyContactName, emergencyContactPhone, userType

### Tags
- id, ownerId, tagCode, itemName, itemDescription, status, createdAt

### Locations
- id, staffId, name, address, phone, latitude, longitude, createdAt

### Scans
- id, tagId, locationId, scannedAt, scannedBy

### Messages
- id, fromUserId, toUserId, tagId, subject, message, emailSent, createdAt

## Security Notes
- Passwords are hashed using bcryptjs
- Consider adding authentication tokens (JWT) for production
- Implement HTTPS for production
- Add input validation and sanitization
- Implement rate limiting

## Future Enhancements
- Real NFC hardware integration
- Mobile app development
- Advanced location search with maps integration
- Email template customization
- SMS notifications
- Analytics dashboard
- Item categories and filtering
- Item images/photos
- Reward system for returning items

## Support
For issues or questions, please refer to the inline documentation in the code.

## License
© 2026 Lost & Found System. All rights reserved.
