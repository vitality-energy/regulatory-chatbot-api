# Vitality AI Backend

This is the backend server for the Vitality AI application, built with Node.js, Express, TypeScript, and Drizzle ORM.

## Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18.0.0 or higher)
- [npm](https://www.npmjs.com/)
- [PostgreSQL](https://www.postgresql.org/) (or a [Neon](https://neon.tech/) database)

## Getting Started

### 1. Installation

Clone the repository and install the dependencies:

```bash
cd backend
npm install
```

### 2. Environment Setup

Create a `.env` file in the root of the backend directory by copying the example file:

```bash
cp env.example .env
```

Open the `.env` file and fill in your configuration:
- `DATABASE_URL`: Your PostgreSQL connection string.
- `JWT_SECRET`: A secret key for JWT authentication.
- `OPENAI_API_KEY`: Your OpenAI API key.
- `ASSISTANT_PROMPT_ID`: The ID for your OpenAI assistant prompt.
- `RESEARCH_PROMPT_ID`: The ID for your research prompt.

### 3. Database Setup

The project uses Drizzle ORM for database management. Run the following commands to set up your database:

```bash
# Generate migrations based on your schema
npm run db:generate

# Push the schema to the database (for development)
npm run db:push

# OR run migrations
npm run db:migrate
```

You can also use Drizzle Studio to explore your database:
```bash
npm run db:studio
```

### 4. Running the Application

#### Development Mode
To run the server with hot-reloading:

```bash
npm run dev
```
The server will start on `http://localhost:3001` (or the port specified in your `.env`).

#### Production Mode
To build and run the application in production:

```bash
npm run build
```

### 5. Running Tests

To run the test suite:

```bash
npm test
```

For watch mode:
```bash
npm run test:watch
```

## Running with Docker

If you prefer to use Docker, you can build and run the application using the provided `Dockerfile`.

### Build the image:
```bash
docker build -t vitality-backend .
```

### Run the container:
```bash
docker run -p 3001:3001 --env-file .env vitality-backend
```

## Project Structure

- `src/server.ts`: Entry point of the application.
- `src/db/`: Database schema and migrations.
- `src/routes/`: API route definitions.
- `src/services/`: Business logic.
- `src/dao/`: Data Access Objects for database interactions.
- `src/middleware/`: Express middleware.
- `src/utils/`: Utility functions and logger.
