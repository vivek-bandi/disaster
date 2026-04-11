# Smart Disaster Response & Prediction System
### Cloud-Native DevOps Capstone Project

## Overview
A full-stack, cloud-native web application for disaster preparedness and emergency response. Integrates prediction, incident reporting, volunteer coordination, shelter discovery, and community support with a modern React dashboard.

## Tech Stack
| Layer | Technology |
|---|---|
| Frontend | React 18, Tailwind CSS, Recharts, Leaflet.js |
| Backend | Node.js 20, Express.js, REST APIs |
| Auth | JWT, bcrypt, Role-based access (citizen / volunteer / admin) |
| Databases | PostgreSQL 15 (structured), MongoDB 7 (logs/events) |
| Containers | Docker, Docker Compose |
| CI/CD | GitHub Actions |

## Project Structure
```
disaster-response/
├── frontend/          # React SPA
├── backend/           # Express.js API
├── docker/            # Docker Compose files
└── .github/workflows/ # CI/CD pipelines
```

## Quick Start (Local)
```bash
# Clone and setup
git clone <repo-url>
cd disaster-response

# Start all services with Docker Compose
docker-compose -f docker/docker-compose.yml up -d

# Frontend: http://localhost:3000
# Backend API: http://localhost:5000
```

## Default Credentials
| Role | Email | Password |
|---|---|---|
| Admin | admin@disaster.com | Admin@123 |
| Volunteer | volunteer@disaster.com | Vol@123 |
| Citizen | citizen@disaster.com | Cit@123 |

## Modules
1. **Disaster Prediction** – ML-based risk analysis from environmental data
2. **Incident Reporting** – Submit disasters with location, severity, images
3. **Volunteer Management** – Register, accept tasks, coordinate rescue
4. **Resource Tracking** – Shelters, supplies, rescue teams
5. **Shelter Locator** – Find nearest shelters with capacity
6. **Community Help Requests** – Food, medical, evacuation requests
7. **Alert System** – Real-time threshold-based notifications
8. **Risk Advisory** – Location-based safety analysis
9. **Risk Map** – Interactive color-coded disaster zones
10. **Admin Dashboard** – Central monitoring and management
