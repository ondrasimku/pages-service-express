# Pages Service

## Docker

Run with Docker Compose:
```bash
docker-compose up --build
```

## API Endpoints

### Protected Routes (require JWT)

**Pages:**
- `GET /api/pages` - List user's pages
- `GET /api/pages/:id` - Get page by ID
- `POST /api/pages` - Create new page
- `PATCH /api/pages/:id` - Update page
- `DELETE /api/pages/:id` - Delete page
- `POST /api/pages/:id/publish` - Publish page with slug
- `POST /api/pages/:id/unpublish` - Unpublish page
- `GET /api/pages/:id/links` - Get bidirectional links
- `GET /api/pages/:id/backlinks` - Get pages linking to this page

**Folders:**
- `GET /api/folders` - List user's folders
- `GET /api/folders/:id` - Get folder by ID
- `POST /api/folders` - Create folder
- `PATCH /api/folders/:id` - Update folder
- `DELETE /api/folders/:id` - Delete folder
- `POST /api/folders/:id/move` - Move folder

**Health:**
- `GET /health` - Service health check

### Public Routes

- `GET /api/public/:slug` - Get published page by slug