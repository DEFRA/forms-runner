# English/Welsh translations

This project supports multi-language forms (English and Welsh) across both the **engine-plugin** and the **runner**.

## How translation data is stored

Translations come from two places:

1. **Boilerplate translation files** (static UI text)

- English: `en-GB.json`
- Welsh: `cy.json`

1. **Form definition metadata** (dynamic form content)

- English content is read directly from the form definition
- Welsh content is read from `metadata.translations.cy`

In practice, Welsh values are configured in the form definition under `metadata.translations.cy` (for example via Designer).

---

## Engine plugin translations

The `engine-plugin` handles:

1. **Boilerplate plugin text**
   Examples: error summary text, feedback link text/URL, validation messages.
2. **Dynamic form text**
   Examples: page titles, component labels, hints, short descriptions, section names, list item labels.

### Engine plugin translator functions

- `t(key)`
  General translation lookup (for example `validation.numberMax`).
- `tPage(key)`
  Page-level text (title, guidance, etc.).
- `tComponent(key)`
  Component-level text (question, hint, short description).
- `tSection(key)`
  Section text.
- `tListItem(key)`
  List option text (radio/checkbox/select item values).
- `tForm(key)`
  Form-level values (currently includes form title/name).

---

## Runner translations

The `runner` sits on top of `engine-plugin` translations and handles:

1. **Runner boilerplate text**
   Examples: footer links, save-and-exit pages.
2. **Dynamic overview metadata text**
   Examples: “what happens next”, contact details, and other form-level metadata.

### Runner translator functions

- `t(key)`
  General translation lookup.
- `tR(key)`
  Runner-specific translation lookup.
- `tForm(key)`
  Form metadata lookup (including form title/name).

For Welsh form metadata values, `tForm('contact.online.url')` maps to:

```
  metadata.translations.cy: {
    'form.contact.online.url': 'My Welsh translation for online url'
  }
```

> Note: pass keys to `tForm(...)` **without** the leading `form.` prefix.

---

## Cached translator helpers

Two helper functions are used to build and reuse translator instances per request/context:

### `getCachedFormTranslatorBasic`

Use this for **plugin/internal form routes** (standard engine-driven pages).

What it does:

- Creates a translator for the active form + selected language
- Reuses a cached instance where possible (to avoid rebuilding translator objects repeatedly)
- Provides the standard translator methods used by most form pages (`t`, `tPage`, `tComponent`, `tSection`, `tListItem`, `tForm`)

This is the default translator path for normal form journey pages.

### `getCachedFormTranslatorExternalRoutes`

Use this for **external/non-engine routes** (for example save-and-exit, static or custom runner routes).

What it does:

- Creates/reuses a cached translator in the same way as the basic helper
- Ensures external routes still get the same translation behavior as plugin routes
- Makes translated form metadata and runner text available in route models/templates (for example `context.translator.tForm(...)` and `context.translator.tR(...)`)

This avoids translation mismatches between engine pages and external pages.

### Why both exist

Although both helpers cache translator creation, they are used in different route contexts:

- **Basic**: engine/plugin form pages
- **ExternalRoutes**: runner-managed external pages

Using the correct helper ensures language selection, metadata translation, and template access work consistently across the whole app.

---

## Language selector behavior

A language selector appears when additional languages are configured.

To display it correctly:

- Include language data in the global Nunjucks/Vision `context`.
- Ensure this is done for:
  - Plugin routes
  - External routes (for example save-and-exit and static pages)

---

## Accessing the translator in templates

The translator must be available as:

- `context.translator` in Nunjucks/Vision global context (plugin routes)
- `context.translator` in the route model context (external routes)

This is required because shared templates (for example `layout.html`) call:

- `context.translator.tForm('title')`

### Examples

- Runner-specific text:
  - `context.translator.tR('footer.terms')`
- Form metadata text:
  - `context.translator.tForm('contact.online.url')`
- General text:
  - `context.translator.t('validation.required')`
