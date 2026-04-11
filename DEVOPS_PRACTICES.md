# DevOps Best Practices

## Git Branching Strategy (GitFlow)

```
main          ← production-ready code, tagged releases
  └── develop ← integration branch for features
        ├── feature/incident-reporting
        ├── feature/volunteer-dashboard
        ├── feature/shelter-locator
        └── hotfix/critical-auth-fix  ← branches from main
```

### Branch Naming
| Type      | Pattern                       | Example                         |
|-----------|-------------------------------|---------------------------------|
| Feature   | `feature/<short-description>` | `feature/risk-map-clustering`   |
| Bugfix    | `bugfix/<issue-id>-<name>`    | `bugfix/42-volunteer-auth`      |
| Hotfix    | `hotfix/<issue-id>-<name>`    | `hotfix/55-jwt-expiry`          |
| Release   | `release/<version>`           | `release/1.2.0`                 |
| Chore     | `chore/<description>`         | `chore/update-dependencies`     |

### Commit Message Convention (Conventional Commits)
```
<type>(<scope>): <short summary>

feat(incidents): add image upload to incident reports
fix(auth): resolve JWT refresh race condition
chore(deps): upgrade express to 4.18.2
docs(api): add OpenAPI spec for predictions endpoint
test(volunteers): add unit tests for task assignment
ci(pipeline): add Trivy container scanning step
```

---

## Container Security

### Image Scanning
- All images scanned by Trivy in CI/CD pipeline
- Scan runs on both filesystem and final Docker image
- CRITICAL/HIGH vulnerabilities block deployment
- Results uploaded to GitHub Security tab as SARIF

### Base Image Policy
- Use `alpine`-based images wherever possible
- Pin exact digest versions in production:
  ```dockerfile
  FROM node:20-alpine@sha256:<digest>
  ```
- Run as non-root user (UID 1001)
- Use `dumb-init` as PID 1 for proper signal handling

---

## Secrets Management

### Local Development
- Use `.env` files (never commit to git)
- Copy `.env.example` and fill values

### CI/CD
- Store secrets as GitHub Actions Secrets
- Never echo secrets in logs
- Rotate secrets on a 90-day schedule

---

## Automated Testing Strategy

| Layer              | Tool        | Coverage Target |
|--------------------|-------------|-----------------|
| Unit (backend)     | Jest        | ≥ 60%           |
| Integration (API)  | Supertest   | All endpoints   |
| Frontend UI        | React Testing Library | Critical flows |
| Security           | Trivy, npm audit | 0 HIGH/CRIT |
| Load Testing       | k6          | p95 < 500ms @ 100 RPS |

### k6 Load Test Example
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 100,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const res = http.get('https://disaster.yourdomain.com/api/incidents');
  check(res, { 'status 200': r => r.status === 200 });
  sleep(1);
}
```

---

## Rollback Procedure

```bash
# 1. Identify a stable image tag in your registry
# 2. Update deployment target to that image tag
# 3. Redeploy application container(s)
# 4. Verify API health and frontend smoke tests
```
