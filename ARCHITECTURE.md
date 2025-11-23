# System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                             │
│                      http://localhost:3000                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ HTTP Requests
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NGINX WEB SERVER                              │
│                        (Port 80)                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Serves React App (Static Files)                         │  │
│  │  - index.html, JavaScript bundles, CSS                   │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ API Requests (/api/*)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXPRESS API SERVER                            │
│                    (Node.js, Port 5000)                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Routes & Controllers                                     │  │
│  │  - GET /api/wheels         (List all)                    │  │
│  │  - POST /api/wheels        (Add wheel)                   │  │
│  │  - GET /api/wheels/:id     (Get one)                     │  │
│  │  - PUT /api/wheels/:id     (Update)                      │  │
│  │  - DELETE /api/wheels/:id  (Delete)                      │  │
│  │  - GET /api/wheels/search/:query (Search)               │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Business Logic                                          │  │
│  │  - SKU Generation                                        │  │
│  │  - QR Code Generation (Base64)                          │  │
│  │  - Data Validation                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ SQL Queries
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   POSTGRESQL DATABASE                            │
│                        (Port 5432)                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Table: wheels                                           │  │
│  │  - id (Primary Key)                                      │  │
│  │  - sku (Unique)                                          │  │
│  │  - year, make, model                                     │  │
│  │  - wheel_size, offset, bolt_pattern                     │  │
│  │  - condition, quantity, location                        │  │
│  │  - notes, qr_code                                        │  │
│  │  - created_at, updated_at                                │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Persistent Storage Volume                               │  │
│  │  /var/lib/postgresql/data                                │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Adding a Wheel

```
1. User fills form
   ↓
2. Frontend validates input
   ↓
3. POST request to /api/wheels
   ↓
4. Backend generates SKU
   ↓
5. Backend generates QR code (Base64)
   ↓
6. Backend inserts to database
   ↓
7. Database returns created record
   ↓
8. Backend sends response to frontend
   ↓
9. Frontend updates UI with new wheel
```

### Generating Label

```
1. User clicks "Label" button
   ↓
2. Modal opens with wheel data
   ↓
3. React renders 2"x2" label preview
   ↓
4. QR code rendered from SKU
   ↓
5. User chooses action:
   
   PRINT                SAVE                 COPY
     ↓                   ↓                    ↓
   window.print()   html2canvas()      html2canvas()
     ↓                   ↓                    ↓
   Print dialog     Download PNG       Clipboard API
```

## Docker Container Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    DOCKER HOST                               │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  wheel-network (Bridge Network)                    │    │
│  │                                                      │    │
│  │  ┌───────────────────────────────────────────┐    │    │
│  │  │  wheel-inventory-frontend                 │    │    │
│  │  │  - React App                              │    │    │
│  │  │  - Nginx                                  │    │    │
│  │  │  - Port: 3000:80                          │    │    │
│  │  └───────────────────────────────────────────┘    │    │
│  │                    ↓                               │    │
│  │  ┌───────────────────────────────────────────┐    │    │
│  │  │  wheel-inventory-backend                  │    │    │
│  │  │  - Node.js/Express                        │    │    │
│  │  │  - QR Code Generator                      │    │    │
│  │  │  - Port: 5000:5000                        │    │    │
│  │  └───────────────────────────────────────────┘    │    │
│  │                    ↓                               │    │
│  │  ┌───────────────────────────────────────────┐    │    │
│  │  │  wheel-inventory-db                       │    │    │
│  │  │  - PostgreSQL 15                          │    │    │
│  │  │  - Port: 5432:5432                        │    │    │
│  │  │  - Volume: postgres_data                  │    │    │
│  │  └───────────────────────────────────────────┘    │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Component Interaction

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  WheelForm   │────▶│     App      │◀────│  WheelList   │
└──────────────┘     └──────┬───────┘     └──────────────┘
                            │
                            │ State Management
                            │ - wheels[]
                            │ - selectedWheel
                            │ - loading
                            │
                     ┌──────▼───────┐
                     │  LabelModal  │
                     └──────────────┘
                     - QR Code Display
                     - Print Handler
                     - Save Handler
                     - Copy Handler
```

## Security Layers (Production)

```
Internet
   │
   ▼
[Firewall]
   │
   ▼
[Reverse Proxy - SSL/TLS]
   │
   ▼
[Docker Network - Isolated]
   │
   ├─▶ [Frontend - Public]
   │
   ├─▶ [Backend - Internal Only]
   │
   └─▶ [Database - Internal Only]
```

## File System Layout

```
/home/your-user/
└── wheel-inventory/
    ├── docker-compose.yml
    ├── start.sh
    ├── README.md
    ├── backend/
    │   ├── Dockerfile
    │   ├── package.json
    │   ├── node_modules/      (generated)
    │   └── server.js
    ├── frontend/
    │   ├── Dockerfile
    │   ├── nginx.conf
    │   ├── package.json
    │   ├── node_modules/      (generated)
    │   ├── build/             (generated)
    │   ├── public/
    │   │   └── index.html
    │   └── src/
    │       ├── App.js
    │       ├── App.css
    │       ├── index.js
    │       └── components/
    └── postgres_data/         (Docker volume)
        └── [database files]
```
