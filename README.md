# Space AI System

## Overview

Space AI System is a full-stack orbital intelligence platform that combines deterministic orbital mechanics with supervised machine learning for collision risk estimation.

The system performs:

* TLE (Two-Line Element) parsing and validation
* Orbit propagation using the SGP4 algorithm
* Position and velocity vector computation
* Analytical collision risk assessment
* Machine learning–based collision probability prediction
* Real-time telemetry streaming via WebSocket
* Interactive 3D satellite visualization

The project demonstrates integration of orbital physics, numerical computation, and applied machine learning in a web-based environment.

---

## System Architecture

```
Frontend (Next.js + Three.js)
        ↓
FastAPI Backend (REST + WebSocket)
        ↓
SGP4 Propagation Engine (sgp4 + NumPy)
        ↓
Rule-Based Risk Evaluation
        ↓
Machine Learning Model (Gradient Boosting)
        ↓
Collision Probability Output
```

The architecture separates visualization, propagation logic, analytical evaluation, and ML inference into modular components.

---

## Technology Stack

### Frontend

* Next.js (TypeScript)
* React
* Three.js
* Tailwind CSS
* WebSocket API

### Backend

* Python 3.10+
* FastAPI
* Uvicorn
* NumPy
* sgp4
* Pydantic
* scikit-learn
* joblib

### Deployment

* Render (cloud hosting)
* GitHub (version control)

---

## Orbital Computation

The backend:

1. Validates TLE input.
2. Initializes the SGP4 propagator.
3. Computes Earth-Centered Inertial (ECI) position vectors.
4. Calculates velocity vectors.
5. Estimates relative motion and closest approach conditions.

Vector operations and numerical calculations are performed using NumPy.

---

## Hybrid Risk Evaluation

The system combines two approaches:

### 1. Rule-Based Logic

Collision risk is estimated using:

* Closest approach distance
* Relative velocity
* Time to closest approach
* Altitude difference

This provides deterministic safety evaluation.

### 2. Machine Learning Model

A Gradient Boosting Regressor (scikit-learn) predicts collision probability (0–1) using:

* Closest approach distance (km)
* Relative velocity (km/s)
* Time to closest approach (minutes)
* Altitude difference (km)

The model is trained on a synthetic orbital interaction dataset.

### Model Performance (Synthetic Dataset)

* R² ≈ 0.99
* Sub-second inference time

The ML model is loaded at backend startup and used during live inference.

---

## Real-Time Telemetry

The backend exposes:

* REST endpoints for prediction and scenario simulation
* WebSocket endpoint for live orbital telemetry

Telemetry updates occur approximately every 2 seconds.

Users can select specific satellite/debris pairs, and the system computes risk metrics in real time.

---

## Project Structure

```
/frontend
  /app
  /components
  /styles

/backend
  /ai
  /models
  train_model.py
  main.py

README.md
```

---

## Installation and Setup

### Clone the Repository

```bash
git clone https://github.com/Tako117/space-ai-system.git
cd space-ai-system
```

---

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
python train_model.py
uvicorn main:app --reload --port 8000
```

Backend runs at:
[http://localhost:8000](http://localhost:8000)

API documentation:
[http://localhost:8000/docs](http://localhost:8000/docs)

---

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at:
[http://localhost:3000](http://localhost:3000)

---

## Demonstration

1. Open the AI Engine page.
2. Observe real-time orbit propagation.
3. Select a satellite and debris pair.
4. View:

   * Rule-based risk score
   * ML probability
   * Risk classification
5. Adjust scenario parameters to simulate different collision conditions.

---

## Limitations

* The ML model is trained on synthetic orbital interaction data.
* Closest-approach estimation is simplified.
* The system is not optimized for very large satellite constellations.
* Real-world conjunction datasets are not yet integrated.

---

## Intended Use

This project is intended for:

* Educational demonstration
* Research prototyping
* Competition presentation
* Orbital mechanics and AI integration study

---

## Team

Digital Nomads

* Backend & Machine Learning Engineering
* Frontend & 3D Visualization
* Systems Architecture
* Research & Product Development
