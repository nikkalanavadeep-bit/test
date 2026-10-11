# ⚡ Gemini AI Chatbot

A modern, full-stack conversational AI chatbot application with a **strictly decoupled architecture** clearly differentiating the **Backend** and **Frontend**.

---

## 🏗️ Architecture Overview

```mermaid
graph TD
    subgraph Frontend ["Frontend (Browser UI)"]
        UI["index.html (Semantic Structure)"]
        CSS["style.css (Design System & Theme)"]
        JS["app.js (UI State, SSE Reader, Markdown)"]
    end

    subgraph Backend ["Backend (Node.js & Express)"]
        SRV["server.js (Express Server & Static Host)"]
        RTE["routes/chatRoutes.js (API Endpoints)"]
        CTRL["controllers/chatController.js (Request Handlers)"]
        SVC["services/geminiService.js (Gemini SDK Wrapper)"]
        CFG["config/models.js (Model Configurations)"]
    end

    subgraph External ["External Services"]
        LLM["Google Gemini API (gemini-1.5-flash / pro / 2.0)"]
    end

    UI --> JS
    JS -->|HTTP GET /api/status| RTE
    JS -->|HTTP POST SSE /api/chat/stream| RTE
    JS -->|HTTP POST JSON /api/chat| RTE
    RTE --> CTRL
    CTRL --> SVC
    SVC --> CFG
    SVC -->|@google/generative-ai| LLM
```

---

## 📁 Directory Structure & Differentiation

```
test-bts/
│
├── 📂 backend/                     # BACKEND: Server, API, & AI Services
│   ├── 📂 config/
│   │   └── models.js               # Supported Gemini models & configuration
│   ├── 📂 controllers/
│   │   └── chatController.js       # HTTP request handlers & SSE streaming logic
│   ├── 📂 routes/
│   │   └── chatRoutes.js           # REST API routes (/api/chat, /api/status, etc.)
│   ├── 📂 services/
│   │   └── geminiService.js        # Google Generative AI SDK client & session manager
│   └── server.js                   # Express server entry point & static file hosting
│
├── 📂 frontend/                    # FRONTEND: Client Web Application
│   ├── index.html                  # HTML5 layout, accessibility, & metadata
│   ├── style.css                   # Custom Vanilla CSS dark mode & micro-animations
│   └── app.js                      # DOM events, SSE streaming consumer, & Markdown parser
│
├── .env                            # Environment variables (GEMINI_API_KEY, PORT)
├── .env.example                    # Template environment variables
├── package.json                    # Project configuration & npm scripts
└── README.md                       # Documentation & architectural overview
```

---

## ⚖️ Responsibilities: Backend vs Frontend

| Dimension | 🖥️ Frontend (`frontend/`) | ⚙️ Backend (`backend/`) |
| :--- | :--- | :--- |
| **Role** | User experience, interface, and display | API routing, security, and LLM communication |
| **Technologies** | HTML5, Vanilla CSS, Vanilla JavaScript, Marked.js, Highlight.js | Node.js, Express.js, `@google/generative-ai`, `dotenv`, `cors` |
| **State Handling** | Conversation UI state, theme, modal controls, user scroll detection | Ephemeral request/response processing, SSE event formatting |
| **Secrets & Keys** | Never stores secrets permanently in public code | Securely reads and manages `GEMINI_API_KEY` from `.env` |
| **LLM Calls** | Never calls Gemini API directly from client browser | Handles model invocation, streaming chunks, and role formatting |

---

## 🔌 Communication Contract (API Routes)

The frontend communicates with the backend exclusively through these decoupled REST & SSE endpoints:

- **`GET /api/status`**
  - Checks if `GEMINI_API_KEY` is present in `.env` and returns supported models.
- **`POST /api/chat/stream`**
  - Transmits prompt and history; streams chunks using **Server-Sent Events (SSE)** for real-time word-by-word display.
- **`POST /api/chat`**
  - Standard non-streaming JSON fallback.
- **`POST /api/save-key`**
  - Allows saving or updating the Gemini API key in the server's `.env` directly from the web interface.

---

## 🚀 Getting Started

### 1. Configure Gemini API Key
Obtain a free API key from **[Google AI Studio](https://aistudio.google.com/app/apikey)**.

Add it to [`.env`](file:///c:/Users/navad/OneDrive/Desktop/test-bts/.env):
```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
```
*(Or launch the app and enter it in the web interface settings modal).*

### 2. Run the Application
```bash
npm start
```
Or with auto-reload:
```bash
npm run dev
```

### 3. Open in Browser
Visit **[http://localhost:3000](http://localhost:3000)**.
