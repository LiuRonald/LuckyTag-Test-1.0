// Global state
let currentUser = null;
let currentLocation = null;
let currentScannedItem = null;
let itemsFoundLog = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const savedUser = localStorage.getItem('staffUser');
    const savedLocation = localStorage.getItem('staffLocation');
    
    if (savedUser && savedLocation) {
        currentUser = JSON.parse(savedUser);
        currentLocation = JSON.parse(savedLocation);
        showDashboard();
        loadItemsLog();
    }
    
    // Auto-focus on scan input
    document.getElementById('scanTagInput').focus();
});

// Auth Functions
async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) throw new Error('Invalid credentials');
        const user = await response.json();
        
        if (user.userType !== 'staff') throw new Error('Staff credentials required');

        // Fetch user data to get location if needed
        const userDetails = await fetch(`/api/users/${user.userId}`).then(r => r.json());
        
        localStorage.setItem('staffUser', JSON.stringify(user));
        currentUser = user;
        
        // For demo, ask for location or load from storage
        const savedLocation = localStorage.getItem('staffLocation');
        if (savedLocation) {
            currentLocation = JSON.parse(savedLocation);
            showDashboard();
            loadItemsLog();
        } else {
            alert('Please register your location first');
            switchTab('signup');
        }
    } catch (error) {
        alert('Login failed: ' + error.message);
    }
}

async function handleSignup(event) {
    event.preventDefault();
    const userData = {
        email: document.getElementById('signupEmail').value,
        password: document.getElementById('signupPassword').value,
        firstName: document.getElementById('signupFirstName').value,
        lastName: document.getElementById('signupLastName').value,
        phone: document.getElementById('signupPhone').value,
        emergencyContactName: document.getElementById('emergencyName').value,
        emergencyContactPhone: document.getElementById('emergencyPhone').value,
        userType: 'staff'
    };

    const locationData = {
        name: document.getElementById('locationName').value,
        address: document.getElementById('locationAddress').value,
        phone: document.getElementById('locationPhone').value,
        latitude: document.getElementById('latitude').value || 0,
        longitude: document.getElementById('longitude').value || 0
    };

    try {
        // Create user account
        const userResponse = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });

        if (!userResponse.ok) throw new Error('Signup failed');
        const newUser = await userResponse.json();

        // Create location
        const locResponse = await fetch('/api/locations/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                staffId: newUser.userId,
                ...locationData
            })
        });

        if (!locResponse.ok) throw new Error('Location creation failed');
        const newLocation = await locResponse.json();

        alert('Registration successful! Please login with your email.');
        
        // Auto-fill login and switch tab
        document.getElementById('loginEmail').value = userData.email;
        switchTab('login');

    } catch (error) {
        alert('Registration failed: ' + error.message);
    }
}

function logout() {
    localStorage.removeItem('staffUser');
    localStorage.removeItem('staffLocation');
    currentUser = null;
    currentLocation = null;
    showAuth();
}

// UI Functions
function switchTab(tab) {
    document.getElementById('loginForm').classList.toggle('active', tab === 'login');
    document.getElementById('signupForm').classList.toggle('active', tab === 'signup');
    document.getElementById('loginTab').classList.toggle('active', tab === 'login');
    document.getElementById('signupTab').classList.toggle('active', tab === 'signup');
}

function showAuth() {
    document.getElementById('authSection').style.display = 'block';
    document.getElementById('dashboardSection').style.display = 'none';
}

function showDashboard() {
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('dashboardSection').style.display = 'block';
    document.getElementById('staffName').textContent = currentUser.firstName + ' ' + currentUser.lastName;
    
    if (currentLocation) {
        document.getElementById('locationTitle').textContent = currentLocation.name;
        document.getElementById('locationDetails').innerHTML = `
            <p>📍 ${currentLocation.address}</p>
            <p>📞 ${currentLocation.phone}</p>
        `;
    }
}

// Location Coordinates
function getLocationCoords() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                document.getElementById('latitude').value = position.coords.latitude;
                document.getElementById('longitude').value = position.coords.longitude;
                alert('Coordinates detected successfully!');
            },
            (error) => {
                alert('Unable to get location. Please enable GPS.');
            }
        );
    }
}

// Scan and Record Item
async function handleScanTag(event) {
    event.preventDefault();
    const tagCode = document.getElementById('scanTagInput').value.trim();

    if (!tagCode) {
        showScanMessage('Please scan or enter a tag code', 'error');
        return;
    }

    try {
        showScanMessage('Looking up item...', 'loading');

        // Lookup tag
        const tagResponse = await fetch(`/api/tags/lookup/${tagCode}`);
        if (!tagResponse.ok) throw new Error('Tag not found');
        const item = await tagResponse.json();

        // Record scan
        const scanResponse = await fetch('/api/scans/record', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tagId: item.id,
                locationId: currentLocation.id,
                scannedBy: currentUser.userId
            })
        });

        if (!scanResponse.ok) throw new Error('Failed to record scan');

        currentScannedItem = item;
        displayScannedItem(item);
        showScanMessage('✅ Item recorded successfully!', 'success');
        loadItemsLog();

    } catch (error) {
        showScanMessage('Error: ' + error.message, 'error');
    }

    document.getElementById('scanTagInput').value = '';
}

function displayScannedItem(item) {
    const details = document.getElementById('scannedItemDetails');
    details.innerHTML = `
        <div class="item-info">
            <h4>${item.itemName}</h4>
            <p><strong>Description:</strong> ${item.itemDescription || 'N/A'}</p>
            <p><strong>Tag Code:</strong> ${item.tagCode}</p>
            <p><strong>Status:</strong> <span class="status-badge">Found</span></p>
            <hr>
            <h5>Owner Information:</h5>
            <p><strong>Name:</strong> ${item.firstName} ${item.lastName}</p>
            <p>📧 <strong>Email:</strong> ${item.email}</p>
            <p>📱 <strong>Phone:</strong> ${item.phone}</p>
            <p><strong>Emergency Contact:</strong> ${item.emergencyContactName}</p>
            <p>📞 <strong>Phone:</strong> ${item.emergencyContactPhone}</p>
            <p class="info-text" style="margin-top: 15px;">⏰ Found at: ${currentLocation.name}, ${new Date().toLocaleString()}</p>
        </div>
    `;
    
    document.getElementById('itemDetailsSection').style.display = 'block';
}

function showScanMessage(message, type) {
    const msgDiv = document.getElementById('scanMessage');
    msgDiv.textContent = message;
    msgDiv.className = 'message ' + type;
    msgDiv.style.display = 'block';
    
    if (type !== 'loading') {
        setTimeout(() => msgDiv.style.display = 'none', 4000);
    }
}

// Notification Functions
function notifyOwner() {
    if (!currentScannedItem) return;
    document.getElementById('notifyModal').style.display = 'block';
}

function closeNotifyModal() {
    document.getElementById('notifyModal').style.display = 'none';
}

async function sendNotification(event) {
    event.preventDefault();
    
    if (!currentScannedItem) return;

    const subject = document.getElementById('notifySubject').value;
    const message = document.getElementById('notifyMessage').value;
    const sendEmail = document.getElementById('sendEmailCheck').checked;

    try {
        const response = await fetch('/api/messages/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fromUserId: currentUser.userId,
                toUserId: currentScannedItem.ownerId,
                tagId: currentScannedItem.id,
                subject: subject,
                message: message,
                sendEmail: sendEmail
            })
        });

        if (!response.ok) throw new Error('Failed to send notification');

        alert('✅ Notification sent to owner!');
        closeNotifyModal();
        resetScan();

    } catch (error) {
        alert('Error sending notification: ' + error.message);
    }
}

async function sendEmailToOwner() {
    if (!currentScannedItem) return;

    const subject = `Your item "${currentScannedItem.itemName}" has been found!`;
    const message = `Dear ${currentScannedItem.firstName},

Your item "${currentScannedItem.itemName}" has been found and is currently at:

${currentLocation.name}
${currentLocation.address}
Phone: ${currentLocation.phone}

Please contact the location to arrange pickup.

Best regards,
Lost & Found System`;

    try {
        const response = await fetch('/api/messages/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fromUserId: currentUser.userId,
                toUserId: currentScannedItem.ownerId,
                tagId: currentScannedItem.id,
                subject: subject,
                message: message,
                sendEmail: true
            })
        });

        if (!response.ok) throw new Error('Failed to send email');
        alert('✅ Email sent to owner!');
        resetScan();

    } catch (error) {
        alert('Error sending email: ' + error.message);
    }
}

function resetScan() {
    currentScannedItem = null;
    document.getElementById('itemDetailsSection').style.display = 'none';
    document.getElementById('scanTagInput').value = '';
    document.getElementById('scanTagInput').focus();
}

// Items Log
async function loadItemsLog() {
    // This would require a new endpoint to get items found at a location
    // For now, we'll show a placeholder
    const log = document.getElementById('itemsLog');
    log.innerHTML = `
        <div class="log-entry">
            <p class="info-text">Items found at this location will be logged here</p>
        </div>
    `;
}

// Close modal on outside click
window.onclick = (event) => {
    const modal = document.getElementById('notifyModal');
    if (event.target === modal) {
        closeNotifyModal();
    }
};
