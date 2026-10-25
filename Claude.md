# BalkanEstate — working rules

These rules apply to the whole repository (frontend and backend). The full
architecture is in [`ARCHITECTURE.md`](ARCHITECTURE.md); `backend/CLAUDE.md`
holds the detailed React/TypeScript guidance.

## Small files, one job each

- **One concern per file.** A component renders, a hook holds state and
  effects, a util computes. If a file does two of these, split it.
- **Components stay under ~150 lines.** Past that, pull out a sub-component (a
  bar, an overlay, a card) or a hook (derived data, a flow). Don't squeeze
  lines to fit; split along a real seam.
- **Logic lives in pure functions** (`utils/`), so it can be unit-tested
  without rendering. Components and hooks stay thin wrappers over it.
- **Group a feature's pieces in a folder** once it has more than two files
  (e.g. `explorer/budget/`: the component, its panel, form, cards, hooks).
- **Share, don't copy.** Reuse an existing type, helper or style constant
  before adding a near-duplicate (e.g. `Bounds` from `polygonGeometry`,
  `unitArea` from `unitFilters`, `EXPLORER_PILL`).
- **Name files after what they export**; hooks start with `use`.

## Frameworks, the way they are meant to be used

- **React 18:** function components and hooks. `useEffect` only for real side
  effects (timers, listeners, animations), never to fetch data. Keep the
  dependency arrays honest, clean up timers and listeners, and keep the latest
  callbacks in refs instead of re-running effects.
- **TanStack Query** for all server data: a hook per query with a stable
  `queryKey`, `retry: false` when "not found" is a valid answer.
- **TypeScript strict:** no `any`. Use discriminated unions for results
  (`{ ok: true; value } | { ok: false; error }`) and narrow with
  `=== false`.
- **Tailwind** for styling, light theme only. **framer-motion** for
  enter/exit animation, always respecting `useReducedMotion()`.
- **Express + Mongoose:** thin controllers, logic in services; validate input
  on the server even when the client already did.

## Every change

- **Validation and error handling on both sides.** Show the reason next to the
  field (`role="alert"`). Never leave the user at a dead end; offer the next
  best thing.
- **Translate every new text into all 10 locales** (en, sq, bs, hr, me, sr,
  mk, bg, el, ro) in the same change, and keep an English `defaultValue` in
  code.
- **Accessibility:** buttons have names, dialogs have labels, Esc closes the
  top layer (`useEscapeLayer`), touch targets are at least 44px.
- **Tests:** unit-test the pure logic, and add a component test for the user
  flow. Don't delete or weaken a test to make it pass. Update it only when the
  behaviour was meant to change, and say so.
- **Never claim something was tested or verified if it wasn't.**
