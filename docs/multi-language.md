# Multi-language (specifically English and Welsh)

The `engine-plugin` and `runner` support multi-languages (if configured).
Additional languages are configured by adding translations json files and adding a `translations` property under the `metadata` property of the form definition.
You can use the Designer to edit Welsh translations for your form (to insert the necessary values in the `metadata.translations` property).

Currently only English and Welsh are configured but other languages could be added if desired.

## Forms engine plugin

The `engine-plugin` handles translations at two levels:

1. Boilerplate text - a translation file per language exists in `plugin` (`en-GB.json` and `cy.json`). These provide English and Welsh for each boilerplate text element, such as the feedback link url and text, or the error summary etc.
2. Dynamic form text - English translations are read from the form definition (such as component title, short description etc), whereas Welsh translations are read from the `metadata.translations.cy` property of the form definition.

The translator provides a series of functions:

- t(key) - a general translation function that takes a key (for example 'validation.numberMax') and returns either the appropriate English text or Welsh text deending on which is the current language
- tPage(key) - returns the appropriate translations for page elements, such as title, guidance etc.
- tComponent(key) - returns the appropriate translations for components, such as question text, hint, short description etc.
- tSection(key) - returns the appropriate translations for sections
- tListItem(key) - returns the appropriate translations for list items since each list value (e.g from a radio/checkbox etc) must have a translated equivalent
- tForm(key) - returns the appropriate translations for form-level elements. Currently this only handles the form name.

## Forms runner

The `runner` handles translations at two levels and sits on top of the translations from `engine-plugin`:

1. Boilerplate text - a translation file per language exists in `runner` (`en-GB.json` and `cy.json`). These provide English and Welsh for each boilerplate text element that lives outside of the `engine-plugin`, such as the footer links and 'save and exit' pages.
2. Dynamic form overview text - English translations are read from the form metadata (such as 'what happens next' or contact information), whereas Welsh translations are read from the `metadata.translations.cy` property of the form definition (specifically entries starting with `form.`).

The translator provides a series of functions:

- t(key) - a general translation function that takes a key and returns either the appropriate English text or Welsh text deending on which is the current language
- tR(key) - returns the appropriate translations for elements specific to the `runner` (to avoid confusion with the `engine-plugin` translator functions)
- tForm(key) - returns the appropriate translations for the form-level metadata elements (such as 'what happens next' or contact information), and also the form name.

## Language selector

If additional languages are defined, a language selector is displayed in the top-right of the form.
Additional languages must be set within the Nunjucks/Vision global `context` in order for the language selector to display.
The language selector should be shown for all plugin routes as well as all external routes (such as save-and-exit and static pages) when additional languages have been defined for the form.

## Accessing the translator

The translator should be available from the Nunjucks/Vision global `context` (for `engine-plugin` routes) and from the `context` attribute within the model for external routes. Either way, the translator should be accessible in a Nunjucks/Vision page using the attribute `context.translator`. This is particularly important for rendering `layout.html` since it references `context.translator.tForm('title')`. This must be available for both plugin routes and external routes alike.

If you wanted to translate a runner-spcific piece of text, for example the footer links, you would call `context.translator.tR('my-translation-element-name')`.
If you wanted to translate form-spcific metadtaa values, for example contact information, you would call `context.translator.tForm('contact.oneline.url')` to get the translation of for the key `form.contact.online.url` under `metatdata.translations.cy` - not the extra `form.` in the key name inside the form definition.
