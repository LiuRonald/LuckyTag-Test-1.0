// Global state
let currentUser = null;
let currentTagId = null;
let allTags = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showDashboard();
        loadTags();
        loadMessages();
    }
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
        
        localStorage.setItem('currentUser', JSON.stringify(user));
        currentUser = user;
        showDashboard();
        loadTags();
        loadMessages();
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
        userType: 'owner'
    };

    try {
        const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });

        if (!response.ok) throw new Error('Signup failed');
        
        alert('Account created! Please login.');
        switchTab('login');
        document.getElementById('loginEmail').value = userData.email;
    } catch (error) {
        alert('Signup failed: ' + error.message);
    }
}

function logout() {
    localStorage.removeItem('currentUser');
    currentUser = null;
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
    document.getElementById('navMenu').innerHTML = '';
}

function showDashboard() {
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('dashboardSection').style.display = 'block';
    document.getElementById('userName').textContent = currentUser.firstName + ' ' + currentUser.lastName;
    document.getElementById('userEmail').textContent = currentUser.email;
    document.getElementById('userPhone').textContent = currentUser.phone;
    document.getElementById('navMenu').innerHTML = '<a href="#" onclick="logout()">Logout</a>';
}

// Tag Functions
async function handleCreateTag(event) {
    event.preventDefault();
    const tagData = {
        ownerId: currentUser.userId,
        itemName: document.getElementById('itemName').value,
        itemDescription: document.getElementById('itemDescription').value
    };

    try {
        const response = await fetch('/api/tags/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tagData)
        });

        if (!response.ok) throw new Error('Failed to create tag');
        const tag = await response.json();
        
        const msgDiv = document.getElementById('tagCreatedMessage');
        msgDiv.innerHTML = `✅ Tag created successfully!<br><strong>Tag Code: ${tag.tagCode}</strong><br>Keep this code safe for NFC chip binding.`;
        msgDiv.style.display = 'block';
        
        event.target.reset();
        setTimeout(() => msgDiv.style.display = 'none', 5000);
        
        loadTags();
    } catch (error) {
        alert('Error creating tag: ' + error.message);
    }
}

async function loadTags() {
    try {
        const response = await fetch(`/api/tags/${currentUser.userId}`);
        allTags = await response.json();
        displayTags('all');
    } catch (error) {
        console.error('Error loading tags:', error);
    }
}

function filterTags(status) {
    displayTags(status);
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.toLowerCase().includes(status === 'all' ? 'all' : status));
    });
}

function displayTags(filter) {
    const tagsList = document.getElementById('tagsList');
    let filtered = allTags;

    if (filter !== 'all') {
        filtered = allTags.filter(tag => tag.status === filter);
    }

    if (filtered.length === 0) {
        tagsList.innerHTML = '<p class="empty-state">No tags found</p>';
        return;
    }

    tagsList.innerHTML = filtered.map(tag => `
        <div class="tag-card status-${tag.status}" onclick="openTagModal('${tag.id}')">
            <div class="tag-header">
                <h4>${tag.itemName}</h4>
                <span class="status-badge status-${tag.status}">${tag.status}</span>
            </div>
            <p class="tag-code">Code: <strong>${tag.tagCode}</strong></p>
            <p class="tag-desc">${tag.itemDescription || 'No description'}</p>
            <small class="tag-date">Created: ${new Date(tag.createdAt).toLocaleDateString()}</small>
        </div>
    `).join('');
}

async function openTagModal(tagId) {
    currentTagId = tagId;
    const tag = allTags.find(t => t.id === tagId);
    
    document.getElementById('modalTagName').textContent = tag.itemName;
    document.getElementById('modalTagDetails').innerHTML = `
        <p><strong>Code:</strong> ${tag.tagCode}</p>
        <p><strong>Description:</strong> ${tag.itemDescription || 'N/A'}</p>
        <p><strong>Status:</strong> ${tag.status}</p>
        <p><strong>Created:</strong> ${new Date(tag.createdAt).toLocaleDateString()}</p>
    `;
    
    document.getElementById('statusSelect').value = tag.status;
    
    // Load scan history
    try {
        const response = await fetch(`/api/scans/${tagId}`);
        const scans = await response.json();
        
        if (scans.length > 0) {
            document.getElementById('scanHistory').innerHTML = `
                <h4>Scan History</h4>
                <div class="history-list">
                    ${scans.map(scan => `
                        <div class="history-item">
                            <p><strong>${scan.locationName || 'Unknown Location'}</strong></p>
                            <p>Staff: ${scan.firstName} ${scan.lastName}</p>
                            <p>Found: ${new Date(scan.scannedAt).toLocaleString()}</p>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            document.getElementById('scanHistory').innerHTML = '<p>No scan history yet</p>';
        }
    } catch (error) {
        console.error('Error loading scan history:', error);
    }
    
    document.getElementById('tagModal').style.display = 'block';
}

function closeTagModal() {
    document.getElementById('tagModal').style.display = 'none';
    currentTagId = null;
}

async function updateTagStatus() {
    const status = document.getElementById('statusSelect').value;
    if (!status) return;

    try {
        const response = await fetch(`/api/tags/${currentTagId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });

        if (!response.ok) throw new Error('Failed to update status');
        alert('Status updated successfully');
        closeTagModal();
        loadTags();
    } catch (error) {
        alert('Error updating status: ' + error.message);
    }
}

// Messages Functions
async function loadMessages() {
    try {
        const response = await fetch(`/api/messages/${currentUser.userId}`);
        const messages = await response.json();
        displayMessages(messages);
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

function displayMessages(messages) {
    const messagesList = document.getElementById('messagesList');
    
    if (messages.length === 0) {
        messagesList.innerHTML = '<p class="empty-state">No messages yet</p>';
        return;
    }

    messagesList.innerHTML = messages.map(msg => `
        <div class="message-card">
            <div class="message-header">
                <h4>${msg.subject}</h4>
                <small>${new Date(msg.createdAt).toLocaleString()}</small>
            </div>
            <p><strong>From:</strong> ${msg.fromFirstName} ${msg.fromLastName}</p>
            ${msg.itemName ? `<p><strong>Item:</strong> ${msg.itemName}</p>` : ''}
            <p class="message-body">${msg.message}</p>
        </div>
    `).join('');
}

// Close modal when clicking outside
window.onclick = (event) => {
    const modal = document.getElementById('tagModal');
    if (event.target === modal) {
        closeTagModal();
    }
};
