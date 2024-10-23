# Page Controllers

Form pages could have specific controllers and this is specified inside the Form JSON, please see below a sample where the page summary is specifying it's controller via `controller` property.

```json
{
  "pages": [
    {
      "path": "/summary",
      "controller": "SummaryPageController",
      "title": "Summary",
      "components": [],
      "next": []
    }
  ]
}
```
