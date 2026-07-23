# CRUD Go API

![Go](https://img.shields.io/badge/Go-1.23.4-00ADD8)
![Fiber](https://img.shields.io/badge/Fiber-v2-00ACD7)
![MongoDB](https://img.shields.io/badge/MongoDB-ready-47A248)
![License](https://img.shields.io/badge/License-MIT-yellow)

A minimal REST API built with Go for managing books. This backend-only application provides full CRUD (Create, Read, Update, Delete) functionality using the Fiber web framework and MongoDB as the database. Designed for learning and demonstration purposes.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation and Setup](#installation-and-setup)
- [Environment Variables](#environment-variables)
- [Running the Project](#running-the-project)
- [API Routes](#api-routes)
- [Contributing](#contributing)
- [License](#license)

## Features

- Create new book entries with title, author, and year
- Retrieve all books or a single book by ID
- Update existing book information
- Delete books from the database
- RESTful API design with proper HTTP methods and status codes
- MongoDB integration for persistent data storage
- CORS middleware enabled for cross-origin requests

## Tech Stack

- **Language:** Go 1.23.4
- **Framework:** Fiber v2.52.6
- **Database:** MongoDB (via `go.mongodb.org/mongo-driver` v1.17.2)
- **Environment:** godotenv v1.5.1

## Project Structure

```
CrudGo/
├── config/
│   └── db.go          # MongoDB connection and initialization
├── models/
│   └── book.go        # Book data model definition
├── router/
│   └── book.go        # API route handlers for books
├── main.go            # Application entry point
├── go.mod             # Go module definition
├── go.sum             # Go module checksums
└── .env               # Environment variables (not committed)
```

## Prerequisites

- Go 1.23.4 or higher
- MongoDB instance (local or cloud, e.g., MongoDB Atlas)
- Git

## Installation and Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/shivanshsin0203/CrudGo.git
   cd CrudGo
   ```

2. Install dependencies:
   ```bash
   go mod download
   ```

3. Set up environment variables (see [Environment Variables](#environment-variables) section).

## Environment Variables

> ⚠️ **Note:** No `.env.example` file was found in this repository. The following variables were inferred from the source code and may be incomplete or inaccurate. Please verify against the actual codebase.

Create a `.env` file in the project root with the following variable:

| Variable    | Description                          | Required | Default |
|-------------|--------------------------------------|----------|---------|
| `mongoUrl`  | MongoDB connection URI               | Yes      | None    |
| `PORT`      | Server port (optional)               | No       | `3001`  |

Example `.env` file:
```
mongoUrl="mongodb+srv://<username>:<password>@<cluster>.mongodb.net/Analytic"
PORT=3001
```

## Running the Project

Start the server with:
```bash
go run main.go
```

The server will start on the specified port (default `3001`). You should see the following output:
```
Connected to MongoDB
```

## API Routes

All routes are prefixed with `/books`.

### List All Books
```http
GET /books
```
**Response:** Returns an array of all books.

### Get a Single Book
```http
GET /books/:id
```
**Parameters:** `id` - MongoDB ObjectId of the book

**Response:** Returns the book object.

### Create a Book
```http
POST /books
```
**Request Body:**
```json
{
  "title": "Book Title",
  "author": "Author Name",
  "year": "2024"
}
```
**Response:** Returns the created book with its ID.

### Update a Book
```http
PUT /books/:id
```
**Parameters:** `id` - MongoDB ObjectId of the book

**Request Body:** (all fields optional)
```json
{
  "title": "Updated Title",
  "author": "Updated Author",
  "year": "2025"
}
```
**Response:** Returns the update result.

### Delete a Book
```http
DELETE /books/:id
```
**Parameters:** `id` - MongoDB ObjectId of the book

**Response:** Returns the deletion result.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.