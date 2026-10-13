# DayPilot Localization & Multi-Language Guide

This directory contains translation files for DayPilot across 5 languages:
- `en.json` — English (Default)
- `te.json` — Telugu (తెలుగు, Telugu script)
- `hi.json` — Hindi (हिन्दी, Devanagari script)
- `te-Latn.json` — Tenglish (Telugu written in Roman / English alphabet)
- `hi-Latn.json` — Hinglish (Hindi written in Roman / English alphabet)

---

## 1. How to Add a New Language

Adding a new language takes just **two simple steps**:

### Step 1: Create the translation JSON file
Create a new file in `src/locales/<language-code>.json` (for example, `ta.json` for Tamil or `bn.json` for Bengali).
Copy the structure from `src/locales/en.json` and translate the values into natural, conversational phrasing.

```json
{
  "common": {
    "appName": "DayPilot",
    "save": "சேமி",
    "cancel": "ரத்துசெய்"
    ...
  },
  "nav": { ... },
  "auth": { ... },
  "home": { ... },
  "tasks": { ... },
  "categories": { ... },
  "calendar": { ... },
  "habits": { ... },
  "templates": { ... },
  "guide": { ... },
  "settings": { ... },
  "errors": { ... },
  "validation": { ... }
}
```

### Step 2: Register in `src/config/languages.ts`
Import or add the language config to the `LANGUAGES` record in `src/config/languages.ts`:

```typescript
ta: {
  code: 'ta',
  name: 'Tamil',
  nativeName: 'தமிழ்',
  direction: 'ltr',
  fontFamily: "'Noto Sans Tamil', sans-serif",
  localeCode: 'ta-IN',
}
```

Import the JSON file into `src/config/i18n.ts` and add it to `resources`:
```typescript
import ta from '../locales/ta.json';

// In resources object:
ta: { translation: ta },
```

---

## 2. How to Add a New String / Translation Key

1. Open `src/locales/en.json`.
2. Locate the appropriate group (`common`, `auth`, `home`, `tasks`, `categories`, `calendar`, `habits`, `templates`, `guide`, `settings`, `errors`, `validation`).
3. Add your new key-value pair:
   ```json
   "myNewKey": "Hello world"
   ```
4. Add the corresponding key and translated value to `te.json`, `hi.json`, `te-Latn.json`, and `hi-Latn.json`.
   - *Note:* If a key is missing in any language, `react-i18next` will automatically fall back to the English string.
5. In your React component, use the hook:
   ```tsx
   import { useTranslation } from 'react-i18next';

   const { t } = useTranslation();
   return <span>{t('home.myNewKey')}</span>;
   ```

---

## 4. Smart Caption System & Escalation Rules

### How Levels Work
- **Level 1 (Friendly Nudge)**: Used on the first reminder or when overdue by less than 30 minutes. Gentle, polite reminder.
- **Level 2 (Firm)**: Triggered after 1–2 snoozes or more than 30 minutes overdue. Direct and urging.
- **Level 3 (Procrastination Roast)**: Triggered after 3+ snoozes or more than 2 hours overdue. Playful tough-love roasting procrastination without insulting personhood or identity.

### How to Change the Rules
Thresholds are defined in `src/config/captionRules.ts`:
```typescript
export const CAPTION_RULES = {
  LEVEL_1_OVERDUE_MINUTES: 0,
  LEVEL_2_OVERDUE_MINUTES: 30,
  LEVEL_2_SNOOZE_COUNT: 1,
  LEVEL_3_OVERDUE_MINUTES: 120,
  LEVEL_3_SNOOZE_COUNT: 3,
};
```

### How to Add or Edit Captions
1. **Firebase Console (Production)**: Open the global Firestore collection `/captions`. Each document contains:
   - `language`: `en`, `te`, `hi`, `te-Latn`, or `hi-Latn`
   - `level`: `1`, `2`, or `3`
   - `context`: `"task"`
   - `text`: string supporting `{name}`, `{task}`, `{minutes}`, `{snoozeCount}`
   - `active`: `true` / `false`
   *Note: Client writes are disabled in security rules for security. Edits made in Firestore Console take effect immediately for all users without redeployment.*
2. **Local Fallback Seed (`src/config/captions.ts`)**: Edit or add captions to `SEED_CAPTIONS`. Admins can click "Seed Captions to Firestore" in Settings > Captions & Alerts to sync to Firestore.
