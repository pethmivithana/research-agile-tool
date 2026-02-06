# Docker Setup for FastAPI Backend

Run the entire backend stack (FastAPI + MongoDB) using Docker and Docker Compose.

## Prerequisites

- Docker installed ([Install Docker](https://docs.docker.com/install/))
- Docker Compose installed ([Install Docker Compose](https://docs.docker.com/compose/install/))

## Quick Start

### 1. Build and Run with Docker Compose

```bash
# From the project root directory
docker-compose up -d

# View logs
docker-compose logs -f backend

# Check status
docker-compose ps
```

This will start:
- **MongoDB** on `mongodb://localhost:27017`
- **FastAPI** on `http://localhost:4000`

### 2. Access the API

- **API Docs**: http://localhost:4000/docs
- **Health Check**: http://localhost:4000/health
- **MongoDB Shell**: `docker-compose exec mongodb mongosh`

### 3. Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (careful - deletes data!)
docker-compose down -v
```

---

## Building the Backend Image

### Build Docker Image

```bash
cd backend
docker build -t research-agile-backend:latest .
```

### Run Backend Container

```bash
docker run -d \
  --name research-agile-backend \
  -p 4000:4000 \
  -e MONGODB_URI=mongodb://host.docker.internal:27017/research-agile-tool \
  -e JWT_SECRET=your-secret \
  -e PORT=4000 \
  -e CORS_ORIGIN=http://localhost:3000 \
  research-agile-backend:latest
```

---

## Docker Compose Details

### Services

#### MongoDB
- **Image**: mongo:7.0
- **Port**: 27017
- **Database**: research-agile-tool
- **Data Volume**: `mongodb_data` (persistent)
- **Health Check**: Built-in

#### Backend
- **Build**: From `backend/Dockerfile`
- **Port**: 4000
- **Depends On**: MongoDB (waits for health check)
- **Volumes**: Mounts `./backend` for code reload
- **Health Check**: Pings `/health` endpoint

### Environment Variables

Defined in `docker-compose.yml`:
```yaml
MONGODB_URI: mongodb://mongodb:27017/research-agile-tool
JWT_SECRET: your-secret-key-change-in-production
PORT: 4000
CORS_ORIGIN: http://localhost:3000
PYTHON_SERVICE_URL: http://localhost:8000
```

**For production**: Create a `.env` file and use:
```yaml
env_file:
  - .env
```

---

## Common Commands

### View Logs
```bash
# All services
docker-compose logs

# Specific service
docker-compose logs backend
docker-compose logs mongodb

# Follow logs in real-time
docker-compose logs -f
```

### Execute Commands

```bash
# Run Python command in backend
docker-compose exec backend python -c "import app; print('OK')"

# Access MongoDB shell
docker-compose exec mongodb mongosh

# Install additional Python packages
docker-compose exec backend pip install package-name
```

### Restart Services

```bash
# Restart one service
docker-compose restart backend

# Restart all services
docker-compose restart

# Rebuild and restart
docker-compose up -d --build
```

### Remove Everything

```bash
# Stop and remove containers (keeps volumes)
docker-compose down

# Stop and remove everything including volumes
docker-compose down -v
```

---

## Production Deployment

### Using Environment Variables

Create a `.env` file:
```bash
MONGODB_URI=mongodb://secure-mongodb-host:27017/db
JWT_SECRET=secure-random-secret-key
PORT=4000
CORS_ORIGIN=https://yourdomain.com
PYTHON_SERVICE_URL=https://ml-service.yourdomain.com
```

Update `docker-compose.yml`:
```yaml
services:
  backend:
    env_file:
      - .env
```

### Docker Swarm or Kubernetes

For production Kubernetes deployment:

```yaml
# backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: research-agile-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: research-agile-backend
  template:
    metadata:
      labels:
        app: research-agile-backend
    spec:
      containers:
      - name: backend
        image: your-registry/research-agile-backend:latest
        ports:
        - containerPort: 4000
        env:
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: mongodb-uri
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: jwt-secret
        livenessProbe:
          httpGet:
            path: /health
            port: 4000
          initialDelaySeconds: 10
          periodSeconds: 10
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: research-agile-backend
spec:
  selector:
    app: research-agile-backend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 4000
  type: LoadBalancer
```

Deploy to Kubernetes:
```bash
kubectl apply -f backend-deployment.yaml
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs backend

# Rebuild the image
docker-compose up -d --build

# Check if port is in use
lsof -i :4000
```

### MongoDB Connection Error

```bash
# Ensure MongoDB container is running
docker-compose ps

# Check MongoDB logs
docker-compose logs mongodb

# Verify MongoDB is healthy
docker-compose exec mongodb mongosh --eval "db.version()"
```

### Code Changes Not Reflecting

The `docker-compose.yml` mounts `./backend` volume, so changes should reflect immediately. If not:

```bash
# Restart the backend service
docker-compose restart backend

# Or rebuild
docker-compose up -d --build
```

### Permission Errors

```bash
# On Linux, you might need sudo
sudo docker-compose up

# Or add user to docker group
sudo usermod -aG docker $USER
```

---

## Performance Tips

### Resource Limits

For development (in `docker-compose.yml`):
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

### Database Optimization

For production MongoDB:
```yaml
mongodb:
  image: mongo:7.0
  command: mongod --wiredTigerCacheSizeGB 2
  volumes:
    - mongodb_data:/data/db
```

### Multi-stage Builds

For smaller Docker images (advanced):
```dockerfile
FROM python:3.11-slim as builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --user -r requirements.txt

FROM python:3.11-slim
WORKDIR /app
COPY --from=builder /root/.local /root/.local
COPY . .
ENV PATH=/root/.local/bin:$PATH
CMD ["python", "main.py"]
```

---

## Monitoring and Logging

### Docker Stats

```bash
# Real-time resource usage
docker stats research-agile-backend

# Or all containers
docker-compose stats
```

### Centralized Logging (Optional)

Add to `docker-compose.yml`:
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
    labels: "service=research-agile-backend"
```

---

## Development vs Production

### Development
```bash
# Uses docker-compose with code mounting
docker-compose up
```

### Production
```bash
# Build production image
docker build -t research-agile-backend:prod -f Dockerfile.prod .

# Run with specific environment
docker run -d \
  --name backend-prod \
  -p 80:4000 \
  --env-file .env.prod \
  research-agile-backend:prod
```

---

## Clean Up

### Remove Unused Images

```bash
docker image prune

# Remove everything
docker system prune -a --volumes
```

### Stop All Containers

```bash
docker stop $(docker ps -aq)
```

---

## Next Steps

1. **Start containers**: `docker-compose up -d`
2. **Test API**: Visit http://localhost:4000/docs
3. **Connect frontend**: Update API URL to `http://localhost:4000`
4. **Deploy**: Push image to Docker Registry and deploy to production

---

## Resources

- [Docker Documentation](https://docs.docker.com)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [MongoDB Docker Image](https://hub.docker.com/_/mongo)
- [Python Docker Best Practices](https://docs.docker.com/language/python/build-images/)

---

Happy containerizing! 🐳
