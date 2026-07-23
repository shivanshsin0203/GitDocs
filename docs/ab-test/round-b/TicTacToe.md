# Tic Tac Toe Game

![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6)
![React](https://img.shields.io/badge/React-19.2-61DAFB)
![Express](https://img.shields.io/badge/Express-5.2-000000)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-ready-4169E1)
![License](https://img.shields.io/badge/License-ISC-lightgrey)

A full‑stack real‑time multiplayer Tic‑Tac‑Toe game with a stunning neon aesthetic. Challenge players worldwide, create or join rooms, and watch matches live.

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
- [API Reference](#api-reference)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Real‑time Multiplayer** – Play against other users with live game state updates over WebSocket.
- **User Authentication** – Secure sign‑up and login using JWT tokens.
- **Matchmaking Rooms** – Create a new room or join an existing one; the game starts automatically when two players are ready.
- **Live Spectator Mode** – Watch any ongoing match in real‑time.
- **Neon‑Themed UI** – Immersive design with floating particles, glowing borders, and smooth animations powered by Tailwind CSS and shadcn/ui.
- **Dashboard** – Browse all active games, see scores, and jump in to watch or play.

## Tech Stack

**Frontend**
- React 19
- TypeScript 5.9
- Vite 7
- Tailwind CSS 4
- shadcn/ui (Radix UI components)
- Socket.IO client
- Axios
- React Router 7

**Backend**
- Node.js
- Express 5
- TypeScript
- Socket.IO
- Prisma ORM (PostgreSQL)
- JSON Web Token (JWT)

**Database**
- PostgreSQL

## Project Structure

```
TicTacToe/
├── Backend/
│   ├── prisma/                 # Prisma schema & migrations
│   ├── src/
│   │   ├── http.ts             # Express HTTP routes
│   │   ├── ws.ts               # Socket.IO event handlers
│   │   ├── services/
│   │   │   ├── gameManager.ts  # In‑memory game state
│   │   │   ├── gameService.ts
│   │   │   └── waitingRoomService.ts
│   │   ├── generated/prisma/   # Prisma client output
│   │   └── index.ts            # Server bootstrap
│   └── package.json
├── Frontend/
│   ├── src/
│   │   ├── components/         # UI components (shadcn/ui)
│   │   ├── lib/
│   │   │   └── socket.ts       # Socket.IO React hook
│   │   ├── App.tsx             # Landing page (neon hero)
│   │   ├── dashboard.tsx       # Game room browser
│   │   └── ...
│   ├── vite.config.ts
│   └── package.json
└── README.md
```

## Screenshots

<!-- Add screenshots of your application here -->
> _Screenshots coming soon_

## Prerequisites

- **Node.js** >= 18.x
- **PostgreSQL** running locally or via a cloud service
- **pnpm / npm / yarn** (package manager)

## Installation & Setup

```bash
# Clone the repository
git clone https://github.com/shivanshsin0203/TicTacToe.git
cd TicTacToe
```

### Backend

```bash
cd Backend

# Install dependencies
npm install

# Set up environment variables (see Environment Variables)
cp .env.example .env   # (create if needed)

# Run database migrations
npx prisma migrate dev --name init

# Build and start the server
npm run start
```

### Frontend

```bash
cd ../Frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

## Environment Variables

> ⚠️ **Note:** No `.env.example` file was found in this repository. The following variables were inferred from the source code and may be incomplete or inaccurate. Please verify against the actual codebase.

Create a `.env` file in the `Backend/` directory:

| Variable          | Description                                    | Example                        |
|-------------------|------------------------------------------------|--------------------------------|
| `PORT`            | Port for the HTTP/WebSocket server             | `3001`                         |
| `DATABASE_URL`    | PostgreSQL connection string for Prisma        | `postgresql://user:pass@localhost:5432/tictactoe` |
| `JWT_SECRET`      | Secret key for signing JWT tokens              | `your_random_secret`           |

## Running the Project

Once the backend is up and the frontend dev server is running, open your browser at `http://localhost:5173` (the default Vite URL). The frontend will proxy API/WS requests to `localhost:3001` by default.

## Database Setup

This project uses **Prisma** with **PostgreSQL**.

1. Ensure PostgreSQL is running and create a database, e.g., `tictactoe`.
2. Set the `DATABASE_URL` environment variable (see above).
3. Run the Prisma migration to create the schema:

   ```bash
   cd Backend
   npx prisma migrate dev --name init
   ```

4. The `User` table will be created with the fields defined in `prisma/schema.prisma`.

## API Reference

### HTTP Endpoints

| Method | Path         | Description                     |
|--------|--------------|---------------------------------|
| POST   | `/register`  | Create a new user account       |
| POST   | `/login`     | Authenticate and receive JWT    |
| GET    | `/rooms`     | List all active game rooms       |

> The full route handler implementations are in `Backend/src/http.ts` (not included in the snapshot). The dashboard fetches from `/rooms` to display live games.

### WebSocket Events

All real‑time communication uses **Socket.IO** on the `ws://localhost:3001` endpoint.

| Event (client → server) | Payload                                        | Description                 |
|--------------------------|------------------------------------------------|-----------------------------|
| `join-room`              | `{ roomId: string, uniqueId: string }`        | Join or rejoin a game room  |
| `make-move`              | `{ roomId, row, col, playerId }`              | Submit a move               |
| `join-watching`          | `{ roomId: string }`                          | Spectate a room             |
| `disconnect-win`         | `{ roomId, disconnectedPlayerId }`            | Declare win on opponent disconnect |
| `disconnect`             | _(automatic)_                                 | Handle player disconnection |

| Event (server → client) | Payload                                        | Description                 |
|--------------------------|------------------------------------------------|-----------------------------|
| `start-game`             | Game state object                              | Game begins for two players |
| `game-state`             | Updated room state                             | After every valid move      |
| `game-over`              | Result message (e.g., “player1 wins”)         | Game has ended              |
| `player-disconnected`    | Disconnected player ID                         | Opponent has left           |
| `check-reconnect`        | Room state                                     | Reconnection after disconnect |
| `start-watching`         | Room state                                     | Begin spectating            |

## Contributing

Contributions are welcome! Feel free to open issues or pull requests. Please ensure your PR adheres to the existing coding style and includes relevant documentation.

## License

This project is licensed under the **ISC** License. See the `package.json` files for more information.