# PolicyAI: Cache-Augmented Generation (CAG) Company Policy Assistant

**PolicyAI** is an enterprise-grade AI assistant that answers employee questions strictly and accurately using company policy documents, powered by **Cache-Augmented Generation (CAG)**, local **Ollama** inference, **MongoDB**, **Express**, and **React**.

---

## 1. What is Cache-Augmented Generation (CAG)?

In traditional Retrieval-Augmented Generation (RAG), documents are fragmented into arbitrary chunks, indexed into high-dimensional vector databases, and dynamically queried using approximate cosine similarity for every single question. For enterprise policies, RAG introduces significant friction:
- **Retrieval Drift & Fragmentation:** Answers fail when a crucial clause spans multiple split chunks.
- **Per-Query Latency:** Embedding questions and querying vector stores adds 200–800ms of overhead before the LLM even begins generating.
- **Infrastructure Overhead:** Requires vector databases, embedding pipelines, chunking tuning, and microservices.

**Cache-Augmented Generation (CAG)** leverages the expanding context windows of modern LLMs (8K–128K tokens). Because enterprise policy manuals are bounded (typically 5,000–30,000 tokens) and change infrequently:
1. **Pre-Load into RAM:** The authoritative policy corpus is extracted, structured, and loaded into an in-memory cache **once**.
2. **Zero Retrieval Delay:** Employee queries immediately reuse the pre-assembled context from memory (0–1ms context preparation).
3. **Inference Cache Reuse:** Local engines like Ollama cache the key-value (KV) representations of identical prompt prefixes, accelerating prompt evaluation.
4. **Guaranteed Consistency:** The LLM inspects the entire unified policy manual rather than isolated chunks, eliminating missed context and hallucinations.
5. **Instant Invalidation:** When policies are uploaded, updated, or removed, the in-memory cache is automatically invalidated.

---

## 2. Technology Stack

- **Frontend:** React 18, Vite, Tailwind CSS, Lucide Icons
- **Backend:** Node.js, Express.js
- **Database:** MongoDB with Mongoose
- **Local AI:** Ollama running locally (supports `llama3.2:1b`, `llama3.2:3b`, `gemma3:4b`, etc.)
- **Document Processing:** `pdf-parse` (PDF), `mammoth` (DOCX), native `fs` (TXT)
- **Cache:** In-memory Node.js singleton cache service

---

## 3. Architecture & Project Structure

```
PolicyAI/
├── frontend/                   # React Vite Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx           # Clean navigation with context status indicator
│   │   │   ├── DocumentUploadModal.jsx
│   │   │   └── TextInspectorModal.jsx
│   │   ├── pages/
│   │   │   ├── AdminDashboard.jsx   # Page 1: Policy management & cache controls
│   │   │   └── EmployeeChat.jsx     # Page 2: Chat with citations & CAG metrics
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── backend/                    # Express Backend
│   ├── controllers/
│   │   ├── documentController.js
│   │   ├── contextController.js
│   │   └── chatController.js
│   ├── models/
│   │   └── Document.js
│   ├── routes/
│   │   ├── documentRoutes.js
│   │   ├── contextRoutes.js
│   │   ├── chatRoutes.js
│   │   └── healthRoutes.js
│   ├── services/
│   │   ├── documentService.js     # Text extraction (PDF, DOCX, TXT) & token estimates
│   │   ├── contextService.js      # Structured corpus assembly & checksums
│   │   ├── cacheService.js        # In-memory CAG context cache & hit/miss metrics
│   │   ├── ollamaService.js       # Local Ollama HTTP API
│   │   └── cagService.js          # Core CAG query orchestrator & grounding
│   ├── middleware/
│   │   ├── auth.js                # Administrator authorization
│   │   ├── upload.js              # Multer storage for documents
│   │   └── errorHandler.js
│   ├── uploads/                   # Private local storage for original files
│   ├── app.js
│   ├── server.js
│   └── package.json
│
├── sample-documents/           # Standard company policy documents
│   ├── Remote_Work_Policy.txt
│   ├── Leave_and_Attendance_Policy.txt
│   ├── Travel_and_Expense_Policy.txt
│   └── Code_of_Conduct_and_Ethics.txt
│
├── package.json                # Root orchestration scripts
├── .gitignore
└── README.md
```

---

## 4. Prerequisites

1. **Node.js** (v18 or higher recommended)
2. **MongoDB** (running locally on port 27017 or remote MongoDB URI)
3. **Ollama** (running locally on port 11434 with `llama3.2:3b` installed)

---

## 5. Setup and Launch Instructions

### Step 1: Install Dependencies
Open a terminal in the `PolicyAI` root folder:

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Step 2: Configuration
No separate `.env` file is required to get started! Sensible defaults are built-in:
- **Port:** `5000` (Backend), `5173` (Frontend)
- **MongoDB URI:** `mongodb://127.0.0.1:27017/policyai`
- **Ollama URL:** `http://localhost:11434`
- **Dedicated AI Model:** `llama3.2:3b`
- **Admin API Key:** `admin-secret`

If you wish to customize these settings, you can create a `.env` file in the `backend/` directory:
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/policyai
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b
ADMIN_API_KEY=admin-secret
```

### Step 3: Run the Application

#### Option A: Run in Two Terminals (Recommended)
**Terminal 1 (Backend Server):**
```bash
cd backend
npm run dev
```

**Terminal 2 (Frontend Client):**
```bash
cd frontend
npm run dev
```

Open your browser at **http://localhost:5173**.

---

## 6. Testing the Complete Workflow

Follow this step-by-step verification:

### 1. Load Policy Documents
1. Open **http://localhost:5173** and click the **Admin Dashboard** tab.
2. Click **"Load Sample Policies"** (or upload your own PDF, DOCX, or TXT file).
3. The server will extract text, parse sections, count words/tokens, and generate SHA-256 checksums.

### 2. Prepare & Cache Context (CAG Engine)
1. On the Admin Dashboard, inspect the **CAG Cache Status** card.
2. Click **"Prepare / Refresh Context"**.
3. View the context preparation time (e.g. 15ms), estimated token size (~3,500 tokens), version, and checksum.
4. Click **"Preview Assembled Context"** to inspect the unified manual provided to Ollama.

### 3. Ask Questions (Employee Chat)
1. Switch to the **Employee Chat** tab.
2. Click a preset prompt:
   - *"What are the core hours for remote workers?"*
   - *"How many annual leave days do I accrue each month?"*
   - *"What is the daily meal per diem for domestic travel?"*
3. Notice:
   - The assistant provides grounded answers with specific **document titles**, **sections**, and **verbatim excerpts**.
   - The message footer displays: `CAG Cache Hit (0ms prep)` and inference latency.
4. Test an ungrounded question:
   - *"What is the company policy regarding lunar and space travel?"*
   - The assistant identifies that no policy exists and refuses to hallucinate: *"I could not find information regarding this in the provided company policies."*

### 4. Cache Invalidation and Auto-Refresh
1. Return to the **Admin Dashboard**.
2. Toggle a document from **Published** to **Draft**, or upload a new policy.
3. Notice that the top navbar indicator immediately changes from **`Context: Valid & Primed`** (Green) to **`Context: Needs Refresh`** (Amber).
4. Click **"Prepare / Refresh Context"** to immediately rebuild and re-cache the updated context.
5. All new employee questions are immediately answered using the updated policies.

---

## 7. Security & Access Control

- **Role-Based Access Separation:** Regular employees landing on PolicyAI only have access to the **Employee Chat** interface. They cannot view raw document files, extracted text, or administrative controls.
- **Admin Authentication Gate:** Accessing the **Admin Dashboard** requires authenticating with the Administrator Key (default: `admin-secret`).
- **Session Protection & Logout:** The admin session is held securely in the browser session storage with a one-click **Logout** button that terminates access.
- **Protected Endpoints:** Document listing (`GET /api/documents`), full text inspection (`GET /api/documents/:id`), context preview (`GET /api/context/preview`), file uploads, replacements, deletions, and cache refresh all enforce strict `403 Forbidden` checks if the `x-admin-key` header is missing or incorrect.
- **Private Storage:** Original uploaded files are kept in private local disk storage (`backend/uploads/`) and removed upon document deletion.
- **File Validation:** Restricts uploads strictly to `.pdf`, `.docx`, and `.txt` files up to 20MB.

---

## 8. License
MIT License. Built for enterprise policy workflows with Cache-Augmented Generation.
