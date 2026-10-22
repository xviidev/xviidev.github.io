# Utility monorepo

- One utility per `packages/<utility>`; categories are catalog metadata, not packages.
- Host and routing live in `apps/web`. The homepage uses BaseLayout; all utility pages use UtilityLayout and UtilityShell.
- All interactive UI controls must come from `@xviidev/ui/components/*`. No native JSX button, input, select, textarea, label, fieldset, details, summary, or option controls in app/utility consumers. No direct primitive-library imports outside packages/ui.
- Use the shadcn Select composition, never NativeSelect, in utilities. Use shared Tabs, Button, Input, Field, Checkbox, Accordion, Sidebar and other components rather than hand styling replacements. Rich document content and canvas rendering are utility-specific.
- Shared tokens, fonts, colors, component variants, and icons belong to packages/ui. Keep the selected shadcn preset b6RfRCplyq. Add shadcn components from the root with `npx shadcn@latest add <name> -c apps/web`.
- UI language is Indonesian. Register metadata per utility and create static pages through the catalog metadata for GitHub Pages direct links.
- Run `npm run check`, `npm test`, and `npm run build` for material changes. `check:ui` enforces the shared-control rule for every package except the UI implementation.
