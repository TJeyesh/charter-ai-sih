# ⚓ DockInsights

![Project Status](https://img.shields.io/badge/Status-Active-success)
![React](https://img.shields.io/badge/React-19.0-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-6.0-purple?logo=vite)

**DockInsights** is an intelligent maritime voyage planning and freight forecasting platform. Originally conceptualized and built for the Smart India Hackathon, it helps operators make risk-aware, data-driven chartering decisions. 

By analyzing real-time market intelligence, port congestion, and bunker prices, DockInsights provides a clear picture of voyage economics and calculates the best possible deployment strategies for a given charter request.

---

## ✨ Key Features

- **🚢 Voyage Planner Dashboard**: An intuitive interface to input charter requests (cargo, dates, origin/destination) and receive optimized vessel deployment plans.
- **📈 Freight Forecasting & Economics**: Probabilistic freight predictions and highly accurate delivered-cost breakdowns (bunkers, port fees, demurrage, etc.).
- **⏱️ Market Timing Recommendations**: AI-driven insights advising whether to book prompt tonnage, wait, or negotiate based on short-term market trajectory.
- **⚡ Interactive Sensitivity Analysis**: Interactive sliders allowing operators to stress-test their voyage economics against fluctuating bunker prices, freight rates, and port delays.
- **🛡️ Maritime Risk Center**: A comprehensive risk audit that assesses commercial, operational, and scheduling risks for the voyage.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19 + TypeScript
- **Bundler**: Vite
- **Styling**: Tailwind CSS V4
- **Charts**: Recharts
- **Icons**: Lucide React

### Backend
- **Server**: Node.js & Express
- **Language**: TypeScript (Executed via `tsx` in dev, bundled with `esbuild` for production)

---

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed (v20+ recommended).

### Installation
1. Clone the repository and navigate to the project directory:
   ```bash
   cd dock-insights
   ```
2. Install the dependencies:
   ```bash
   npm install
   ```

### Running Locally (Development)
For the quickest start, use the included bash script:
```bash
./run.sh
```
Alternatively, you can start the development server manually:
```bash
npm run dev
```
*The app will automatically launch the backend and serve the frontend at `http://localhost:3000`.*

### Production Build
To create an optimized production build (ESM module) and run it:
```bash
npm run build
npm start
```

---

## 🏗️ Project Structure

```text
dock-insights/
├── src/                # Frontend React application
│   ├── pages/          # Primary UI Views (e.g., VoyagePlanner.tsx)
│   ├── index.css       # Tailwind entry and global styles
│   ├── App.tsx         # Main application layout and router
│   ├── main.tsx        # React root injector
│   └── api.ts          # API interfaces and client fetchers
├── server.ts           # Express backend entry point
├── unwanted/           # Auxiliary docs, old reports, and legacy hackathon scripts
├── package.json        # Dependencies and build scripts
└── run.sh              # Quickstart execution script
```

---

## 📝 License

This project is proprietary and intended for evaluation and demonstration purposes.
