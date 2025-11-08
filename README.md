# Global Consular Collaboration Network

A unified platform for international consular services, enabling embassies and consulates worldwide to collaborate seamlessly while serving citizens in need.

---

## 🧠 The Core Concept

A global consular collaboration network where:

- **Citizens file cases** (lost passports, visa issues, emergencies, document attestations, etc.)

- **Embassies and consulates** log in to handle their country's cases, but also have channels to:
  - Request help from other embassies (e.g. "Our citizen is stuck in X country where we don't have a mission")
  - Share resources, local information, or coordinate evacuation / emergency responses
  - Escalate complex inter-embassy cases (like when someone has dual citizenship or mixed documentation)

- **Regional "hub" embassies** could support smaller ones without full consular tech infrastructure

Instead of each embassy having its own isolated workflow, everything plugs into one secure shared ecosystem — **multi-tenant, but interoperable**.

---

## 🌍 Key Features and Modules

### 1. Citizen Portal

- **Unified Application Form** for consular help (adaptive to country & case type)
- **Case Tracking Dashboard** with multilingual support and SMS updates
- **Document Upload & Verification**
- **AI Assistant** (Claude, GPT, etc.) to guide users step-by-step
- **Offline-first / low-bandwidth mode** (progress saved locally, minimal graphics)

### 2. Embassy Staff Portal

**Case Management System**
- View, assign, and update citizen cases
- Filter by urgency, location, or type
- Access built-in templates for documents (letters, certificates, travel permits)

**Embassy-to-Embassy Collaboration Tools**
- Secure chat / message threads between missions
- Shared "help requests" queue (e.g. smaller countries can ask bigger ones to process biometric data or issue emergency documents)
- Shared resource hub for verified local services (lawyers, hospitals, shelters)

**Analytics & Reporting**
- Daily summaries of case loads, response times, and open requests
- Automatic escalation for delayed or unresolved cases

### 3. Cross-Embassy Coordination

- **Inter-Embassy Request API**
  - e.g., "Embassy of Kenya requests document verification support from Embassy of India"
- **Common Protocol Layer** for case exchange (standard JSON schema)
- **Mutual Verification Framework** – embassies can digitally sign responses, reducing fraud
  - Could use blockchain-style audit logs for transparency between missions

### 4. Admin / Supervision Layer

- **Central admin** (like a UN or IOM-style oversight) that can view aggregated metrics
- **Fraud detection**, performance analytics, and workflow optimization

---

## 🔒 Tech & Architecture Ideas

| Layer | Description |
|-------|-------------|
| **Frontend** | React or SvelteKit progressive web app (PWA) — lightweight and multilingual |
| **Backend** | Node.js / Express / FastAPI with role-based access (citizen, embassy, admin) |
| **Database** | PostgreSQL with row-level security for embassy isolation |
| **Embassy Federation Layer** | Each embassy instance communicates through secure APIs with others (OAuth + embassy certificates) |
| **AI Integration** | Anthropic (for dialogue guidance), optional GPT for document summarization or translation |
| **Multi-language engine** | i18n JSON dictionaries + auto-translation + local overrides for embassy-specific dialects |
| **Accessibility** | WCAG 2.2 compliance; full lang tagging and screen-reader friendly structure |

---

## 💡 Why This Makes Sense

**For small countries:** They often can't afford full consular infrastructure in every region. Through this system, they could "plug in" to partner embassies' facilities.

**For big countries:** They get standardized workflows and fewer ad-hoc emails from smaller missions.

**For citizens:** They get transparency — no more wondering if their email to the embassy was even read.

**For global crises:** The system becomes a real-time coordination platform (e.g. evacuation alerts, emergency travel documents).

---

## 🎯 Potential MVP

This is the initial concept for a Minimum Viable Product. More detailed specifications and requirements will follow as the project develops.

---

## 📋 Project Status

**Phase:** ✅ MVP Implementation Complete

**Implemented Features:**
- ✅ Backend API with JWT authentication
- ✅ PostgreSQL database with Row-Level Security
- ✅ React PWA frontend with offline support
- ✅ Multi-language support (10 languages)
- ✅ Anthropic Claude AI integration
- ✅ Tamper-evident audit logging with hash chains
- ✅ Case management system
- ✅ Inter-embassy collaboration framework
- ✅ Admin dashboard and metrics

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+ and npm
- **PostgreSQL** 13+
- (Optional) **Docker** for containerized deployment

### Environment Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/whxshk/IOMtest.git
   cd IOMtest
   ```

2. **Backend Configuration**
   ```bash
   cd backend
   cp .env.example .env
   ```

   Edit `.env` and configure:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/consular_db
   JWT_SECRET=your-super-secret-key
   ANTHROPIC_API_KEY=your-anthropic-api-key
   CORS_ORIGIN=http://localhost:3000
   ```

3. **Frontend Configuration**
   ```bash
   cd ../frontend
   cp .env.example .env
   ```

   Edit `.env`:
   ```env
   REACT_APP_API_URL=http://localhost:5000
   ```

### Database Setup

1. **Create PostgreSQL database**
   ```bash
   createdb consular_db
   ```

2. **Run schema migration**
   ```bash
   psql -U youruser -d consular_db -f database/schema.sql
   ```

3. **Seed initial data**
   ```bash
   psql -U youruser -d consular_db -f database/seed_data.sql
   ```

### Installation & Running

**Backend:**
```bash
cd backend
npm install
npm run dev
```
The API will run on `http://localhost:5000`

**Frontend:**
```bash
cd frontend
npm install
npm start
```
The web app will open at `http://localhost:3000`

### Default Login Credentials

After seeding the database, you can login with:

**Admin:**
- Email: `admin@consular-platform.org`
- Password: `Password123!`

**Embassy Staff (US Embassy):**
- Email: `john.smith@usembassy.gov`
- Password: `Password123!`

**Citizen User:**
- Email: `michael.j@example.com`
- Password: `Password123!`

---

## 📁 Project Structure

```
consular-collab-platform/
├── frontend/              # React PWA frontend
│   ├── public/           # Static assets, manifest, service worker
│   └── src/
│       ├── components/   # Reusable UI components
│       ├── pages/        # Page components
│       ├── i18n/         # Translation files (10 languages)
│       ├── services/     # API client
│       ├── App.jsx       # Main application
│       └── index.js      # Entry point
│
├── backend/              # Node.js/Express API
│   └── src/
│       ├── config/       # Database configuration
│       ├── middleware/   # Auth and other middleware
│       ├── routes/       # API routes (auth, cases, admin)
│       ├── services/     # External services (AI, SMS)
│       ├── utils/        # Utilities (audit logging)
│       └── index.js      # Server entry point
│
├── database/
│   ├── schema.sql        # PostgreSQL schema with RLS
│   └── seed_data.sql     # Initial test data
│
└── docs/                 # Documentation
```

---

## 🔐 Security Features

1. **JWT Authentication** - Secure token-based auth with refresh tokens
2. **Row-Level Security** - PostgreSQL RLS for multi-tenant data isolation
3. **Audit Logging** - Tamper-evident blockchain-style hash chain
4. **HTTPS/TLS** - All communications encrypted in transit
5. **Role-Based Access Control** - Strict permission system (citizen, staff, admin)
6. **Digital Signatures** - Inter-embassy requests are cryptographically signed

---

## 🌐 API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/register` - Citizen registration
- `POST /api/v1/auth/refresh` - Refresh access token
- `GET /api/v1/auth/me` - Get current user info

### Cases
- `POST /api/v1/cases` - Create new case
- `GET /api/v1/cases` - List cases (filtered by role)
- `GET /api/v1/cases/:id` - Get case details
- `PUT /api/v1/cases/:id` - Update case (staff only)
- `POST /api/v1/cases/:id/notes` - Add case note
- `POST /api/v1/cases/:id/request-assistance` - Request inter-embassy help

### AI Assistant
- `POST /api/v1/ai/citizen-assist` - Get AI guidance for citizens
- `POST /api/v1/ai/staff-assist` - AI tools for staff (summarize, translate)

### Admin
- `GET /api/v1/admin/metrics` - Dashboard metrics
- `GET /api/v1/admin/audit-logs` - View audit logs
- `GET /api/v1/admin/audit-logs/verify` - Verify hash chain integrity
- `POST /api/v1/admin/embassies` - Create embassy
- `POST /api/v1/admin/staff` - Create staff user

For full API documentation, see `docs/API.md`

---

## 🌍 Multi-Language Support

The platform supports 10 languages out of the box:
- English (en)
- French (fr)
- Hindi (hi)
- Spanish (es)
- Arabic (ar) - RTL support
- Swahili (sw)
- Bengali (bn)
- Yoruba (yo)
- Tamil (ta)
- Telugu (te)

Translation files are located in `frontend/src/i18n/`. The UI automatically switches to RTL layout for Arabic and other RTL languages.

---

## 🤖 AI Integration

The platform integrates **Anthropic Claude** for:

**Citizen Assistance:**
- Answering questions about consular services
- Guiding users through case submission
- Providing information about required documents

**Staff Tools:**
- Summarizing long case histories
- Translating communications
- Drafting official documents
- Analyzing case urgency

To enable AI features, set `ANTHROPIC_API_KEY` in the backend `.env` file.

---

## 🧪 Testing

Run the test suite:
```bash
cd backend
npm test
```

---

## 📦 Deployment

### Production Build

**Frontend:**
```bash
cd frontend
npm run build
```
Serves static files from `frontend/build/`

**Backend:**
```bash
cd backend
NODE_ENV=production npm start
```

### Docker Deployment

_(Docker configuration to be added)_

### Environment Variables (Production)

Ensure these are set securely in production:
- Strong `JWT_SECRET` (32+ random characters)
- `DATABASE_URL` pointing to production database
- `ANTHROPIC_API_KEY` for AI features
- `CORS_ORIGIN` set to your frontend domain
- SMS/Email service credentials

---

## 🔍 Monitoring & Audit

- **Audit Logs:** All actions are logged with tamper-evident hash chains
- **Metrics Dashboard:** Admin panel shows case volumes, response times, and system health
- **Health Check:** `GET /health` endpoint for uptime monitoring

---

## 🤝 Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🆘 Support

For issues or questions:
- Open an issue on GitHub
- Contact: support@consular-platform.org

---

## 🙏 Acknowledgments

- Built with support from international consular services
- Powered by Anthropic Claude AI
- Designed with accessibility and inclusivity in mind

---

**Built with ❤️ for global citizens in need**
