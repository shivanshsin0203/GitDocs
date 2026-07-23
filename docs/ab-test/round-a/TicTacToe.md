# Tic Tac Toe

![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6)
![React](https://img.shields.io/badge/React-19-61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-18-339933)
![Express](https://img.shields.io/badge/Express-5-000000)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-ready-4169E1)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748)
![Socket.io](https://img.shields.io/badge/Socket.io-4-010101)
![Vite](https://img.shields.io/badge/Vite-7-646CFF)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4)
![License](https://img.shields.io/badge/License-ISC-lightgrey)

A full-stack, real-time multiplayer Tic Tac Toe game with a neon-themed UI. Challenge players worldwide, create game rooms, and watch live matches with WebSocket-powered updates.

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
- [API Routes](#api-routes)
- [WebSocket Events](#websocket-events)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Real-time Multiplayer Gameplay** — Play Tic Tac Toe against another player with instant move updates via WebSocket
- **User Authentication** — Register and login with JWT-based authentication
- **Game Rooms** — Create and join game rooms with unique room IDs
- **Waiting Room** — Queue system that automatically starts a game when two players join
- **Watch Party** — Spectate live games in real-time
- **Reconnection Support** — Reconnect to an ongoing game if disconnected
- **Neon-themed UI** — Visually striking interface with animated particles and glowing effects
- **Responsive Design** — Works on desktop and mobile devices

## Tech Stack

### Backend
- **Runtime:** Node.js
- **Language:** TypeScript
- **Framework:** Express 5
- **Database ORM:** Prisma 7 with PostgreSQL
- **Real-time Communication:** Socket.io 4
- **Authentication:** JSON Web Tokens (jsonwebtoken)
- **Database Driver:** pg (node-postgres)

### Frontend
- **Framework:** React 19
- **Language:** TypeScript 5.9
- **Build Tool:** Vite 7
- **Styling:** Tailwind CSS 4
- **UI Components:** Radix UI, Lucide React icons
- **HTTP Client:** Axios
- **Routing:** React Router 7
- **Notifications:** react-hot-toast
- **Real-time Client:** socket.io-client

## Project Structure

```
TicTacToe/
├── Backend/
│   ├── src/
│   │   ├── index.ts              # Server entry point
│   │   ├── ws.ts                 # WebSocket handler
│   │   ├── http.ts               # HTTP routes
│   │   ├── services/
│   │   │   ├── gameManager.ts    # Game room management
│   │   │   ├── gameService.ts    # Game logic
│   │   │   └── waitingRoomService.ts  # Player queue
│   │   └── generated/prisma/     # Prisma client
│   ├── prisma/
│   │   └── schema.prisma         # Database schema
│   └── package.json
├── Frontend/
│   ├── src/
│   │   ├── App.tsx               # Landing page
│   │   ├── main.tsx              # App entry with routing
│   │   ├── login.tsx             # Login page
│   │   ├── register.tsx          # Registration page
│   │   ├── dashboard.tsx         # User dashboard
│   │   ├── gameroom.tsx          # Game room page
│   │   ├── watchparty.tsx        # Watch party page
│   │   ├── lib/
│   │   │   └── socket.ts         # Socket.io client hook
│   │   └── components/ui/        # UI components
│   ├── vite.config.ts
│   └── package.json
```

## Screenshots

<!-- Add screenshots of your application here -->

> _Screenshots coming soon_

## Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **PostgreSQL** (v12 or higher)

## Installation and Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/shivanshsin0203/TicTacToe.git
   cd TicTacToe
   ```

2. **Install backend dependencies**

   ```bash
   cd Backend
   npm install
   ```

3. **Install frontend dependencies**

   ```bash
   cd ../Frontend
   npm install
   ```

## Environment Variables

> ⚠️ **Note:** No `.env.example` file was found in this repository. The following variables were inferred from the source code and may be incomplete or inaccurate. Please verify against the actual codebase.

Create a `.env` file in the `Backend/` directory:

```env
PORT=3001
DATABASE_URL=postgresql://username:password@localhost:5432/tictactoe
JWT_SECRET=your_jwt_secret_key
```

## Running the Project

### Backend

```bash
cd Backend

# Development mode (with auto-reload)
npm run dev

# Production build
npm start
```

The backend server will start on `http://localhost:3001` (or the port specified in your `.env` file).

### Frontend

```bash
cd Frontend

# Development mode
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

The frontend development server will start on `http://localhost:5173` (default Vite port).

## Database Setup

1. **Ensure PostgreSQL is running** on your system.

2. **Create the database**

   ```sql
   CREATE DATABASE tictactoe;
   ```

3. **Run Prisma migrations**

   ```bash
   cd Backend
   npx prisma migrate dev --name init
   ```

4. **Generate Prisma client**

   ```bash
   npx prisma generate
   ```

The database schema includes a `User` model with the following fields:

| Field     | Type     | Constraints          |
|-----------|----------|----------------------|
| id        | Int      | Primary key, auto-increment |
| email     | String   | Unique               |
| name      | String   |                      |
| password  | String   |                      |
| createdAt | DateTime | Default: now()       |
| updatedAt | DateTime | Auto-updated         |

## API Routes

The backend exposes HTTP routes (defined in `http.ts`) and WebSocket events.

### HTTP Endpoints

| Method | Route        | Description          |
|--------|--------------|----------------------|
| POST   | /api/register | Register a new user  |
| POST   | /api/login    | Login user           |
| GET    | /api/rooms    | Get all active rooms |

## WebSocket Events

### Client → Server

| Event              | Payload                                    | Description                          |
|--------------------|--------------------------------------------|--------------------------------------|
| `join-room`        | `roomId: string, uniqueId: string`         | Join a game room                     |
| `make-move`        | `{ roomId, row, col, playerId }`           | Make a move on the board             |
| `join-watching`    | `roomId: string`                           | Join a room as a spectator           |
| `disconnect-win`   | `{ roomId, disconnectedPlayerId }`         | Declare winner on opponent disconnect |

### Server → Client

| Event                  | Payload                          | Description                          |
|------------------------|----------------------------------|--------------------------------------|
| `start-game`           | `gameState`                      | Game started with two players        |
| `game-state`           | `room`                           | Updated game state after a move      |
| `game-over`            | `winnerId`                       | Game ended with a winner or draw     |
| `check-reconnect`      | `room`                           | Reconnection state for a player      |
| `player-disconnected`  | `disconnectedPlayerId`           | A player has disconnected            |
| `start-watching`       | `room`                           | Current game state for spectators    |

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.