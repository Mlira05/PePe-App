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

Open on one device via Expo Go (Android/iPhone) or emulator.

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

## Sample Files

- `samples/workout-import-sample.csv`
- `samples/workout-import-sample.xlsx`

## Quick Manual Test (Recommended)

1. Start the app and open the `Importar` tab.
2. Tap `Seed Demo Data` to populate local profile, workout plans, sessions, and history.
3. Verify:
   - `Perfil`: fields are filled and can be edited/saved.
   - `Treinos`: demo plans exist and can be edited.
   - `Historico`: sessions and analytics are visible.
4. Optional import test:
   - Use `Importar CSV` or `Importar XLSX`.
   - Pick a file from `samples/` (copy to device storage first if using a physical phone).
   - Confirm imported plans appear in `Treinos`.
5. Runner test:
   - Open `Sessao`, select a plan, start `READ`, log some sets, finish and save.
   - Open `LISTEN`, start voice cues and verify TTS event cues.

## Data Storage

- Local SQLite (`expo-sqlite`)
- Current MVP persists a typed `AppData` JSON blob in SQLite key-value table (`app_kv`)

## Known Limitations (Prototype)

- No backend, sync, or multi-device support
- No robust PDF/Google Sheets parsing yet
- LISTEN mode uses estimated set durations for timeline scheduling
- Workout editor is functional but intentionally simple (no drag-and-drop reordering)
