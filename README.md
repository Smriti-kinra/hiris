# HIRIS (Hiring Intelligence & Recruitment Information System)

HIRIS is a full-stack web application designed for organization-wide hiring management. It provides dedicated portals for Hiring Managers, Faculty, and the CHRO to seamlessly submit headcount requests, review candidates, and schedule final interviews.

## Tech Stack

*   **Frontend:** React (Vite), React Router
*   **Backend:** Node.js, Express.js
*   **Database:** PostgreSQL (`pg`)
*   **Security:** `helmet`, `express-rate-limit`, `bcryptjs`, JSON Web Tokens (JWT) via `httpOnly` cookies
*   **Deployment:** Docker, Docker Compose, Nginx

## Project Structure

*   `/backend` — The Express.js API server and PostgreSQL connection logic.
*   `/hiris-unified` — The Vite + React SPA containing the three user portals.

## Prerequisites

*   Node.js v20+
*   PostgreSQL v15+ (if running locally without Docker)
*   Docker & Docker Compose (for containerized deployment)

## Local Development Setup

The easiest way to run the application locally is using the provided shell script. This will start the database seed/migration process, boot the backend server, and start the Vite dev server concurrently.

1.  Ensure you have PostgreSQL running locally with a database named `hiris_db` and user `postgres`.
2.  Clone the repository.
3.  Run the local start script:
    ```bash
    bash start_all.sh
    ```
4.  The application will be available at `http://localhost:5176`.

### Demo Accounts

The database is seeded with the following accounts (Password for all: `hiris2026`):
*   CHRO: `smriti.kinra@hiris.demo`
*   Hiring Manager: `sartajdeep.singh@hiris.demo`
*   Faculty: `gracy.tanna@hiris.demo`

## Production Deployment (Docker)

The application is containerized and ready for production deployment using Docker Compose.

1.  Copy `.env.example` to `.env` in the `backend/` directory and update the variables (especially `JWT_SECRET` and `DATABASE_URL`).
2.  Build and start the containers:
    ```bash
    docker-compose up -d --build
    ```
3.  The backend will be available on port `3001` and the frontend will be served via Nginx on port `8080` (mapped to port 80 internally).

## CI/CD Pipeline

A GitHub Actions workflow is provided in `.github/workflows/ci.yml`. On every push to `main`, this pipeline will:
1.  Install backend dependencies.
2.  Install frontend dependencies.
3.  Execute a production build of the React frontend.
4.  Run a backend smoke test to verify the `/api/health` endpoint is functional.
