# Chapter — a Daylio alternative

An open, privacy-first mood tracker, micro-journal and habit tracker for **Android and the web**.

Feature target: **everything Daylio does, including every feature Daylio puts behind Premium — with nothing gated behind payment.**

## Product principles

1. **Two taps to log.** The core loop is pick a mood → pick activities → save. Everything else is optional depth. If a change makes the two-tap path slower, it does not ship.
2. **Local-first.** The device owns the data. The app is fully functional with the network off, forever. Sync is an opt-in feature, not a dependency.
3. **No paywall.** Advanced stats, unlimited moods, custom themes, PDF export, automatic backup — all free. See [09-monetization.md](docs/09-monetization.md) for how the project sustains itself without gating.
4. **Your data is yours.** End-to-end encrypted sync, one-click full export, a documented non-proprietary backup format, and importers from the apps people are leaving.
5. **Web is a first-class client**, not a viewer. Long-form writing and deep stats are genuinely better on a big screen.

## Documentation index

| Doc | Contents |
| --- | --- |
| [00 — Feature inventory](docs/00-feature-inventory.md) | Complete Daylio parity checklist, free/premium origin, priority, phase |
| [01 — Architecture](docs/01-architecture.md) | Stack decision, monorepo layout, Android + web strategy |
| [02 — Data model](docs/02-data-model.md) | Full SQLite schema, sync metadata, invariants |
| [03 — Core capture](docs/03-features-core-capture.md) | Entries, moods, activities, scales, notes, photos, audio, templates |
| [04 — Browse & statistics](docs/04-features-browse-stats.md) | Calendar, search, memories, every chart, correlation math |
| [05 — Motivation](docs/05-features-motivation.md) | Goals, streaks, achievements, important days, reminders, widgets |
| [06 — Platform & data](docs/06-features-platform.md) | App lock, backup, export, Daylio import, theming, i18n, a11y |
| [07 — Sync](docs/07-sync.md) | Optional end-to-end encrypted multi-device sync |
| [08 — Roadmap](docs/08-roadmap.md) | Phased delivery, milestones, estimates, risks |
| [09 — Monetization](docs/09-monetization.md) | Sustaining a no-paywall product |
| [10 — Beyond Daylio](docs/10-beyond-daylio.md) | Where to beat Daylio, drawn from Streak / Quitter / nightlio |
| [11 — Gap review](docs/11-gaps.md) | What the plan was missing, what's fixed, what's still open |
| [12 — Goal library](docs/12-goal-library.md) | ~90 goals in 12 categories, each with an evidence-based method |
| [13 — 2026 platform](docs/13-2026-platform.md) | OKLCH, container queries, view transitions — adopt / skip decisions |
| [**14 — Attribution**](docs/14-attribution.md) | What we take from each app, what's ours, and licence obligations |

## Design

| Doc | Contents |
| --- | --- |
| [**Art direction**](docs/design/art-direction.html) | **Start here.** Mood as time of day — the app's visual world |
| [2026 upgrade](docs/design/upgrade-2026.html) | OKLCH colour, depth layers, expressive type; trends we skip |
| [Design system](docs/design/design-system.html) | Mood ramp rationale, neutrals, type scale |
| [Screen designs](docs/design/screens.html) | 16 screens, Android and web, with divergence notes |
| [Android · Material 3](docs/design/android-material3.html) | M3 colour roles, components, empty and error states |

## Prior art studied

| Project | What we take from it |
| --- | --- |
| [Daylio](https://daylio.net/) (closed, freemium) | The feature spine. Two-tap capture, mood groups, activity correlation stats, Year in Pixels. |
| [InlitX/streak](https://github.com/InlitX/streak) (Flutter, GPLv3) | Habit engine depth: habit types, flexible schedules, vacation mode, GitHub-style grids, importers from Loop/HabitKit, share cards. |
| [brandonp2412/Quitter](https://github.com/brandonp2412/Quitter) (Flutter, **MIT**) | 29 quit-trackers with **individually cited** health-milestone datasets — directly reusable under MIT. Money-saved / time-saved / resilience stats. Proof that one Flutter codebase ships Android + web + desktop for this app class. See [10.2](docs/10-beyond-daylio.md#102-quit--abstinence-tracking) for what to take and what to leave. |
| [shirsakm/nightlio](https://github.com/shirsakm/nightlio) (React + Flask, self-hosted) | The `group → option → entry_selection` tag model, markdown journaling, and the self-hostable web deployment story. |

## Status

Planning. No code yet. Start at [08-roadmap.md](docs/08-roadmap.md).
