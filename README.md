# ManufactureAI: AI-Powered Engineering & Manufacturing Optimization Platform

> **From CAD to Cost to Production Strategy**  
> An industrial-grade engineering SaaS platform combining deterministic unit-tested physical mechanics, Three.js 3D CAD mesh parsing, and Google Gemma 4 AI strategic reasoning.

---

## 💎 Core Architecture & Principles

1. **Real Input Only**: The application initializes completely empty. No fake projects, no mock charts, no pre-filled numbers.
2. **AI Never Does The Math**: 100% of physical numbers (volumes, masses, MRR cycle times, machine/labour costs, setup amortizations, profit margins, and break-even points) are calculated deterministically by a unit-tested TypeScript calculation engine. AI only interprets, recommends, and explains.
3. **Transparent Origin Badging**: Every single value is explicitly labeled with its origin:
   - **Calculated**: Deterministically computed from geometry and engineering formulas.
   - **Manual Input**: Entered directly by the engineer.
   - **Assumption**: Baseline engineering assumption editable live in the Assumptions drawer.
   - **Live Data**: Sourced from live market index (with timestamp and source).
   - **AI Recommendation**: Synthesized by Gemma 4.
4. **Zero-Key Resiliency**: Fully functional with zero API keys. Automated rule-based engineering fallbacks activate seamlessly with visible status badges.

---

## 🏗️ Directory Structure

```text
/
├── shared/                     # Shared domain types & calculation engine
│   └── src/
│       ├── types.ts            # Domain types (Geometry, Costs, Tiers, Strategy)
│       ├── materials.ts        # 12 engineering materials with physical properties
│       ├── processes.ts        # 14 manufacturing processes specification
│       ├── calculation-engine.ts # Deterministic mathematical engine
│       └── calculation-engine.test.ts # Comprehensive unit tests (27 passing)
├── backend/                    # Node.js Express REST API proxy
│   └── src/
│       ├── cad-processing/     # STL (divergence theorem), OBJ, and STEP parsing
│       ├── ai-services/        # GemmaProvider (Gemini API) + RuleBasedProvider
│       ├── price-service/      # PerplexityProvider + handbook fallback
│       ├── project-storage/    # JSON project persistence
│       └── server.ts           # Express REST endpoints
├── frontend/                   # React + TypeScript + Tailwind CSS + Recharts + Three.js
│   └── src/
│       ├── components/
│       │   ├── ui/             # TopNavBar, OriginBadge, FooterDisclaimer
│       │   ├── dashboard/      # PartAnalysis, Material, Processes, Costs, Business, Charts, Strategy
│       │   ├── chat/           # Ask ManufactureAI context-grounded assistant
│       │   ├── CadViewer.tsx   # Three.js 3D viewport (Orbit, BBox, Wireframe)
│       │   ├── ManualInputForm.tsx # Dynamic geometry dimensional input
│       │   └── AssumptionsPanel.tsx # Live tuning of cost parameters
│       ├── App.tsx             # Central state controller
│       └── index.css           # Industrial dark SaaS theme
├── .env.example                # Documented backend environment variables
└── README.md
```

---

## ⚙️ Environment Variables

Create a `.env` file in the root or `/backend` directory based on `.env.example`:

```bash
# Google Gemini API key for Gemma 4 models
# Obtain at: https://aistudio.google.com/
GEMINI_API_KEY=your_gemini_api_key_here

# Gemma model identifier on Google Gemini API
# Supported IDs: gemma-4-31b-it, gemma-4-26b-a4b-it, gemma-4-4b-it
GEMMA_MODEL=gemma-4-31b-it

# Optional: Perplexity API key for live raw-material spot prices
# If omitted, manual price input is used
PERPLEXITY_API_KEY=

# Backend REST API port
PORT=3001
```

---

## 🚀 How to Run

### 1. Install Dependencies
```bash
# Root & backend
npm install
cd backend && npm install && cd ..

# Frontend
cd frontend && npm install && cd ..
```

### 2. Start Both Backend & Frontend Concurrently
```bash
npm run dev
```
- **Frontend App**: `http://localhost:5173/`
- **Backend REST API**: `http://localhost:3001/`

---

## 🧪 How to Run Unit Tests

Execute the deterministic calculation engine unit test suite (27 tests covering volume divergence, mass mechanics, setup amortization, MRR cycle time, profit margins, and break-even limits):

```bash
npm test
```

Sample output:
```text
--- Running Calculation Engine Unit Tests ---
  ✓ Block gross volume = 100 * 50 * 20 = 100,000 mm3
  ✓ Block net volume with no holes = 100,000 mm3
  ✓ Block surface area = 16,000 mm2
  ✓ Cylinder volume = pi * r^2 * h
  ✓ Tube hollow volume calculation
  ✓ Net volume after holes and pockets deducted
  ✓ Net volume is strictly less than gross volume
  ✓ Net part mass of Al 6061 (0.27 kg)
  ✓ Stock mass with 15% allowance (0.311 kg)
  ✓ Gross material cost ~$1.71
  ✓ Scrap credit is computed positive
  ✓ Net material cost reflects scrap credit
  ✓ Setup allocation for qty 1 is high ($127.50 for 1.5h @ $85/h)
  ✓ Setup allocation for qty 100 is amortized by 100x
  ✓ Total cost per unit is positive
  ✓ Selling price exceeds cost at 30% margin
  ✓ Gross margin matches ~30% target
  ✓ Break-even quantity is calculated
  ✓ Break-even quantity is null when selling at loss
  ✓ Status correctly reports no break-even
  ✓ Profit per unit is negative when sold below cost
  ✓ CNC Turning is unviable for prismatic Block
  ✓ CNC Turning is viable for Shaft
  ✓ CNC Turning scores high for Shaft
  ✓ Generates 4 quantity comparison tiers
  ✓ Prototype unit cost > Small batch unit cost
  ✓ Small batch unit cost > Large batch unit cost

Unit Tests Completed: 27 passed, 0 failed.
```

---

## 📊 Feature Matrix: Real vs. Fallback

| Subsystem | Real Implementation | Fallback Mode (Zero Keys / Offline) |
| :--- | :--- | :--- |
| **Geometry & Volume** | OpenCASCADE WebAssembly B-Rep kernel for **STEP / STP** + signed tetrahedron divergence theorem for **STL / OBJ** | User manual volume prompt for custom shapes |
| **3D CAD Viewer** | Three.js WebGL canvas supporting native **STEP**, **STP**, **STL**, and **OBJ** with OrbitControls, wireframe, bounding box, axes | Standard dimensional schematic |
| **Material Cost** | $V_{stock} \times \rho \times \text{Price/kg} - \text{ScrapCredit}$ | Same deterministic formula with editable baseline prices |
| **Machining Cycle Time**| $\text{MRR} \times \text{VolumeRemoved} + \text{FinishingTime} + \text{Features}$ | Same deterministic formula using material machinability index |
| **Total Cost per Unit** | 10-item formula (Material + Machine + Labour + Tooling + Energy + Setup + Finishing + QA + Scrap + Overhead) | Same deterministic formula with editable defaults |
| **Break-Even Analysis**| $\text{Fixed Cost} / (\text{Selling Price} - \text{Variable Cost})$ with $\le 0$ detection | Same deterministic formula |
| **Process Ranking** | 14 processes dynamically ranked for geometry, quantity, tolerance, finish | Same rules-based multi-tier evaluation |
| **AI Strategy** | Google Gemini API with **Gemma 4** (`gemma-4-31b-it`) structured output | Deterministic engineering rule-based heuristics |
| **Raw Material Prices**| Perplexity API live spot market queries | User manual input / ASM Handbook baseline with editable override |
| **Assistant Chat** | Gemma 4 grounded strictly in current part metrics | Context-grounded rule-based responses citing exact facts |
