// Current user and item data
let currentUser = null;
let currentTag = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    const userId = localStorage.getItem('userId');
    const userType = localStorage.getItem('userType');
    
    if (userId && userType === 'staff') {
        currentUser = {
            id: userId,
            firstName: localStorage.getItem('firstName'),
            lastName: localStorage.getItem('lastName'),
            email: localStorage.getItem('email')
        };
        showDashboard();
        loadAllItems();
    } else {
        showAuth();
    }
});

// ============== AUTH FUNCTIONS ==============

function switchTab(tab) {
    document.getElementById('loginForm').classList.toggle('active');
    document.getElementById('signupForm').classList.toggle('active');
    document.getElementById('loginTab').classList.toggle('active');
    document.getElementById('signupTab').classList.toggle('active');
}

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

        const data = await response.json();

        if (!response.ok) {
            alert('Login failed: ' + data.error);
            return;
        }

        if (data.userType !== 'staff') {
            alert('This account is not a staff account. Please use the appropriate login page.');
            return;
        }

        // Store user info
        localStorage.setItem('userId', data.userId);
        localStorage.setItem('firstName', data.firstName);
        localStorage.setItem('lastName', data.lastName);
        localStorage.setItem('email', data.email);
        localStorage.setItem('userType', data.userType);

        currentUser = data;
        showDashboard();
        loadAllItems();
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function handleSignup(event) {
    event.preventDefault();

    const firstName = document.getElementById('signupFirstName').value;
    const lastName = document.getElementById('signupLastName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const phone = document.getElementById('signupPhone').value;
    const emergencyContactName = document.getElementById('emergencyName').value;
    const emergencyContactPhone = document.getElementById('emergencyPhone').value;

    try {
        const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                password,
                firstName,
                lastName,
                phone,
                emergencyContactName,
                emergencyContactPhone,
                userType: 'staff'
            })
        });

        const data = await response.json();

        if (!response.ok) {
            alert('Signup failed: ' + data.error);
            return;
        }

        alert('Staff account created successfully! Please log in.');
        switchTab('login');
        document.getElementById('loginEmail').value = email;
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

function logout() {
    localStorage.clear();
    location.reload();
}

// ============== UI FUNCTIONS ==============

function showAuth() {
    document.getElementById('authSection').style.display = 'flex';
    document.getElementById('dashboardSection').style.display = 'none';
}

function showDashboard() {
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('dashboardSection').style.display = 'block';
    document.getElementById('staffName').textContent = `${currentUser.firstName} ${currentUser.lastName}`;
}

// ============== ITEM SEARCH & LOOKUP ==============

async function handleSearchTag(event) {
    event.preventDefault();

    const tagCode = document.getElementById('searchTagCode').value;
    const messageEl = document.getElementById('searchMessage');

    try {
        messageEl.style.display = 'none';

        const response = await fetch(`/api/tags/lookup/${tagCode}`);
        const data = await response.json();

        if (!response.ok) {
            messageEl.textContent = data.error || 'Tag not found';
            messageEl.className = 'message error';
            messageEl.style.display = 'block';
            document.getElementById('itemDetailsSection').style.display = 'none';
            document.getElementById('statusUpdateSection').style.display = 'none';
            document.getElementById('contactOwnerSection').style.display = 'none';
            document.getElementById('scanHistorySection').style.display = 'none';
            return;
        }

        currentTag = data;
        displayItemDetails(data);
        loadScanHistory(data.id);
        
        messageEl.textContent = 'Item found!';
        messageEl.className = 'message success';
        messageEl.style.display = 'block';
    } catch (error) {
        messageEl.textContent = 'Error: ' + error.message;
        messageEl.className = 'message error';
        messageEl.style.display = 'block';
    }
}

function displayItemDetails(tag) {
    const section = document.getElementById('itemDetailsSection');
    const content = document.getElementById('itemDetailsContent');

    const statusColor = getStatusColor(tag.status);
    
    content.innerHTML = `
        <div class="item-details-grid">
            <div class="detail-item">
                <label>Tag Code:</label>
                <p>${tag.tagCode}</p>
            </div>
            <div class="detail-item">
                <label>Item Name:</label>
                <p>${tag.itemName}</p>
            </div>
            <div class="detail-item">
                <label>Description:</label>
                <p>${tag.itemDescription || 'No description provided'}</p>
            </div>
            <div class="detail-item">
                <label>Current Status:</label>
                <p><span class="status-badge" style="background-color: ${statusColor}; color: white; padding: 4px 12px; border-radius: 4px;">${tag.status.toUpperCase()}</span></p>
            </div>
            <div class="detail-item">
                <label>Owner Name:</label>
                <p>${tag.firstName} ${tag.lastName}</p>
            </div>
            <div class="detail-item">
                <label>Owner Email:</label>
                <p><a href="mailto:${tag.email}">${tag.email}</a></p>
            </div>
            <div class="detail-item">
                <label>Owner Phone:</label>
                <p><a href="tel:${tag.phone}">${tag.phone}</a></p>
            </div>
            <div class="detail-item">
                <label>Emergency Contact:</label>
                <p>${tag.emergencyContactName} - ${tag.emergencyContactPhone}</p>
            </div>
            <div class="detail-item">
                <label>Created:</label>
                <p>${new Date(tag.createdAt).toLocaleString()}</p>
            </div>
        </div>
    `;

    section.style.display = 'block';
    document.getElementById('statusUpdateSection').style.display = 'block';
    document.getElementById('contactOwnerSection').style.display = 'block';
    displayOwnerContact(tag);
}

function getStatusColor(status) {
    const colors = {
        'active': '#3498db',
        'lost': '#e74c3c',
        'found': '#2ecc71',
        'picked-up': '#9b59b6',
        'discarded': '#95a5a6'
    };
    return colors[status] || '#3498db';
}

function displayOwnerContact(tag) {
    const content = document.getElementById('ownerContactInfo');
    content.innerHTML = `
        <div class="owner-info">
            <p><strong>${tag.firstName} ${tag.lastName}</strong></p>
            <p>Email: <a href="mailto:${tag.email}">${tag.email}</a></p>
            <p>Phone: <a href="tel:${tag.phone}">${tag.phone}</a></p>
            <p style="margin-top: 10px; font-size: 14px; color: #666;">Emergency Contact: ${tag.emergencyContactName} (${tag.emergencyContactPhone})</p>
        </div>
    `;
}

// ============== STATUS UPDATE ==============

async function handleStatusUpdate() {
    if (!currentTag) {
        alert('Please search for an item first');
        return;
    }

    const status = document.getElementById('statusSelect').value;
    const notes = document.getElementById('statusNotes').value;
    const messageEl = document.getElementById('statusMessage');

    if (!status) {
        messageEl.textContent = 'Please select a status';
        messageEl.className = 'message error';
        messageEl.style.display = 'block';
        return;
    }

    try {
        messageEl.style.display = 'none';

        const response = await fetch(`/api/tags/${currentTag.id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error);
        }

        // Update current tag status
        currentTag.status = status;

        // Log the status change
        if (notes) {
            await fetch(`/api/admin/log-status-change`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tagId: currentTag.id,
                    staffId: currentUser.id,
                    oldStatus: currentTag.status,
                    newStatus: status,
                    notes: notes
                })
            });
        }

        messageEl.textContent = 'Status updated successfully!';
        messageEl.className = 'message success';
        messageEl.style.display = 'block';

        // Refresh item details
        setTimeout(() => {
            document.getElementById('searchTagCode').value = currentTag.tagCode;
            handleSearchTag({ preventDefault: () => {} });
        }, 1000);

    } catch (error) {
        messageEl.textContent = 'Error: ' + error.message;
        messageEl.className = 'message error';
        messageEl.style.display = 'block';
    }
}

// ============== MESSAGING ==============

async function handleContactOwner() {
    if (!currentTag) {
        alert('Please search for an item first');
        return;
    }

    const subject = document.getElementById('messageSubject').value;
    const message = document.getElementById('messageContent').value;
    const sendEmail = document.getElementById('sendEmail').checked;
    const messageEl = document.getElementById('contactMessage');

    if (!subject || !message) {
        messageEl.textContent = 'Please fill in all fields';
        messageEl.className = 'message error';
        messageEl.style.display = 'block';
        return;
    }

    try {
        messageEl.style.display = 'none';

        const response = await fetch('/api/messages/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fromUserId: currentUser.id,
                toUserId: currentTag.ownerId,
                tagId: currentTag.id,
                subject: subject,
                message: message,
                sendEmail: sendEmail
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error);
        }

        messageEl.textContent = 'Message sent successfully!';
        messageEl.className = 'message success';
        messageEl.style.display = 'block';

        // Clear fields
        document.getElementById('messageSubject').value = '';
        document.getElementById('messageContent').value = '';

        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 3000);

    } catch (error) {
        messageEl.textContent = 'Error: ' + error.message;
        messageEl.className = 'message error';
        messageEl.style.display = 'block';
    }
}

// ============== SCAN HISTORY ==============

async function loadScanHistory(tagId) {
    try {
        const response = await fetch(`/api/scans/${tagId}`);
        const scans = await response.json();

        const section = document.getElementById('scanHistorySection');
        const content = document.getElementById('scanHistoryContent');

        if (scans.length === 0) {
            content.innerHTML = '<p style="text-align: center; color: #999;">No scan history yet</p>';
        } else {
            let html = '<div class="scans-list">';
            scans.forEach(scan => {
                const date = new Date(scan.scannedAt).toLocaleString();
                const location = scan.locationName || 'Unknown Location';
                const staff = scan.firstName ? `${scan.firstName} ${scan.lastName}` : 'Unknown Staff';
                
                html += `
                    <div class="scan-item">
                        <div class="scan-date">${date}</div>
                        <div class="scan-info">
                            <p><strong>Location:</strong> ${location}</p>
                            <p><strong>Scanned by:</strong> ${staff}</p>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            content.innerHTML = html;
        }

        section.style.display = 'block';
    } catch (error) {
        console.error('Error loading scan history:', error);
    }
}

// ============== ALL ITEMS LIST ==============

async function loadAllItems() {
    try {
        const loading = document.getElementById('allItemsLoading');
        loading.style.display = 'block';

        const response = await fetch('/api/admin/all-items');
        const items = await response.json();

        loading.style.display = 'none';
        const content = document.getElementById('allItemsContent');

        if (items.length === 0) {
            content.innerHTML = '<p style="text-align: center; color: #999;">No items in the system yet</p>';
            return;
        }

        let html = '<table class="items-table"><thead><tr><th>Tag Code</th><th>Item Name</th><th>Owner</th><th>Status</th><th>Created</th><th>Action</th></tr></thead><tbody>';

        items.forEach(item => {
            const statusColor = getStatusColor(item.status);
            const date = new Date(item.createdAt).toLocaleDateString();
            
            html += `
                <tr>
                    <td><code>${item.tagCode}</code></td>
                    <td>${item.itemName}</td>
                    <td>${item.firstName} ${item.lastName}</td>
                    <td><span class="status-badge" style="background-color: ${statusColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${item.status}</span></td>
                    <td>${date}</td>
                    <td><button onclick="quickSearch('${item.tagCode}')" class="btn-small">View</button></td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        content.innerHTML = html;
    } catch (error) {
        console.error('Error loading items:', error);
        document.getElementById('allItemsContent').innerHTML = '<p style="color: red;">Error loading items</p>';
    }
}

function quickSearch(tagCode) {
    document.getElementById('searchTagCode').value = tagCode;
    handleSearchTag({ preventDefault: () => {} });
    // Scroll to search section
    document.querySelector('.panel').scrollIntoView({ behavior: 'smooth' });
}
