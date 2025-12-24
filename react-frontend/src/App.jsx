import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE_URL = 'http://localhost:5000/api';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [sessionToken, setSessionToken] = useState(null);
  const [sketches, setSketches] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [expandedSketch, setExpandedSketch] = useState(null);
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState({});
  
  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sketchFile, setSketchFile] = useState(null);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');

  // Load sketches on component mount
  useEffect(() => {
    loadSketches();
  }, []);

  // Toggle like for a sketch
  const toggleLike = async (sketchId) => {
    if (!sessionToken) {
      alert('Please log in to like sketches');
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/sketches/${sketchId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': sessionToken,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        loadSketches(); // Refresh the gallery
      } else {
        const result = await response.json();
        alert('Error: ' + result.error);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred while liking the sketch');
    }
  };

  // Toggle comments section
  const toggleComments = async (sketchId) => {
    if (expandedSketch === sketchId) {
      setExpandedSketch(null);
    } else {
      setExpandedSketch(sketchId);
      // Load comments for this sketch
      try {
        const response = await fetch(`${API_BASE_URL}/sketches/${sketchId}/comments`);
        const data = await response.json();
        if (response.ok) {
          setComments({...comments, [sketchId]: data});
        }
      } catch (error) {
        console.error('Error loading comments:', error);
      }
    }
  };

  // Add comment to a sketch
  const addComment = async (sketchId) => {
    if (!sessionToken) {
      alert('Please log in to comment');
      return;
    }
    
    const content = newComment[sketchId];
    if (!content) {
      alert('Please enter a comment');
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/sketches/${sketchId}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': sessionToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
      });
      
      if (response.ok) {
        // Clear the comment input
        setNewComment({...newComment, [sketchId]: ''});
        // Reload comments
        toggleComments(sketchId);
      } else {
        const result = await response.json();
        alert('Error: ' + result.error);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred while adding the comment');
    }
  };

  // API Functions
  const loadSketches = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/sketches`);
      const data = await response.json();
      setSketches(data);
    } catch (error) {
      console.error('Error loading sketches:', error);
    }
  };

  // Check if user has liked a sketch (simplified for demo)
  const userHasLiked = (sketchId) => {
    // In a real app, this would check against user's likes
    return false;
  };

  const uploadSketch = async (e) => {
    e.preventDefault();
    
    if (!sessionToken) {
      alert('Please log in first');
      return;
    }
    
    if (!sketchFile) {
      alert('Please select a file');
      return;
    }
    
    const formData = new FormData();
    formData.append('sketch', sketchFile);
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
        setShowUploadModal(false);
        setTitle('');
        setDescription('');
        setSketchFile(null);
        loadSketches(); // Refresh the gallery
      } else {
        alert('Error uploading sketch: ' + result.error);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred while uploading the sketch');
    }
  };

  const loginUser = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          username: loginUsername, 
          password: loginPassword 
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setCurrentUser(loginUsername);
        setSessionToken(result.session_token);
        alert('Login successful!');
        setShowLoginModal(false);
        setLoginUsername('');
        setLoginPassword('');
      } else {
        alert('Login failed: ' + result.error);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred during login');
    }
  };

  const registerUser = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          username: registerUsername, 
          email: registerEmail, 
          password: registerPassword 
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        alert('Registration successful! Please log in.');
        setShowRegisterModal(false);
        setRegisterUsername('');
        setRegisterEmail('');
        setRegisterPassword('');
      } else {
        alert('Registration failed: ' + result.error);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred during registration');
    }
  };

  const logoutUser = () => {
    setCurrentUser(null);
    setSessionToken(null);
  };

  return (
    <div className="App">
      <header>
        <div className="container">
          <h1>StyleHub</h1>
          <nav>
            {currentUser ? (
              <>
                <span>Welcome, {currentUser}!</span>
                <button onClick={() => setShowUploadModal(true)}>Upload Sketch</button>
                <button onClick={logoutUser}>Logout</button>
              </>
            ) : (
              <>
                <button onClick={() => setShowUploadModal(true)}>Upload Sketch</button>
                <button onClick={() => setShowLoginModal(true)}>Login</button>
                <button onClick={() => setShowRegisterModal(true)}>Register</button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        <section className="hero">
          <h2>Share Your Fashion Vision</h2>
          <p>Upload your sketches, discover inspiring designs from fellow fashion enthusiasts</p>
        </section>

        <section className="sketch-gallery">
          <h2>Latest Sketches</h2>
          <div className="sketch-grid">
            {sketches.map(sketch => (
              <div key={sketch.id} className="sketch-card">
                <img 
                  src={`http://localhost:5000/uploads/${sketch.filename}`} 
                  alt={sketch.title} 
                  className="sketch-image"
                />
                <div className="sketch-info">
                  <h3>{sketch.title}</h3>
                  <p>{sketch.description || 'No description provided'}</p>
                  <div className="sketch-meta">
                    <span>By: {sketch.artist}</span>
                    <span>{new Date(sketch.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="sketch-actions">
                    <button 
                      onClick={() => toggleLike(sketch.id)}
                      className={sketch.user_liked ? "liked" : ""}
                    >
                      ❤️ Like ({sketch.like_count || 0})
                    </button>
                    <button onClick={() => toggleComments(sketch.id)}>
                      💬 Comments ({sketch.comment_count || 0})
                    </button>
                  </div>
                  
                  {expandedSketch === sketch.id && (
                    <div className="comments-section">
                      <h4>Comments</h4>
                      <div className="comments-list">
                        {(comments[sketch.id] || []).map(comment => (
                          <div key={comment.id} className="comment">
                            <strong>{comment.author}</strong>
                            <p>{comment.content}</p>
                            <small>{new Date(comment.created_at).toLocaleString()}</small>
                          </div>
                        ))}
                      </div>
                      {sessionToken && (
                        <div className="add-comment">
                          <textarea 
                            placeholder="Add a comment..." 
                            value={newComment[sketch.id] || ''}
                            onChange={(e) => setNewComment({...newComment, [sketch.id]: e.target.value})}
                          />
                          <button onClick={() => addComment(sketch.id)}>Post</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal">
          <div className="modal-content">
            <span className="close" onClick={() => setShowUploadModal(false)}>&times;</span>
            <h2>Upload Your Sketch</h2>
            <form onSubmit={uploadSketch}>
              <input 
                type="text" 
                placeholder="Sketch Title" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required 
              />
              <textarea 
                placeholder="Description" 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <input 
                type="file" 
                accept="image/*" 
                onChange={(e) => setSketchFile(e.target.files[0])}
                required 
              />
              <button type="submit">Upload Sketch</button>
            </form>
          </div>
        </div>
      )}

      {/* Login Modal */}
      {showLoginModal && (
        <div className="modal">
          <div className="modal-content">
            <span className="close" onClick={() => setShowLoginModal(false)}>&times;</span>
            <h2>Login</h2>
            <form onSubmit={loginUser}>
              <input 
                type="text" 
                placeholder="Username" 
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                required 
              />
              <input 
                type="password" 
                placeholder="Password" 
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required 
              />
              <button type="submit">Login</button>
            </form>
          </div>
        </div>
      )}

      {/* Register Modal */}
      {showRegisterModal && (
        <div className="modal">
          <div className="modal-content">
            <span className="close" onClick={() => setShowRegisterModal(false)}>&times;</span>
            <h2>Register</h2>
            <form onSubmit={registerUser}>
              <input 
                type="text" 
                placeholder="Username" 
                value={registerUsername}
                onChange={(e) => setRegisterUsername(e.target.value)}
                required 
              />
              <input 
                type="email" 
                placeholder="Email" 
                value={registerEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
                required 
              />
              <input 
                type="password" 
                placeholder="Password" 
                value={registerPassword}
                onChange={(e) => setRegisterPassword(e.target.value)}
                required 
              />
              <button type="submit">Register</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;