import unittest
import os
import tempfile
import sqlite3
from backend.app import app, init_db, hash_password

class StyleHubTestCase(unittest.TestCase):
    def setUp(self):
        """Set up test environment before each test."""
        # Create a temporary database
        self.db_fd, self.db_path = tempfile.mkstemp()
        app.config['DATABASE'] = self.db_path
        app.config['TESTING'] = True
        self.app = app.test_client()
        
        # Initialize the database
        with app.app_context():
            init_db()

    def tearDown(self):
        """Clean up after each test."""
        os.close(self.db_fd)
        os.unlink(self.db_path)

    def test_homepage(self):
        """Test that the homepage returns the correct message."""
        rv = self.app.get('/')
        self.assertEqual(rv.status_code, 200)
        self.assertIn(b'Welcome to StyleHub API', rv.data)

    def test_user_registration(self):
        """Test user registration endpoint."""
        # Test successful registration
        rv = self.app.post('/api/register', 
                          json={
                              'username': 'testuser',
                              'email': 'test@example.com',
                              'password': 'password123'
                          })
        self.assertEqual(rv.status_code, 201)
        self.assertIn(b'User registered successfully', rv.data)
        
        # Test duplicate registration
        rv = self.app.post('/api/register',
                          json={
                              'username': 'testuser',
                              'email': 'test2@example.com',
                              'password': 'password123'
                          })
        self.assertEqual(rv.status_code, 400)
        self.assertIn(b'Username already exists', rv.data)

    def test_user_login(self):
        """Test user login endpoint."""
        # First register a user
        self.app.post('/api/register',
                     json={
                         'username': 'testuser',
                         'email': 'test@example.com',
                         'password': 'password123'
                     })
        
        # Test successful login
        rv = self.app.post('/api/login',
                          json={
                              'username': 'testuser',
                              'password': 'password123'
                          })
        self.assertEqual(rv.status_code, 200)
        self.assertIn(b'Login successful', rv.data)
        self.assertIn(b'session_token', rv.data)
        
        # Test failed login
        rv = self.app.post('/api/login',
                          json={
                              'username': 'testuser',
                              'password': 'wrongpassword'
                          })
        self.assertEqual(rv.status_code, 401)
        self.assertIn(b'Invalid credentials', rv.data)

    def test_password_hashing(self):
        """Test that passwords are properly hashed."""
        password = 'testpassword'
        hashed = hash_password(password)
        self.assertNotEqual(password, hashed)
        self.assertEqual(hashed, hash_password(password))  # Same input should produce same hash

    def test_sketch_upload_requires_auth(self):
        """Test that sketch upload requires authentication."""
        # Try to upload without authentication
        rv = self.app.post('/api/upload')
        self.assertEqual(rv.status_code, 401)
        self.assertIn(b'Missing authorization token', rv.data)

    def test_get_sketches(self):
        """Test getting sketches endpoint."""
        rv = self.app.get('/api/sketches')
        self.assertEqual(rv.status_code, 200)
        # Should return an empty array initially
        self.assertEqual(rv.data, b'[]')

if __name__ == '__main__':
    unittest.main()