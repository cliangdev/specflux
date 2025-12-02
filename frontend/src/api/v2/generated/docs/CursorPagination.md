
# CursorPagination


## Properties

Name | Type
------------ | -------------
`nextCursor` | string
`prevCursor` | string
`hasMore` | boolean
`total` | number

## Example

```typescript
import type { CursorPagination } from ''

// TODO: Update the object below with actual values
const example = {
  "nextCursor": null,
  "prevCursor": null,
  "hasMore": null,
  "total": null,
} satisfies CursorPagination

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as CursorPagination
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


