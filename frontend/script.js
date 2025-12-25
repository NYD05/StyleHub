// DOM Elements
const uploadBtn = document.getElementById('uploadBtn');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const uploadModal = document.getElementById('uploadModal');
const loginModal = document.getElementById('loginModal');
const registerModal = document.getElementById('registerModal');
const sketchContainer = document.getElementById('sketchContainer');

// Close buttons
const closeButtons = document.querySelectorAll('.close');

// Home buttons
const homeButtons = document.querySelectorAll('.home-btn');

// Event Listeners
uploadBtn.addEventListener('click', () => {
    uploadModal.style.display = 'block';
});

loginBtn.addEventListener('click', () => {
    loginModal.style.display = 'block';
});

registerBtn.addEventListener('click', () => {
    registerModal.style.display = 'block';
});

// Close modals when clicking on X
closeButtons.forEach(button => {
    button.addEventListener('click', () => {
        uploadModal.style.display = 'none';
        loginModal.style.display = 'none';
        registerModal.style.display = 'none';
    });
});

// Close modals when clicking home button
homeButtons.forEach(button => {
    button.addEventListener('click', () => {
        uploadModal.style.display = 'none';
        loginModal.style.display = 'none';
        registerModal.style.display = 'none';
    });
});

// Close modals when clicking outside
window.addEventListener('click', (event) => {
    if (event.target === uploadModal) {
        uploadModal.style.display = 'none';
    }
    if (event.target === loginModal) {
        loginModal.style.display = 'none';
    }
    if (event.target === registerModal) {
        registerModal.style.display = 'none';
    }
});

// Form submissions
document.getElementById('uploadForm').addEventListener('submit', function(e) {
    e.preventDefault();
    uploadSketch();
});

document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    loginUser();
});

document.getElementById('registerForm').addEventListener('submit', function(e) {
    e.preventDefault();
    registerUser();
});

// Global variables
let currentUser = null;
let sessionToken = null;

// API Functions
const API_BASE_URL = 'https://stylehub-hd1p.onrender.com/api';

async function uploadSketch() {
    if (!sessionToken) {
        alert('Please log in first');
        return;
    }
    
    const title = document.getElementById('title').value;
    const description = document.getElementById('description').value;
    const fileInput = document.getElementById('sketchFile');
    
    if (!fileInput.files[0]) {
        alert('Please select a file');
        return;
    }
    
    const formData = new FormData();
    formData.append('sketch', fileInput.files[0]);
    formData.append('title', title);
    formData.append('description', description);
    
    try {
        const response = await fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            body: formData,
            headers: {
                'Authorization': sessionToken
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert('Sketch uploaded successfully!');
            uploadModal.style.display = 'none';
            document.getElementById('uploadForm').reset();
            loadSketches(); // Refresh the gallery
        } else {
            alert('Error uploading sketch: ' + result.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while uploading the sketch');
    }
}

async function loginUser() {
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            currentUser = username;
            sessionToken = result.session_token;
            alert('Login successful!');
            updateUIForLoggedInUser(username);
            loginModal.style.display = 'none';
            document.getElementById('loginForm').reset();
            loadSketches(); // Refresh gallery after login
        } else {
            alert('Login failed: ' + result.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred during login');
    }
}

async function registerUser() {
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert('Registration successful! Please log in.');
            registerModal.style.display = 'none';
            document.getElementById('registerForm').reset();
        } else {
            alert('Registration failed: ' + result.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred during registration');
    }
}

async function deleteSketch(sketchId) {
    if (!confirm('Are you sure you want to delete this sketch?')) {
        return;
    }
    
    if (!sessionToken) {
        alert('Please log in to delete sketches');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/sketches/${sketchId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': sessionToken
            }
        });
        
        if (response.ok) {
            alert('Sketch deleted successfully!');
            loadSketches(); // Refresh the gallery
        } else {
            const result = await response.json();
            alert('Error: ' + result.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while deleting the sketch');
    }
}

async function loadSketches() {
    try {
        const response = await fetch(`${API_BASE_URL}/sketches`);
        const sketches = await response.json();
        
        sketchContainer.innerHTML = '';
        
        // Only show sketches if user is logged in
        if (!sessionToken) {
            sketchContainer.innerHTML = '<p>Please log in to view sketches.</p>';
            return;
        }
        
        sketches.forEach(sketch => {
            const sketchCard = document.createElement('div');
            sketchCard.className = 'sketch-card';
            sketchCard.innerHTML = `
                <img src="${API_BASE_URL}/../uploads/${sketch.filename}" alt="${sketch.title}" class="sketch-image">
                <div class="sketch-info">
                    <h3>${sketch.title}</h3>
                    <p>${sketch.description || 'No description provided'}</p>
                    <div class="sketch-meta">
                        <span>By: ${sketch.artist}</span>
                        <span>${new Date(sketch.created_at).toLocaleDateString()}</span>
                    </div>
                    <div class="sketch-actions">
                        <button onclick="toggleLike(${sketch.id})">❤️ Like (${sketch.like_count || 0})</button>
                        <button onclick="viewComments(${sketch.id})">💬 Comments (${sketch.comment_count || 0})</button>
                        ${currentUser && currentUser === sketch.artist ? `<button onclick="deleteSketch(${sketch.id})">🗑️ Delete</button>` : ''}
                    </div>
                </div>
            `;
            sketchContainer.appendChild(sketchCard);
        });
    } catch (error) {
        console.error('Error loading sketches:', error);
        sketchContainer.innerHTML = '<p>Error loading sketches. Please try again later.</p>';
    }
}

// Like and Comment functionality
async function toggleLike(sketchId) {
    if (!sessionToken) {
        alert('Please log in to like sketches');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/sketches/${sketchId}/like`, {
            method: 'POST',
            headers: {
                'Authorization': sessionToken
            }
        });
        
        if (response.ok) {
            loadSketches(); // Refresh to show updated like count
        } else {
            const result = await response.json();
            alert('Error: ' + result.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while liking the sketch');
    }
}

function toggleComments(sketchId) {
    if (!sessionToken) {
        alert('Please log in to view/add comments');
        return;
    }
    viewComments(sketchId);
}

async function viewComments(sketchId) {
    try {
        const response = await fetch(`${API_BASE_URL}/sketches/${sketchId}/comments`);
        const comments = await response.json();
        
        if (comments.length === 0) {
            const addNew = confirm('No comments yet. Add one?');
            if (addNew) {
                const comment = prompt('Enter your comment:');
                if (comment) {
                    addComment(sketchId, comment);
                }
            }
        } else {
            let commentText = 'Comments:\n\n';
            comments.forEach(c => {
                commentText += `${c.username}: ${c.content}\n`;
            });
            commentText += '\n\nAdd a new comment?';
            
            const addNew = confirm(commentText);
            if (addNew) {
                const comment = prompt('Enter your comment:');
                if (comment) {
                    addComment(sketchId, comment);
                }
            }
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error loading comments');
    }
}

async function addComment(sketchId, comment) {
    try {
        const response = await fetch(`${API_BASE_URL}/sketches/${sketchId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': sessionToken
            },
            body: JSON.stringify({ content: comment })
        });
        
        if (response.ok) {
            alert('Comment added!');
            loadSketches(); // Refresh to show updated comment count
        } else {
            const result = await response.json();
            alert('Error: ' + result.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while adding comment');
    }
}

// UI Update Functions
function updateUIForLoggedInUser(username) {
    const authButtons = document.querySelector('nav');
    authButtons.innerHTML = `
        <span>Welcome, ${username}!</span>
        <button id="logoutBtn">Logout</button>
        <button id="uploadBtn">Upload Sketch</button>
    `;
    
    // Reattach event listeners
    document.getElementById('uploadBtn').addEventListener('click', () => {
        uploadModal.style.display = 'block';
    });
    
    document.getElementById('logoutBtn').addEventListener('click', logoutUser);
}

function logoutUser() {
    currentUser = null;
    sessionToken = null;
    
    const authButtons = document.querySelector('nav');
    authButtons.innerHTML = `
        <button id="uploadBtn">Upload Sketch</button>
        <button id="loginBtn">Login</button>
        <button id="registerBtn">Register</button>
    `;
    
    // Reattach event listeners
    document.getElementById('uploadBtn').addEventListener('click', () => {
        alert('Please log in to upload sketches');
    });
    
    document.getElementById('loginBtn').addEventListener('click', () => {
        loginModal.style.display = 'block';
    });
    
    document.getElementById('registerBtn').addEventListener('click', () => {
        registerModal.style.display = 'block';
    });
    
    // Automatically open login modal
    loginModal.style.display = 'block';
    
    // Refresh sketches to show 'log in to view' message
    loadSketches();
}

// Load sketches when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadSketches();
    
    // Set up initial event listeners
    document.getElementById('uploadBtn').addEventListener('click', () => {
        alert('Please log in to upload sketches');
    });
});