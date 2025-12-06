
# TaskStats


## Properties

Name | Type
------------ | -------------
`total` | number
`done` | number
`inProgress` | number
`backlog` | number

## Example

```typescript
import type { TaskStats } from ''

// TODO: Update the object below with actual values
const example = {
  "total": null,
  "done": null,
  "inProgress": null,
  "backlog": null,
} satisfies TaskStats

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as TaskStats
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


