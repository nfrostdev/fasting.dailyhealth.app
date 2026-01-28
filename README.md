# Fasting Timer

A simple, privacy-focused intermittent fasting tracker. No sign-up, no tracking—all data stored locally in your browser.

**Live app:** https://fasting.dailyhealth.app

## Features

- **Start/End Fasts** — One-tap to start or end a fast
- **Fasting Zones** — Visual indicator showing metabolic phases (Fed, Post-Absorptive, Fat Burning, Ketosis, etc.)
- **Edit Start Time** — Forgot to start your fast? Adjust the start time retroactively
- **History** — View and manage your completed fasts
- **Customizable Duration** — Set your default goal (12h, 14h, 16h, 18h, 20h, 24h)
- **Dark/Light Theme** — Toggle based on preference
- **Export/Import** — Back up your data as JSON, restore on any device
- **PWA Support** — Install on your phone's home screen for an app-like experience
- **Offline Ready** — Works without an internet connection
- **Privacy First** — Zero data leaves your device

## Tech Stack

- Vanilla HTML/CSS/JavaScript
- Tailwind CSS (via CDN)
- localStorage for data persistence
- Service Worker for offline support

## Local Development

The app is a single HTML file with no build step required. Just open `index.html` in a browser or serve it locally:

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve .
```

Then visit `http://localhost:8000`

## E2E Testing

End-to-end tests are written with Playwright and cover core functionality including fasting flows, settings, history, and import/export.

### Setup

```bash
npm install
npx playwright install
```

### Running Tests

```bash
# Run all tests
npm test

# Run with browser visible
npm run test:headed

# Run in debug mode
npm run test:debug

# Run with UI mode
npm run test:ui

# View last test report
npm run report
```

### Testing Against Different URLs

By default, tests run against `https://fasting.dailyhealth.app`. To test locally or against a different environment:

```bash
BASE_URL=http://localhost:8000 npm test
```

### Test Coverage

Tests cover:
- Starting and ending fasts
- Timer persistence across page reloads
- Editing fast start time
- History management (view, delete)
- Settings (duration, theme, zones toggle)
- Data export and import (merge and replace modes)
- Fasting zone display

## Data Format

Exported data is JSON with this structure:

```json
{
  "history": [
    {
      "id": 1234567890,
      "startTime": 1234567890000,
      "endTime": 1234567900000,
      "duration": 16.5,
      "goalHours": 16
    }
  ],
  "settings": {
    "defaultDuration": 16,
    "theme": "dark",
    "showZones": true
  },
  "currentFast": null
}
```

## License

MIT
