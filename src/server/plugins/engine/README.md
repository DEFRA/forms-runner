# forms-engine

Form hapi-plugin

...

## Templates

The following elements support [LiquidJS templates](https://liquidjs.com/):

- Page **title**
- Form component **titles**
  - Support for fieldset legend text or label text
  - This includes when the title is used in **error messages**
- Html (guidance) component **content**
- Summary component **row** key title (check answers and repeater summary)

### Template data

The data the templates are evaluated against is the raw answers the user has provided up to the page they're currently on.
For example, given a YesNoField component called `TKsWbP`, the template `{{ TKsWbP }}` would render "true" or "false" depending on how the user answered the question.

The current FormContext is also available as `context` in the templates. This allows access to the full data including the path the user has taken in their journey and any miscellaneous data returned from `Page event`s in `context.data`.

### Liquid Filters

There are a number of `LiquidJS` filters available to you from within the templates:

- `page` - returns the page definition for the given path
- `field` - returns the component definition for the given name
- `href` - returns the page href for the given page path
- `answer` - returns the user's answer for a given component
- `evaluate` - evaluates and returns a Liquid template using the current context

### Examples

```json
"pages": [
  {
    "title": "What's your name?",
    "path": "/full-name",
    "components": [
      {
        "name": "WmHfSb",
        "title": "What's your full name?",
        "type": "TextField"
      }
    ]
  },
  // This example shows how a component can use an answer to a previous question (What's your full name) in it's title
  {
    "title": "Are you in England?",
    "path": "/are-you-in-england",
    "components": [
      {
        "name": "TKsWbP",
        "title": "Are you in England, {{ WmHfSb }}?",
        "type": "YesNoField"
      }
    ]
  },
  // This example shows how a Html (guidance) component can use the available filters to get the form definition and user answers and display them
  {
    "title": "Template example for {{ WmHfSb }}?",
    "path": "/example",
    "components": [
      {
        "title": "Html",
        "type": "Html",
        "content": "<p class=\"govuk-body\">
          // Use Liquid's `assign` to create a variable that holds reference to the \"/are-you-in-england\" page
          {%- assign inEngland = \"/are-you-in-england\" | page -%}

          // Use the reference to `evaluate` the title
          {{ inEngland.title | evaluate }}<br>

          // Use the href filter to display the full page path
          {{ \"/are-you-in-england\" | href }}<br>

          // Use the `answer` filter to render the user provided answer to a question
          {{ 'TKsWbP' | answer }}
        </p>\n"
      }
    ]
  }
]
```
