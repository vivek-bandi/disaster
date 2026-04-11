# Running Services

This repository contains a React frontend, an Express backend, and supporting infrastructure for PostgreSQL and MongoDB.

## Service Map

| Service | Default URL | Notes |
|---|---|---|
| Frontend | http://localhost:3000 | React app in development, Nginx on Docker |
| Backend API | http://localhost:5000 | Express API mounted at `/api` |
| Backend Health | http://localhost:5000/health | Returns `healthy` when the API is up |
| PostgreSQL | localhost:5432 | `disaster_db` |
| MongoDB | localhost:27017 | `disaster_logs` |

## Prerequisites

- Node.js 20 or newer
- npm
- Docker Desktop or Docker Engine with Docker Compose

## Recommended: Run Everything With Docker Compose

This is the fastest way to start the full stack because the backend depends on PostgreSQL and MongoDB.

From the repository root:

```bash
docker compose -f docker/docker-compose.yml up --build -d
```

Then open:

- Frontend: http://localhost:3000
- Backend health: http://localhost:5000/health

To stop the stack:

```bash
docker compose -f docker/docker-compose.yml down
```

To remove volumes as well:

```bash
docker compose -f docker/docker-compose.yml down -v
```

## Local Development

Run the databases first, then start the backend and frontend in separate terminals.

### 1. Start the backing services

Use Docker Compose for PostgreSQL and MongoDB:

```bash
docker compose -f docker/docker-compose.yml up -d postgres mongodb
```

### 2. Configure the backend environment

The backend reads configuration from environment variables defined in [backend/.env.example](backend/.env.example).

Minimum values for local development:

- `NODE_ENV=development`
- `PORT=5000`
- `FRONTEND_URL=http://localhost:3000`
- `POSTGRES_HOST=localhost`
- `POSTGRES_PORT=5432`
- `POSTGRES_DB=disaster_db`
- `POSTGRES_USER=disaster_user`
- `POSTGRES_PASSWORD=DisasterPass123`
- `MONGO_URI=mongodb://localhost:27017/disaster_logs`
- `JWT_SECRET` and `JWT_REFRESH_SECRET` must be set to non-empty values

Optional but supported:

- `UPLOAD_PATH=./uploads`
- `MAX_FILE_SIZE=5242880`
- SMTP settings for alert email delivery
- External API keys for weather and maps features

### 3. Start the backend

From `backend/`:

```bash
npm install
npm run dev
```

Useful backend scripts from `backend/package.json`:

- `npm start` starts the API with `node src/server.js`
- `npm run dev` starts the API with `nodemon`
- `npm test` runs the Jest suite
- `npm run lint` runs ESLint
- `npm run seed` loads demo data into PostgreSQL and MongoDB

The backend listens on `http://localhost:5000` by default and connects to:

- PostgreSQL via `POSTGRES_*`
- MongoDB via `MONGO_URI`

### 4. Configure the frontend environment

The frontend uses [frontend/.env](frontend/.env) for its API URL.

Current default:

```bash
REACT_APP_API_URL=http://localhost:5000/api
```

If you change the backend host or port, update this value so the React app can reach the API and refresh endpoint.

### 5. Start the frontend

From `frontend/`:

```bash
npm install
npm start
```

The app starts on `http://localhost:3000`.

## Demo Data

The seeding script in [backend/src/config/seed.js](backend/src/config/seed.js) creates demo accounts and sample operational data.

Demo credentials:

| Role | Email | Password |
|---|---|---|
| Admin | admin@disaster.com | Admin@123 |
| Volunteer | volunteer@disaster.com | Vol@123 |
| Citizen | citizen@disaster.com | Cit@123 |

Run the seed script after the databases are available and the backend environment is configured:

```bash
cd backend
npm run seed
```

## Docker Notes

The container setup expects these internal service names when running through Compose:

- PostgreSQL: `postgres`
- MongoDB: `mongodb`
- Backend: `backend`

The frontend Nginx config proxies `/api/` and `/socket.io/` requests to the backend container, so the browser only needs to talk to `http://localhost:3000`.

## Quick Health Check

If the stack is running but the UI is not loading, check these endpoints first:

- `http://localhost:5000/health`
- `http://localhost:3000/health`
- `http://localhost:5000/api/auth`

If the backend fails to start, verify that PostgreSQL and MongoDB are reachable and that `JWT_SECRET` and `JWT_REFRESH_SECRET` are set.
