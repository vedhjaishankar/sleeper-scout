# Sleeper Scout

[![Live Site](https://img.shields.io/badge/Live-GitHub%20Pages-brightgreen)](https://vedhjaishankar.github.io/sleeper-scout/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

**Sleeper Scout** is a high-performance web dashboard designed to visualize NFL Draft prospect forecasts. It displays career value predictions for skill-position players (QB, WR, TE, RB) using a "Sleeper Score" (0–100) and draft window recommendations, all served through a premium, Sleeper-inspired UI.

---

## Live Demo
You can view the live application here:  
**[https://vedhjaishankar.github.io/sleeper-scout/](https://vedhjaishankar.github.io/sleeper-scout/)**

---

## Features

- **Prospect Leaderboard**: Sortable and filterable table showing Sleeper Scores, surplus value, and breakout probabilities.
- **Deep-Dive Profiles**: Detailed stats for every prospect, including:
  - **Athletic Radar Charts**: Visualizing z-scored combine metrics.
  - **Surplus Value Gauges**: Measuring projected value vs. draft slot expectation.
  - **Top Projection Drivers**: Transparency into what variables are moving the needle for each player.
- **Top Sleepers**: A dedicated leaderboard for the most undervalued prospects in the current draft class.
- **Responsive Design**: Fully optimized for mobile and desktop viewing with smooth Framer Motion animations.

---

## The Model (Sleeper Score)

While this repository hosts the frontend interface, the data is driven by a position-group XGBoost regression model trained on two decades of NFL data (2000–2024).

The **Sleeper Score (0–100)** is calculated as:
- **40% Surplus Value**: Projected career value exceeding the draft-slot average.
- **20% Pro Bowl Probability**: Likelihood of reaching elite NFL status.
- **20% Peak Upside**: Maximum single-season ceiling percentile.
- **20% Availability**: A durability factor based on physical measurables and position history.

---

## 🛠️ Tech Stack

- **Core**: [React 18](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS 4.0](https://tailwindcss.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Data Viz**: [Recharts](https://recharts.org/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Deployment**: GitHub Pages (via GitHub Actions)

---

## 💻 Local Development

To run the dashboard locally, follow these steps:

### Prerequisites
- [Node.js](https://nodejs.org/) (Version 18 or higher)
- `npm` or `pnpm`

### 1. Clone the repository
```bash
git clone https://github.com/vedhjaishankar/sleeper-scout.git
cd sleeper-scout
```

### 2. Install dependencies
```bash
npm install
```

### 3. Start development server
```bash
npm run dev
```

### 4. Build for production
```bash
npm run build
```

---

## 📂 Project Structure

```text
sleeper-scout/
├── public/                 # Static assets (CSV data, icons)
├── src/
│   ├── components/         # Reusable UI components
│   ├── pages/              # Main view containers
│   ├── data/               # Local data utilities and hooks
│   ├── styles/             # Global CSS and Tailwind entry
│   └── App.tsx             # Main entry point
├── vite.config.ts          # Vite configuration
└── .github/workflows/      # Deployment scripts
```

---

## 📄 License
This project is for informational and research purposes only. Draft data and metrics are sourced from Pro Football Reference.
