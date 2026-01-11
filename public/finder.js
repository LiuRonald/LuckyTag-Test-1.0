// Global state
let currentItem = null;
let currentLocation = null;
let userCoordinates = null;

// Focus on NFC input when page loads
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('nfcInput').focus();
    
    // Handle Enter key on NFC input
    document.getElementById('nfcInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleManualScan();
        }
    });

    // Handle Enter key on chat input
    document.getElementById('chatInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendChatMessage();
        }
    });
});

// NFC Scanner Functions
async function handleManualScan() {
    const tagCode = document.getElementById('nfcInput').value.trim();
    
    if (!tagCode) {
        showScanMessage('Please enter or scan a tag code', 'error');
        return;
    }

    try {
        showScanMessage('Scanning...', 'loading');
        const response = await fetch(`/api/tags/lookup/${tagCode}`);
        
        if (!response.ok) {
            showScanMessage('Tag not found. Please check the code and try again.', 'error');
            return;
        }

        currentItem = await response.json();
        displayItemFound();
        showScanMessage('Item found! 🎉', 'success');
        
        // Prompt to find locations
        setTimeout(() => {
            document.getElementById('locationSection').scrollIntoView({ behavior: 'smooth' });
        }, 1000);

    } catch (error) {
        showScanMessage('Error scanning tag: ' + error.message, 'error');
    }

    document.getElementById('nfcInput').value = '';
}

function displayItemFound() {
    const section = document.getElementById('itemFoundSection');
    const details = document.getElementById('itemDetails');
    
    details.innerHTML = `
        <div class="item-info">
            <h4>${currentItem.itemName}</h4>
            <p><strong>Description:</strong> ${currentItem.itemDescription || 'No description provided'}</p>
            <p><strong>Owner:</strong> ${currentItem.firstName} ${currentItem.lastName}</p>
            <p><strong>Status:</strong> <span class="status-badge status-${currentItem.status}">${currentItem.status}</span></p>
            <hr>
            <h5>Owner Contact Information:</h5>
            <p>📧 <strong>Email:</strong> ${currentItem.email}</p>
            <p>📱 <strong>Phone:</strong> ${currentItem.phone}</p>
            <p><strong>Emergency Contact:</strong> ${currentItem.emergencyContactName}</p>
            <p>📞 <strong>Emergency Phone:</strong> ${currentItem.emergencyContactPhone}</p>
            <p class="info-text" style="margin-top: 15px;">
                ℹ️ You can contact the owner directly or report this item to a nearby drop-off location below.
            </p>
        </div>
    `;
    
    section.style.display = 'block';
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

// Location Functions
function getCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userCoordinates = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                document.getElementById('addressInput').value = `${userCoordinates.lat.toFixed(4)}, ${userCoordinates.lng.toFixed(4)}`;
                findLocations();
            },
            (error) => {
                showLocationMessage('Unable to get your location. Please enable location services.', 'error');
            }
        );
    } else {
        showLocationMessage('Geolocation not supported by your browser.', 'error');
    }
}

async function findLocations() {
    const address = document.getElementById('addressInput').value.trim();
    const radius = document.getElementById('radiusInput').value;

    if (!address && !userCoordinates) {
        showLocationMessage('Please enter an address or use current location', 'error');
        return;
    }

    try {
        showLocationMessage('Finding nearby locations...', 'loading');

        // If we have coordinates, use them directly
        let lat, lng;
        if (userCoordinates) {
            lat = userCoordinates.lat;
            lng = userCoordinates.lng;
        } else {
            // Otherwise, use geocoding (simplified for demo)
            showLocationMessage('Please use current location or enter coordinates', 'info');
            return;
        }

        const response = await fetch(`/api/locations/nearby?lat=${lat}&lng=${lng}&radius=${radius}`);
        const data = await response.json();

        // Check if response contains an error
        if (!response.ok || data.error) {
            showLocationMessage('Error finding locations: ' + (data.error || 'Unknown error'), 'error');
            return;
        }

        // Ensure data is an array
        const locations = Array.isArray(data) ? data : [];

        if (locations.length === 0) {
            showLocationMessage(`No locations found within ${radius}km`, 'info');
            return;
        }

        displayLocations(locations);
        document.getElementById('locationsSection').style.display = 'block';
        showLocationMessage(`Found ${locations.length} locations nearby!`, 'success');

    } catch (error) {
        showLocationMessage('Error finding locations: ' + error.message, 'error');
    }
}

function displayLocations(locations) {
    const list = document.getElementById('locationsList');
    
    list.innerHTML = locations.map(loc => `
        <div class="location-card" onclick="openLocationModal('${loc.id}')">
            <h4>${loc.name}</h4>
            <p>📍 ${loc.address}</p>
            <p>📞 ${loc.phone}</p>
            <p class="distance">${(loc.distance || 0).toFixed(1)}km away</p>
        </div>
    `).join('');
}

function openLocationModal(locationId) {
    const location = document.querySelector(`[data-id="${locationId}"]`);
    const list = document.getElementById('locationsList');
    const card = Array.from(list.children).find(el => el.onclick && el.onclick.toString().includes(locationId));
    
    // Get full location data
    const locName = card.querySelector('h4').textContent;
    const locAddress = card.querySelector('p').textContent.replace('📍 ', '');
    const locPhone = card.querySelectorAll('p')[1].textContent.replace('📞 ', '');
    
    currentLocation = { id: locationId, name: locName, address: locAddress, phone: locPhone };
    
    document.getElementById('locationDetail').innerHTML = `
        <h3>${locName}</h3>
        <p><strong>Address:</strong> ${locAddress}</p>
        <p><strong>Phone:</strong> ${locPhone}</p>
        <p class="info-text">You can drop off this item here or contact the location to arrange pickup.</p>
    `;
    
    document.getElementById('locationModal').style.display = 'block';
}

function closeLocationModal() {
    document.getElementById('locationModal').style.display = 'none';
}

function openDirections() {
    if (currentLocation) {
        const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(currentLocation.address)}`;
        window.open(mapsUrl, '_blank');
    }
}

function contactLocation() {
    if (currentLocation) {
        const phone = currentLocation.phone.replace(/\D/g, '');
        window.location.href = `tel:${phone}`;
    }
}

function showLocationMessage(message, type) {
    const msgDiv = document.getElementById('locationMessage');
    msgDiv.textContent = message;
    msgDiv.className = 'message ' + type;
    msgDiv.style.display = 'block';
    
    if (type !== 'loading') {
        setTimeout(() => msgDiv.style.display = 'none', 4000);
    }
}

// Chatbot Functions
const chatbotResponses = {
    'hi': 'Hello! I\'m your Lost & Found assistant. How can I help you find what you\'re looking for?',
    'hello': 'Hello! I\'m your Lost & Found assistant. How can I help you find what you\'re looking for?',
    'help': 'I can help you: 1) Find locations to drop off items, 2) Get directions to nearby locations, 3) Contact location staff',
    'locations': 'Use the location finder above to search for nearby drop-off locations based on your current address or GPS location.',
    'scan': 'To scan an NFC tag, place your phone\'s NFC reader near the tag. The tag code will appear in the input field at the top.',
    'contact': 'You can contact location staff directly by clicking the contact button on the location card, or reach out to the item owner if found.',
    'how': 'Place your phone\'s NFC reader near an item\'s tag to scan it. The system will show you the item details and nearby drop-off locations.',
    'thanks': 'You\'re welcome! Is there anything else I can help with?',
    'bye': 'Thank you for using Lost & Found! Have a great day!'
};

function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message) return;

    // Display user message
    addChatMessage(message, 'user');
    input.value = '';

    // Get bot response
    const response = getBotResponse(message);
    setTimeout(() => {
        addChatMessage(response, 'bot');
    }, 300);
}

function addChatMessage(text, sender) {
    const messagesContainer = document.querySelector('.chat-messages');
    const msgDiv = document.createElement('div');
    msgDiv.className = `message-${sender}`;
    msgDiv.innerHTML = `<p>${escapeHtml(text)}</p>`;
    messagesContainer.appendChild(msgDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function getBotResponse(message) {
    const lower = message.toLowerCase();
    
    for (const [key, response] of Object.entries(chatbotResponses)) {
        if (lower.includes(key)) {
            return response;
        }
    }
    
    return 'I\'m not sure I understood that. Try asking me about locations, scanning, or how to use the system.';
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Close modal on outside click
window.onclick = (event) => {
    const modal = document.getElementById('locationModal');
    if (event.target === modal) {
        closeLocationModal();
    }
};
