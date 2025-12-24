from flask import Flask, request, jsonify, send_from_directory
import os
from werkzeug.utils import secure_filename
import sqlite3
import hashlib
import secrets
from datetime import datetime, timedelta
from functools import wraps

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
app.config['SECRET_KEY'] = 'your-secret-key-here'

# In a production environment, use a proper secret key
# app.config['SECRET_KEY'] = secrets.token_hex(16)

# Create uploads directory if it doesn't exist
if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

# Initialize database
def init_db():
    conn = sqlite3.connect('stylehub.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS users
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  username TEXT UNIQUE NOT NULL,
                  email TEXT UNIQUE NOT NULL,
                  password_hash TEXT NOT NULL,
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS sketches
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  title TEXT NOT NULL,
                  description TEXT,
                  filename TEXT NOT NULL,
                  user_id INTEGER,
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                  FOREIGN KEY (user_id) REFERENCES users (id))''')
    
    # Create sessions table for user authentication
    c.execute('''CREATE TABLE IF NOT EXISTS sessions
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  session_token TEXT UNIQUE NOT NULL,
                  user_id INTEGER NOT NULL,
                  expires_at TIMESTAMP NOT NULL,
                  FOREIGN KEY (user_id) REFERENCES users (id))''')
    
    # Create likes table
    c.execute('''CREATE TABLE IF NOT EXISTS likes
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  user_id INTEGER NOT NULL,
                  sketch_id INTEGER NOT NULL,
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                  FOREIGN KEY (user_id) REFERENCES users (id),
                  FOREIGN KEY (sketch_id) REFERENCES sketches (id),
                  UNIQUE(user_id, sketch_id))''')
    
    # Create comments table
    c.execute('''CREATE TABLE IF NOT EXISTS comments
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  content TEXT NOT NULL,
                  user_id INTEGER NOT NULL,
                  sketch_id INTEGER NOT NULL,
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                  FOREIGN KEY (user_id) REFERENCES users (id),
                  FOREIGN KEY (sketch_id) REFERENCES sketches (id))''')
    
    conn.commit()
    conn.close()

# Hash password
def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

# Generate session token
def generate_session_token():
    return secrets.token_hex(32)

# Authentication decorator
def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        session_token = request.headers.get('Authorization')
        if not session_token:
            return jsonify({'error': 'Missing authorization token'}), 401
        
        conn = sqlite3.connect('stylehub.db')
        c = conn.cursor()
        c.execute("SELECT user_id FROM sessions WHERE session_token=? AND expires_at > datetime('now')", (session_token,))
        session = c.fetchone()
        conn.close()
        
        if not session:
            return jsonify({'error': 'Invalid or expired session'}), 401
        
        # Add user_id to request context
        request.user_id = session[0]
        return f(*args, **kwargs)
    return decorated_function

# Routes
@app.route('/app')
def serve_frontend():
    return send_from_directory(os.path.join(app.root_path, '../frontend'), 'index.html')

@app.route('/<path:filename>')
def serve_static_files(filename):
    frontend_path = os.path.join(app.root_path, '../frontend')
    try:
        return send_from_directory(frontend_path, filename)
    except FileNotFoundError:
        # If file not found, return the main app
        if filename.endswith('.html') or '.' not in filename:
            return send_from_directory(frontend_path, 'index.html')
        else:
            # Return 404 for missing assets
            return '', 404
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    
    if not username or not email or not password:
        return jsonify({'error': 'Username, email, and password are required'}), 400
    
    # Hash the password
    password_hash = hash_password(password)
    
    try:
        conn = sqlite3.connect('stylehub.db')
        c = conn.cursor()
        c.execute("INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
                  (username, email, password_hash))
        conn.commit()
        conn.close()
        return jsonify({"message": "User registered successfully"}), 201
    except sqlite3.IntegrityError as e:
        if 'username' in str(e).lower():
            return jsonify({'error': 'Username already exists'}), 400
        elif 'email' in str(e).lower():
            return jsonify({'error': 'Email already exists'}), 400
        else:
            return jsonify({'error': 'Registration failed'}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'error': 'Username and password are required'}), 400
    
    # Hash the password for comparison
    password_hash = hash_password(password)
    
    conn = sqlite3.connect('stylehub.db')
    c = conn.cursor()
    c.execute("SELECT id FROM users WHERE username=? AND password_hash=?", (username, password_hash))
    user = c.fetchone()
    conn.close()
    
    if user:
        # Create session
        session_token = generate_session_token()
        expires_at = datetime.now() + timedelta(hours=24)  # Session expires in 24 hours
        
        conn = sqlite3.connect('stylehub.db')
        c = conn.cursor()
        c.execute("INSERT INTO sessions (session_token, user_id, expires_at) VALUES (?, ?, ?)",
                  (session_token, user[0], expires_at))
        conn.commit()
        conn.close()
        
        return jsonify({
            "message": "Login successful", 
            "user_id": user[0],
            "session_token": session_token
        }), 200
    else:
        return jsonify({"error": "Invalid credentials"}), 401

@app.route('/api/upload', methods=['POST'])
@require_auth
def upload_sketch():
    if 'sketch' not in request.files:
        return jsonify({"error": "No file provided"}), 400
    
    file = request.files['sketch']
    title = request.form.get('title', '')
    description = request.form.get('description', '')
    user_id = request.user_id  # Get user_id from authenticated session
    
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    
    # Validate file type
    allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
    file_extension = file.filename.rsplit('.', 1)[1].lower()
    if file_extension not in allowed_extensions:
        return jsonify({"error": "Invalid file type. Allowed: png, jpg, jpeg, gif, webp"}), 400
    
    if file:
        filename = secure_filename(file.filename)
        # Add timestamp to filename to avoid conflicts
        name, ext = os.path.splitext(filename)
        filename = f"{name}_{int(datetime.now().timestamp())}{ext}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        # Save to database
        conn = sqlite3.connect('stylehub.db')
        c = conn.cursor()
        c.execute("INSERT INTO sketches (title, description, filename, user_id) VALUES (?, ?, ?, ?)",
                  (title, description, filename, user_id))
        sketch_id = c.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({
            "message": "Sketch uploaded successfully", 
            "sketch_id": sketch_id,
            "filename": filename
        }), 201

@app.route('/api/sketches', methods=['GET'])
def get_sketches():
    conn = sqlite3.connect('stylehub.db')
    c = conn.cursor()
    c.execute("""SELECT s.id, s.title, s.description, s.filename, s.created_at, u.username,
                 (SELECT COUNT(*) FROM likes WHERE sketch_id = s.id) as like_count,
                 (SELECT COUNT(*) FROM comments WHERE sketch_id = s.id) as comment_count
                 FROM sketches s 
                 JOIN users u ON s.user_id = u.id 
                 ORDER BY s.created_at DESC""")
    sketches = c.fetchall()
    conn.close()
    
    sketches_list = []
    for sketch in sketches:
        sketches_list.append({
            "id": sketch[0],
            "title": sketch[1],
            "description": sketch[2],
            "filename": sketch[3],
            "created_at": sketch[4],
            "artist": sketch[5],
            "like_count": sketch[6],
            "comment_count": sketch[7]
        })
    
    return jsonify(sketches_list)

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/api/sketches/<int:sketch_id>/like', methods=['POST'])
@require_auth
def like_sketch(sketch_id):
    user_id = request.user_id
    
    try:
        conn = sqlite3.connect('stylehub.db')
        c = conn.cursor()
        
        # Check if already liked
        c.execute("SELECT id FROM likes WHERE user_id=? AND sketch_id=?", (user_id, sketch_id))
        existing_like = c.fetchone()
        
        if existing_like:
            # Unlike
            c.execute("DELETE FROM likes WHERE user_id=? AND sketch_id=?", (user_id, sketch_id))
            action = "unliked"
        else:
            # Like
            c.execute("INSERT INTO likes (user_id, sketch_id) VALUES (?, ?)", (user_id, sketch_id))
            action = "liked"
        
        conn.commit()
        conn.close()
        
        return jsonify({"message": f"Sketch {action} successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/sketches/<int:sketch_id>/comments', methods=['POST'])
@require_auth
def add_comment(sketch_id):
    user_id = request.user_id
    data = request.get_json()
    content = data.get('content', '')
    
    if not content:
        return jsonify({"error": "Comment content is required"}), 400
    
    try:
        conn = sqlite3.connect('stylehub.db')
        c = conn.cursor()
        c.execute("INSERT INTO comments (content, user_id, sketch_id) VALUES (?, ?, ?)", 
                  (content, user_id, sketch_id))
        comment_id = c.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({
            "message": "Comment added successfully",
            "comment_id": comment_id
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/sketches/<int:sketch_id>/comments', methods=['GET'])
def get_comments(sketch_id):
    try:
        conn = sqlite3.connect('stylehub.db')
        c = conn.cursor()
        c.execute("""SELECT c.id, c.content, c.created_at, u.username 
                     FROM comments c 
                     JOIN users u ON c.user_id = u.id 
                     WHERE c.sketch_id = ? 
                     ORDER BY c.created_at ASC""", (sketch_id,))
        comments = c.fetchall()
        conn.close()
        
        comments_list = []
        for comment in comments:
            comments_list.append({
                "id": comment[0],
                "content": comment[1],
                "created_at": comment[2],
                "author": comment[3]
            })
        
        return jsonify(comments_list), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/sketches/<int:sketch_id>', methods=['DELETE'])
@require_auth
def delete_sketch(sketch_id):
    user_id = request.user_id
    
    try:
        conn = sqlite3.connect('stylehub.db')
        c = conn.cursor()
        
        # Check if user owns this sketch
        c.execute("SELECT user_id, filename FROM sketches WHERE id=?", (sketch_id,))
        sketch = c.fetchone()
        
        if not sketch:
            return jsonify({"error": "Sketch not found"}), 404
            
        if sketch[0] != user_id:
            return jsonify({"error": "Unauthorized to delete this sketch"}), 403
        
        # Delete the file from filesystem
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], sketch[1])
        if os.path.exists(file_path):
            os.remove(file_path)
        
        # Delete the sketch from database
        c.execute("DELETE FROM sketches WHERE id=?", (sketch_id,))
        
        # Also delete associated likes and comments
        c.execute("DELETE FROM likes WHERE sketch_id=?", (sketch_id,))
        c.execute("DELETE FROM comments WHERE sketch_id=?", (sketch_id,))
        
        conn.commit()
        conn.close()
        
        return jsonify({"message": "Sketch deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400

if __name__ == '__main__':
    init_db()
    app.run(debug=True, host='0.0.0.0', port=5000)
