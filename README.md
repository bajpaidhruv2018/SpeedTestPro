# SpeedTestPro — Professional Internet Speed Test

Measure real‑world internet performance: download, upload, latency under load (bufferbloat), jitter, and Quality‑of‑Experience ratings for streaming, calls, and gaming. Built with React + Web Workers and Lovable Cloud Edge Functions.

- Live demo: https://speed-ping-gauge.lovable.app/


[![Built with Lovable](https://img.shields.io/badge/Built%20with-Lovable-7b61ff.svg)](#)
[![PWA](https://img.shields.io/badge/PWA-Ready-brightgreen.svg)](#)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](#license)

---

## Features

- Core tests
  - Download and upload throughput (multi‑connection), real‑time charts
  - Latency: idle and loaded (bufferbloat), jitter, packet loss estimate
  - Bufferbloat grade A–F
- Test modes: Quick (15s), Standard (30s), Advanced (60s)
- Advanced metrics: P95 window, stability score (0–100), confidence intervals
- QoE ratings: Streaming (4K/HD/SD), Video Calls, Gaming
- History and trends
  - Results saved locally (IndexedDB), history view, trend charts, export/share
- UX and accessibility: responsive, keyboard nav, ARIA labels, error boundaries
- Tech: React 18 + TypeScript, Vite, Tailwind + shadcn/ui, Recharts, Web Workers
- Backend: Lovable Cloud (Supabase Edge Functions)

---

## How it works

- Web Worker engine runs tests off the main thread for smooth UI.
- Edge Functions:
  - `speed-download`: streams random bytes for download measurement
  - `speed-upload`: receives streamed uploads for throughput
  - `speed-ping`: WebSocket echo for idle/loaded latency and jitter
- UI subscribes to worker events and renders live charts, KPIs, and QoE badges.

High‑level architecture:
