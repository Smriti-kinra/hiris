# HIRIS (Hiring Intelligence & Recruitment Information System)

HIRIS is a full-stack web application designed for organization-wide hiring management. It provides dedicated portals for Hiring Managers, Faculty, and the CHRO to seamlessly submit headcount requests, review candidates, and schedule final interviews.

## Tech Stack

*   **Frontend:** React (Vite), React Router
*   **Backend:** Node.js, Express.js
*   **Database:** PostgreSQL (`pg`)
*   **Security:** `helmet`, `express-rate-limit`, `bcryptjs`, JSON Web Tokens (JWT) via `httpOnly` cookies
*   **Deployment:** Docker, Docker Compose, Nginx

## Project Structure

*   `/apps/backend` — The Express.js API server, database migrations, routes, and backend services.
*   `/apps/frontend` — The Vite + React SPA containing the hiring, faculty, and CHRO portals.
*   `/packages/evaluation` — Evaluation scripts and AI implementation utility code.
*   `/docs` — Product docs and platform feature overview.
*   `/scripts` — Local launch scripts and environment helpers.

## Prerequisites

*   Node.js v20+
*   PostgreSQL v15+ (if running locally without Docker)
*   Docker & Docker Compose (for containerized deployment)

## Local Development Setup

The easiest way to run the application locally is using the provided shell script or the npm workspace bootstrap.

1.  Ensure you have PostgreSQL running locally with a database named `hiris_db` and user `postgres`.
2.  Clone the repository.
3.  Install workspace dependencies from the repo root:
    ```bash
    npm install
    ```
4.  Run the local start script:
    ```bash
    bash scripts/start_all.sh
    ```
5.  The application will be available at `http://localhost:5176`.

### Demo Accounts

The database is seeded with the following accounts (Password for all: `hiris2026`):
*   CHRO: `smriti.kinra@hiris.demo`
*   Hiring Manager: `sartajdeep.singh@hiris.demo`
*   Faculty: `gracy.tanna@hiris.demo`

## Production Deployment (Docker)

The application is containerized and ready for production deployment using Docker Compose.

1.  Copy `.env.example` to `.env` in the `apps/backend/` directory and update the variables (especially `JWT_SECRET` and `DATABASE_URL`).
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
