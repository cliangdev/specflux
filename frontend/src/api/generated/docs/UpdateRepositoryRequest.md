
# UpdateRepositoryRequest


## Properties

Name | Type
------------ | -------------
`name` | string
`gitUrl` | string
`defaultBranch` | string
`status` | [RepositoryStatus](RepositoryStatus.md)

## Example

```typescript
import type { UpdateRepositoryRequest } from ''

// TODO: Update the object below with actual values
const example = {
  "name": null,
  "gitUrl": null,
  "defaultBranch": null,
  "status": null,
} satisfies UpdateRepositoryRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as UpdateRepositoryRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


