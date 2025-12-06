
# CreateRepositoryRequest


## Properties

Name | Type
------------ | -------------
`name` | string
`path` | string
`gitUrl` | string
`defaultBranch` | string

## Example

```typescript
import type { CreateRepositoryRequest } from ''

// TODO: Update the object below with actual values
const example = {
  "name": null,
  "path": null,
  "gitUrl": null,
  "defaultBranch": null,
} satisfies CreateRepositoryRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as CreateRepositoryRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


