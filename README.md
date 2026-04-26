# banking-app-support — Support Service

Node.js 20 / Express support service. Handles customer service tickets, message threads, file attachments, and support agent administration.

Part of the mock consumer banking application.

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
| `POST` | `/tickets/:id/messages` | Bearer | Post message |
| `POST` | `/tickets/:id/rate` | Bearer | Rate resolved ticket |
| `POST` | `/attachments/upload` | Bearer | Upload file |
| `GET` | `/attachments/download/:filename` | Bearer | Download file |
| `GET` | `/admin/tickets` | Bearer (admin) | List all tickets |
| `GET` | `/admin/tickets/:id` | Bearer (admin) | Get any ticket |
| `GET` | `/admin/stats` | Bearer (admin) | Ticket statistics |
| `PATCH` | `/admin/tickets/:id/assign` | Bearer (admin) | Assign ticket |
| `GET` | `/health` | No | Health check |

---

## curl Examples

### Create ticket

```bash
curl -s -X POST http://localhost:8004/tickets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"subject":"My card is not working"}' | jq
```

### Post message

```bash
curl -s -X POST http://localhost:8004/tickets/<TICKET_ID>/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"body":"Can you please help me?"}' | jq
```

### Upload attachment

```bash
curl -s -X POST http://localhost:8004/attachments/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/file.pdf" | jq
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://banking:banking@localhost:5432/banking` | PostgreSQL connection string |
| `JWT_SECRET` | `supersecret123` | JWT verification secret |
| `PORT` | `8004` | Service port |
