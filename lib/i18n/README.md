# Frontend i18n (EN/FR)

Source files:
- `lib/i18n/config.ts`: supported locales, default locale, storage/cookie keys, BCP47 tags.
- `lib/i18n/translations.ts`: translation dictionaries (`fr` and `en`).
- `lib/i18n/context.tsx`: language provider, persistence, `html[lang]` sync, formatting helpers.

## Usage

```tsx
import { useI18n } from "@/lib/i18n/context"

const { locale, t, setLocale, toggleLocale, formatDate, formatNumber } = useI18n()
```

## Add translations

1. Add the same key in both `translations.fr` and `translations.en`.
2. Consume the key in components via `t.<section>.<key>`.
3. Avoid hardcoded "fr-FR"/"en-US" in components, prefer `formatDate`, `formatTime`, `formatDateTime`, `formatNumber`.
