# Contributing to HIRIS

Thank you for your interest in contributing to HIRIS (Hiring Intelligence & Recruitment Information System). We welcome contributions from developers, researchers, and users.

Please read through these guidelines to understand our development workflow and contribution standards.

## Code of Conduct

We expect all contributors to adhere to standard professional conduct:
- Be respectful and collaborative in all communications.
- Focus on constructive feedback and positive collaboration.
- Maintain data privacy and avoid committing any private credentials or API keys.

## How to Contribute

### 1. Reporting Bugs & Requesting Features
- Search existing issues to ensure your feedback has not already been addressed.
- Create a new issue describing the bug or feature clearly.
- Provide steps to reproduce the bug, along with logs, screenshot links, and environment details (Node version, OS, etc.).

### 2. Submitting Pull Requests
- Fork the repository and create your branch from the `main` branch.
- Use a descriptive branch name (e.g., `feature/ai-evaluation-tuning` or `bugfix/jwt-cookie-expiration`).
- Make sure your changes comply with the tech stack guidelines:
  - React 18, Vite, and Vanilla CSS for the frontend.
  - Express.js and modular controllers for the backend.
  - Database schema changes must be added via a new incremental SQL migration file under `apps/backend/migrations/`.
- Verify that both the frontend and backend build locally without errors.
- Ensure your branch is fully merged with the latest changes from `main` before submitting a Pull Request.

## Development Standards

### Git Commit Guidelines
Use clear, concise, and imperative commit messages:
- `feat: add database indexes for archive queries`
- `fix: correct token lookup in auth middleware`
- `docs: update setup steps in readme`

### Code Quality and Review
- Keep functions modular and preserve existing comments.
- Do not commit sensitive configurations or environment variables (`.env`).
- Every pull request must pass the automated CI pipeline checks before it can be merged.
