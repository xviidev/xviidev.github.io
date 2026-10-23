# Utility monorepo

- One utility per `packages/<utility>`; categories are catalog metadata, not packages.
- Homepage lives in `apps/web` (Astro, BaseLayout). Utility host and routing live in `apps/utilities` (React + Vite + TanStack Router, UtilityShell). Keep each app independent.
- All interactive UI controls must come from `@xviidev/ui/components/*`. No native JSX button, input, select, textarea, label, fieldset, details, summary, or option controls in app/utility consumers. No direct primitive-library imports outside packages/ui.
- Use the shadcn Select composition, never NativeSelect, in utilities. Use shared Tabs, Button, Input, Field, Checkbox, Accordion, Sidebar and other components rather than hand styling replacements. Rich document content and canvas rendering are utility-specific.
- Shared tokens, fonts, colors, component variants, and icons belong to packages/ui. Keep the Base UI primitives and neutral theme from shadcn preset b6RfRCplyq; typography intentionally uses Geist Mono headings and Source Sans 3 body text, sentence case, and normal letter spacing for readability. Homepage keeps its own typography. Add components with `npx shadcn@latest add <name> -c apps/utilities`.
- UI language is Indonesian. Register metadata per utility in `apps/utilities/src/lib/metadata.ts` and the loader/icon in `utilities.ts`. Static entry pages are generated for GitHub Pages direct links. Root build combines both apps into `dist/`; never make Astro host utility pages.
- Run `npm run check`, `npm test`, and `npm run build` for material changes. `check:ui` enforces the shared-control rule for every package except the UI implementation.
