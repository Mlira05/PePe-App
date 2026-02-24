# Pepe (Prototype) - Offline-First Personal Trainer MVP

Expo React Native (TypeScript) MVP to validate a single-device personal trainer experience with no backend and no login.

## MVP Scope

- Local profile saved on device
- Workout plans CRUD (exercises, sets, target reps/weight, rest, notes, simple supersets)
- Imports
  - CSV: implemented
  - XLSX: implemented (SheetJS)
  - PDF: stub (metadata only)
  - Google Sheets: stub (link only)
- Session Runner
  - READ: pt-BR coaching text, rest timer, actual reps/weight logging
  - LISTEN: coach timeline JSON + on-device TTS event cues (no rep counting)
- History + analytics (weekly training days, volume by exercise, simple PRs)

## Run

```bash
npm install
npm run start
```

## Checks

```bash
npm run lint
npm run typecheck
```

## CSV/XLSX Import Format (minimum)

Required columns:

- `dayLabel`
- `exercise`
- `targetReps`

Optional columns:

- `targetWeightKg`
- `restSeconds`
- `notes`
- `supersetGroupId`
- `tagsJson` (JSON object string)

One row should represent one set.

## Data Storage

- Local SQLite (`expo-sqlite`)
- Current MVP persists a typed `AppData` JSON blob in SQLite key-value table (`app_kv`)

## Known Limitations (Prototype)

- No backend, sync, or multi-device support
- No robust PDF/Google Sheets parsing yet
- LISTEN mode uses estimated set durations for timeline scheduling
- Workout editor is functional but intentionally simple (no drag-and-drop reordering)
