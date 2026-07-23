# 2D Metaverse

![Node.js](https://img.shields.io/badge/Node.js-18-339933)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6)
![React](https://img.shields.io/badge/React-18.3-61DAFB)
![Express](https://img.shields.io/badge/Express-4.21-000000)
![Socket.io](https://img.shields.io/badge/Socket.io-4.8-010101)
![MongoDB](https://img.shields.io/badge/MongoDB-ready-47A248)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED)
![License](https://img.shields.io/badge/License-ISC-lightgrey)

A full-stack 2D metaverse application that enables real-time multiplayer interactions in a virtual world. Users can navigate a 2D space, communicate via text chat, and engage in video/audio calls with other players in the same room.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Screenshots](#screenshots)
- [Prerequisites](#prerequisites)
- [Installation and Setup](#installation-and-setup)
- [Environment Variables](#environment-variables)
- [Running the Project](#running-the-project)
- [Database Setup](#database-setup)
- [Docker Usage](#docker-usage)
- [API Routes](#api-routes)
- [WebSocket Events](#websocket-events)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Real-time Multiplayer Movement** — Navigate a 2D world with other players, seeing their movements in real-time
- **Text Chat** — Communicate with other players in the same room via an in-game chat system
- **Video/Audio Calls** — Peer-to-peer video and audio communication using WebRTC (PeerJS)
- **Room Management** — Create and join different spaces, with a maximum of 4 players per room
- **User Authentication** — Secure authentication via Kinde OAuth provider
- **Space Persistence** — Save and manage your created spaces with MongoDB
- **Responsive UI** — Modern interface built with React and Tailwind CSS

## Tech Stack

### Backend
- **Runtime:** Node.js 18
- **Language:** TypeScript
- **Framework:** Express.js 4.21
- **Real-time Communication:** Socket.io 4.8
- **Database:** MongoDB with Mongoose 8.8
- **Authentication:** JWT (via Kinde)

### Frontend
- **Framework:** React 18.3
- **Build Tool:** Vite 5.4
- **Styling:** Tailwind CSS 3.4
- **Game Engine:** Phaser 3.86
- **WebRTC:** PeerJS 1.5
- **Authentication:** Kinde Auth React 4.0
- **Routing:** React Router DOM 6.28

## Project Structure

```
2d_metaverse/
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   └── schema.ts          # MongoDB schema definitions
│   │   ├── http.ts                # HTTP route handlers
│   │   ├── ws.ts                  # WebSocket event handlers
│   │   └── index.ts               # Backend entry point
│   ├── dockerfile                 # Docker configuration
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Game.jsx           # Canvas-based 2D game component
│   │   │   ├── Space.jsx          # Space/room interface component
│   │   │   └── Home.jsx           # Homepage component
│   │   └── App.jsx                # Frontend entry point
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
└── README.md
```

## Screenshots

<!-- Add screenshots of your application here -->

> _Screenshots coming soon_

## Prerequisites

- **Node.js** 18 or higher
- **npm** 9 or higher
- **MongoDB** instance (local or cloud)
- **Kinde** account for authentication

## Installation and Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/shivanshsin0203/2d_metaverse.git
   cd 2d_metaverse
   ```

2. **Install backend dependencies**

   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**

   ```bash
   cd ../frontend
   npm install
   ```

## Environment Variables

> ⚠️ **Note:** No `.env.example` file was found in this repository. The following variables were inferred from the source code and may be incomplete or inaccurate. Please verify against the actual codebase.

### Backend (`backend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `mongoUrl` | MongoDB connection string | `mongo_url` |

### Frontend (`frontend/.env`)

| Variable | Description |
|----------|-------------|
| `VITE_CLIENT_ID` | Kinde OAuth client ID |
| `VITE_DOMAIN` | Kinde authentication domain |

## Running the Project

### Backend

```bash
cd backend

# Development mode with hot reload
npm run dev

# Production build and start
npm start
```

The backend server will start on `http://localhost:3001`.

### Frontend

```bash
cd frontend

# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

The frontend development server will start on `http://localhost:5173`.

## Database Setup

The project uses MongoDB for storing space/room data. The schema is defined in `backend/src/db/schema.ts`:

```typescript
const spaceSchema = new mongoose.Schema({
    email: String,
    roomId: String,
    title: String,
    lastModified: { type: Date, default: Date.now }
});
```

**Setup steps:**

1. Ensure MongoDB is running locally or use a cloud service like MongoDB Atlas
2. Set the `mongoUrl` environment variable to your MongoDB connection string
3. The database connection is established automatically when the backend starts

## Docker Usage

A Dockerfile is provided for containerizing the backend service.

```bash
cd backend

# Build the Docker image
docker build -t 2d-metaverse-backend .

# Run the container
docker run -p 3001:3001 \
  -e mongoUrl=your_mongodb_url \
  -e PORT=3001 \
  2d-metaverse-backend
```

## API Routes

### HTTP Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/test` | Health check endpoint |
| `POST` | `/newspace` | Create a new space |
| `POST` | `/getspace` | Get all spaces for a user |
| `POST` | `/deletespace` | Delete a space |

### Request/Response Examples

**Create Space**
```bash
POST /newspace
Content-Type: application/json

{
  "email": "user@example.com",
  "roomId": "room-123",
  "title": "My Space"
}
```

**Get Spaces**
```bash
POST /getspace
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Delete Space**
```bash
POST /deletespace
Content-Type: application/json

{
  "email": "user@example.com",
  "roomId": "room-123"
}
```

## WebSocket Events

### Client → Server

| Event | Data | Description |
|-------|------|-------------|
| `chatConnect` | `{ name, profile, spaceId }` | Connect to chat in a space |
| `sendMessage` | `{ sender, message, timestamp, roomId, profile }` | Send a chat message |
| `player-join` | `{ name, x, y, room, peerId }` | Join a game room |
| `player-move` | `{ x, y, direction, room }` | Update player position |

### Server → Client

| Event | Data | Description |
|-------|------|-------------|
| `room-full` | `{ message }` | Room has reached maximum capacity |
| `receiveMessage` | `{ sender, message, timestamp, roomId, profile }` | Receive a chat message |
| `players-sync` | `Player[]` | Initial list of players in room |
| `player-joined` | `Player` | A new player has joined |
| `player-moved` | `Player` | A player has moved |
| `player-left` | `playerId` | A player has disconnected |
| `chatMembers` | `Player[]` | Updated list of chat members |

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.