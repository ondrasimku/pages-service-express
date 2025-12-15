# Pages Service

Notion-like page editor service for Backboard with folder organization, smart bidirectional linking, and public publishing capabilities.

## Features

- **Page Management**: Create, edit, delete, and organize pages
- **Folder Organization**: Hierarchical folder structure for organizing pages
- **TipTap Editor**: Rich text editing with standard formatting features
- **Smart Linking**: Bidirectional page linking with backlinks tracking
- **Public Publishing**: Publish pages with unique slugs for public access
- **User Isolation**: Each user has their own private workspace

## Architecture

This service follows Clean Architecture principles with clear separation of concerns:

```
src/
├── config/          # Configuration and dependency injection
├── controllers/     # HTTP request handlers
├── dto/             # Data Transfer Objects for validation
├── middlewares/     # Cross-cutting concerns (auth, logging, error handling)
├── models/          # TypeORM entities (Page, Folder, PageLink)
├── repositories/    # Data access layer
├── routes/          # Route definitions
├── services/        # Business logic layer
├── logging/         # Structured logging with Pino
└── types/           # TypeScript types and DI types
```

## Database

The service uses its **own dedicated PostgreSQL database** (`pages_service_db`) on the shared PostgreSQL instance. This maintains complete service independence:

- No foreign key constraints to other services
- `user_id` stored as UUID for ownership tracking
- User validation via JWT token, not database lookups

### Models

- **Page**: Main page entity with title, content (JSONB), slug, published status
- **Folder**: Hierarchical folder structure with self-referencing parent
- **PageLink**: Junction table for bidirectional page linking

## Environment Variables

Copy `env.example` to `.env` and configure:

```bash
PORT=3002
NODE_ENV=development

DB_HOST=postgres
DB_PORT=5432
DB_NAME=pages_service_db
DB_USER=postgres
DB_PASSWORD=postgres

JWT_PUBLIC_KEY_PATH=./keys/public.pem

OTEL_ENABLED=true
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://apm-server:4317
OTEL_SERVICE_NAME=pages-service
```

## Development

### Prerequisites

- Node.js 20+
- PostgreSQL (via backboard-infra)
- JWT public key from user-service

### Setup

1. Install dependencies:
```bash
npm install
```

2. Copy JWT public key from user-service:
```bash
mkdir -p keys
cp ../user-service-express/keys/public.pem keys/
```

3. Create `.env` file from `env.example`

4. Start infrastructure (from backboard-infra):
```bash
cd ../backboard-infra
docker-compose up -d
```

5. Run migrations:
```bash
npm run migration:run
```

6. Start development server:
```bash
npm run dev
```

### Docker

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