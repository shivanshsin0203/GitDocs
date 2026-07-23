# 2D Metaverse

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6)
![React](https://img.shields.io/badge/React-18-61DAFB)
![Express](https://img.shields.io/badge/Express-v4-000000)
![MongoDB](https://img.shields.io/badge/MongoDB-ready-47A248)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED)
![License](https://img.shields.io/badge/License-ISC-lightgrey)

A fullstack 2D metaverse application that enables real‑time multiplayer interactions in a shared virtual space. Players can explore a 2D world, chat, and communicate via video/audio using WebRTC.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Screenshots](#screenshots)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Environment Variables](#environment-variables)
- [Running the Project](#running-the-project)
- [Database Setup](#database-setup)
- [Docker Usage](#docker-usage)
- [API Routes](#api-routes)
- [Contributing](#contributing)
- [License](#license)

## Features

- Multiplayer 2D world with real‑time movement and positioning
- Video and audio chat between players using WebRTC (PeerJS)
- In‑room text chat with message timestamps
- Space creation and management (save, retrieve, delete personal spaces)
- User authentication via Kinde
- Dynamic player presence tracking and room limits (max 4 players)
- Responsive UI built with Tailwind CSS and React

## Tech Stack

**Frontend**
- React (18) + Vite
- Socket.IO client
- PeerJS (WebRTC)
- Phaser (2D rendering)
- Tailwind CSS
- Kinde Auth React

**Backend**
- Node.js + TypeScript
- Express (HTTP API)
- Socket.IO (WebSocket)
- Mongoose (MongoDB ODM)
- CORS, dotenv

**Database**
- MongoDB

**DevOps**
- Docker (backend containerization)

## Project Structure

```
2d_metaverse/
├── backend/
│   ├── src/
│   │   ├── index.ts          # Entry point, Express + HTTP server
│   │   ├── http.ts           # REST API endpoints
│   │   ├── ws.ts             # WebSocket game/chat logic
│   │   ├── db/
│   │   │   └── schema.ts     # Mongoose schema for spaces
│   │   └── types.ts          # TypeScript type definitions
│   ├── dockerfile            # Docker configuration for backend
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/       # React components (Game, Space, Home, etc.)
│   │   └── ...
│   ├── public/               # 2D asset images
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
└── README.md
```

## Screenshots

<!-- Add screenshots of your application here -->
> _Screenshots coming soon_

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [npm](https://www.npmjs.com/)
- [MongoDB](https://www.mongodb.com/) (running locally or accessible via connection string)

## Installation & Setup

```bash
# Clone the repository
git clone https://github.com/shivanshsin0203/2d_metaverse.git
cd 2d_metaverse

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

## Environment Variables

> ⚠️ **Note:** No `.env.example` file was found in this repository. The following variables were inferred from the source code and may be incomplete or inaccurate. Please verify against the actual codebase.

Create a `.env` file inside the `backend/` directory with the following variables:

| Variable     | Description                         | Default                |
|--------------|-------------------------------------|------------------------|
| `mongoUrl`   | MongoDB connection string           | `mongo_url`            |
| `PORT`       | Port for the backend server         | `3001`                 |

## Running the Project

**Backend**

```bash
cd backend

# Start in development mode (with hot reload)
npm run dev

# Build and start for production
npm run start
```

The backend will run on `http://localhost:3001` by default.

**Frontend**

```bash
cd frontend

# Start the Vite development server
npm run dev
```

By default, the frontend dev server runs on `http://localhost:5173`.

Make sure MongoDB is running before starting the backend.

## Database Setup

The project uses MongoDB with Mongoose. The backend automatically connects to the MongoDB instance specified in the `mongoUrl` environment variable.

The only collection defined is `spaces`, which stores room metadata:

- `email`: creator’s email
- `roomId`: unique room identifier
- `title`: space title
- `lastModified`: timestamp

No additional seeding or migration steps are required.

## Docker Usage

A Dockerfile is provided for the backend. Build and run the container:

```bash
cd backend

# Build the Docker image
docker build -t 2d-metaverse-backend .

# Run the container
docker run -p 3001:3001 --env-file .env 2d-metaverse-backend
```

Ensure your `.env` file is present with the correct `mongoUrl` (pointing to a reachable MongoDB instance).

## API Routes

All routes are prefixed implicitly (the base URL is `http://localhost:3001`).

### HTTP Endpoints

| Method | Endpoint        | Description                              | Request Body                     |
|--------|----------------|------------------------------------------|----------------------------------|
| GET    | `/test`        | Health check                             | -                                |
| POST   | `/newspace`    | Create a new space                       | `{ email, roomId, title }`      |
| POST   | `/getspace`    | Retrieve all spaces for a user           | `{ email }`                     |
| POST   | `/deletespace` | Delete a space by email and roomId       | `{ email, roomId }`            |

### WebSocket Events

The server uses **Socket.IO** on the same port. Key events:

- `player-join` – join a room with name, position, roomId, and peerId
- `player-move` – broadcast position and direction updates
- `player-joined` / `player-left` – notifications about other players
- `players-sync` – initial sync of all players in the room
- `chatConnect` – join a chat room with name and profile
- `sendMessage` / `receiveMessage` – real‑time text chat
- `chatMembers` – updated list of room members

Rooms are capped at 4 players. If a fifth player tries to join, the server emits `room-full`.

## Contributing

Contributions are welcome! Please follow standard GitHub workflow:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Open a pull request

## License

This project is licensed under the **ISC License**. See the [LICENSE](LICENSE) file for details.