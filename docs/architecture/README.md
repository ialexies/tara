# Architecture

High-level architectural views of Tara. ADRs live in [`../adr/`](../adr/); domain modeling lives in [`../domain/`](../domain/). This directory is for **cross-cutting designs** that don't fit cleanly in either.

## Contents

| File                                     | Purpose                                                                                                                                                                  |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`diagrams.md`](diagrams.md)             | Mermaid diagrams: system overview, entity model, booking lifecycle, deploy pipeline, home server topology, owner flows, payment architecture, notification orchestration |
| [`image-pipeline.md`](image-pipeline.md) | Photo upload → R2 → Cloudflare Image Resizing → CDN delivery. AI quality gates, fraud detection.                                                                         |
| [`ai-features.md`](ai-features.md)       | Catalog of AI features (Ollama local, Claude API real-time), cost discipline, observability, what we DON'T use AI for.                                                   |

When the architecture changes, update these diagrams + docs in the same PR as the code change. Stale diagrams are worse than no diagrams.
