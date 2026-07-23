# CRUD Go API

![Go](https://img.shields.io/badge/Go-1.23-00ADD8)
![Fiber](https://img.shields.io/badge/Fiber-v2-00ACD7)
![MongoDB](https://img.shields.io/badge/MongoDB-ready-47A248)

A lightweight RESTful API for managing a collection of books, built with **Go** and the **Fiber** web framework. It implements full CRUD operations backed by **MongoDB**.

## Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Environment Variables](#environment-variables)
- [Running the Project](#running-the-project)
- [API Routes](#api-routes)
- [Database Setup](#database-setup)
- [Contributing](#contributing)

## Features
- Create, Read, Update, and Delete book entries
- JSON request/response format
- RESTful endpoint design with proper HTTP status codes
- MongoDB integration using the official Go driver
- Built‑in CORS, logging, and panic recovery middleware
- Configurable server port via environment variable

## Tech Stack
- **Language:** Go 1.23+
- **Web Framework:** [Fiber v2](https://github.com/gofiber/fiber)
- **Database:** MongoDB
- **Configuration:** [godotenv](https://github.com/joho/godotenv)
- **Additional Libraries:** MongoDB Go driver, `cors`, `logger`, `recover` middleware

## Project Structure
```
CrudGo/
├── config/
│   └── db.go           # MongoDB connection setup
├── models/
│   └── book.go         # Book data model
├── router/
│   └── book.go         # Route handlers and endpoint definitions
├── .env                # Environment variables (do not commit)
├── main.go             # Application entry point
├── go.mod
└── go.sum
```

## Prerequisites
- **Go** 1.23 or later installed on your machine
- A **MongoDB** instance (local, Atlas, or any accessible server)
- A valid MongoDB connection URI

## Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/shivanshsin0203/CrudGo.git
   cd CrudGo
   ```

2. **Install dependencies**
   ```bash
   go mod download
   ```

3. **Set up environment variables**
   Create a `.env` file in the project root (or export the variables directly).  
   See [Environment Variables](#environment-variables) for required values.

4. **Ensure MongoDB is running** and accessible via the URI you provided.

## Environment Variables

> ⚠️ **Note:** No `.env.example` file was found in this repository. The following variable was obtained from the existing `.env` file and source code. Please verify against the actual codebase and ensure you keep sensitive values secure.

| Variable    | Description                               | Example                                   |
|-------------|-------------------------------------------|-------------------------------------------|
| `mongoUrl`  | MongoDB connection URI                    | `mongodb+srv://user:pass@cluster.mongodb.net/Analytic` |
| `PORT`      | Port the server listens on (default: `3001`) | `3001`                                    |

`mongoUrl` is **required**.  
`PORT` is optional; if not set, the server will use port `3001`.

## Running the Project

Start the server with:
```bash
go run main.go
```
Or build and run the binary:
```bash
go build -o crud-api
./crud-api
```
The API will be accessible at `http://localhost:<PORT>`.

## API Routes

All routes are prefixed with `/books`.

| Method | Endpoint       | Description                |
|--------|----------------|----------------------------|
| GET    | `/books`       | Retrieve all books         |
| GET    | `/books/:id`   | Retrieve a single book by ID |
| POST   | `/books`       | Create a new book          |
| PUT    | `/books/:id`   | Update an existing book    |
| DELETE | `/books/:id`   | Delete a book              |

**Request Body (POST / PUT)**
```json
{
  "title": "Book Title",
  "author": "Author Name",
  "year": "2025"
}
```

**Response Example (GET `/books`)**
```json
{
  "data": [
    {
      "_id": "60d5f...",
      "title": "Sample Book",
      "author": "John Doe",
      "year": "2025"
    }
  ]
}
```

The ID must be a valid MongoDB ObjectID (24‑character hex string).

## Database Setup

- The application connects to a MongoDB database named `Analytic` (hardcoded in `config/db.go`).
- Ensure your MongoDB URI has the correct permissions to read/write to this database.
- Collections are created automatically when the first document is inserted.
- The book documents are stored in the `books` collection.

If you are using MongoDB Atlas, make sure your IP address is whitelisted in the Atlas dashboard.

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a new branch for your feature or bug fix
3. Commit your changes with clear messages
4. Push to your branch and open a Pull Request

For major changes, please open an issue first to discuss what you would like to change.