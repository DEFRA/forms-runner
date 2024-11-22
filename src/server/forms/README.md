# Pre-configured Forms

This folder holds pre-configured form definitions that can be loaded by the runner:

```js
const server = await createServer({
  formFileName: 'example.js',
  formFilePath: join(cwd(), 'server/forms'),
})
```
