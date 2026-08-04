# Chapter

A privacy-first, open-source mood and habit tracker built on modern web and mobile technologies.

Chapter combines quick capture, deep customisation, and powerful analytics without locking your data in a closed ecosystem or behind a paywall.

## Core Features

- **Mood Tracking**: Quick two-tap capture, custom scales, and full emoji icon support.
- **Habit Engine**: Advanced tracking for habits to build and habits to avoid. Exponentially weighted strength scores and rich milestones.
- **Deep Analytics**: Correlate your moods with activities, habits, and weather.
- **Privacy First**: Fully local by default. Optional E2E-encrypted sync across your devices. No trackers.
- **Data Portability**: Import from legacy apps, export to CSV/JSON, and run automatic local backups.

## Tech Stack

Chapter is built as a unified monorepo for maximum code sharing across platforms:

- **Web**: React, Vite, React Router
- **Mobile**: React Native, Expo, Expo Router
- **Core**: Platform-agnostic TypeScript logic
- **Database**: SQLite (via `drizzle-orm`)
- **Styling**: Shared token system (no UI library)

## Contributing

1. Clone the repository
2. Run `pnpm install`
3. Run `pnpm dev`

## License

This project is licensed under the MIT License - see the LICENSE file for details.
