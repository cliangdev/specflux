
# CreateEpicRequest


## Properties

Name | Type
------------ | -------------
`title` | string
`description` | string
`targetDate` | Date
`releaseRef` | string
`prdFilePath` | string

## Example

```typescript
import type { CreateEpicRequest } from ''

// TODO: Update the object below with actual values
const example = {
  "title": null,
  "description": null,
  "targetDate": null,
  "releaseRef": null,
  "prdFilePath": null,
} satisfies CreateEpicRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as CreateEpicRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


