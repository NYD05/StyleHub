# StyleHub - Fashion Sketch Sharing Platform

StyleHub is a web application that allows fashion enthusiasts to upload their drawings, sketches, and ideas, and also browse sketches and drawings from other users.

## Features

- User registration and authentication
- Upload fashion sketches and drawings
- Browse and view sketches from other users
- Like and comment on sketches
- Responsive design for all devices

## Tech Stack

- **Backend**: Python Flask
- **Frontend**: React.js
- **Database**: SQLite
- **Authentication**: Session-based authentication

## Project Structure

```
stylehub/
├── backend/              # Flask backend API
│   ├── app.py           # Main Flask application
│   ├── requirements.txt # Python dependencies
│   └── stylehub.db      # SQLite database (created on first run)
├── frontend/            # Vanilla JavaScript frontend (alternative)
├── react-frontend/      # React frontend
│   ├── public/
│   ├── src/
│   │   ├── App.jsx      # Main React component
│   │   ├── App.css      # Styles
│   │   └── main.jsx     # Entry point
│   └── package.json
├── database/            # Database schema
│   └── schema.sql       # SQL schema definition
└── docs/                # Documentation
```

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run the Flask application:
   ```bash
   python app.py
   ```

   The backend API will be available at `http://localhost:5000`

### Frontend Setup (React)

1. Navigate to the React frontend directory:
   ```bash
   cd react-frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

   The React frontend will be available at `http://localhost:3000`

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/register` | POST | Register a new user |
| `/api/login` | POST | Log in a user |
| `/api/upload` | POST | Upload a sketch (requires authentication) |
| `/api/sketches` | GET | Get all sketches |
| `/api/sketches/<id>/like` | POST | Like/unlike a sketch (requires authentication) |
| `/api/sketches/<id>/comments` | POST | Add a comment to a sketch (requires authentication) |
| `/api/sketches/<id>/comments` | GET | Get comments for a sketch |

## Database Schema

The database schema is defined in `database/schema.sql` and includes tables for:
- Users
- Sketches
- Sessions
- Likes
- Comments

## Live Demo

The application is hosted at: [http://stylehub-demo.example.com](http://stylehub-demo.example.com) (placeholder URL)

## Video Demo

Watch a walkthrough of the application: [YouTube Demo Link](https://www.youtube.com/watch?v=demo) (placeholder link)

## Source Code

The source code is available on GitHub: [StyleHub Repository](https://github.com/username/stylehub) (placeholder link)

## Testing

Unit tests are written using Python's unittest framework and can be found in the `tests/` directory.

Run tests with:
```bash
python -m unittest discover tests
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.