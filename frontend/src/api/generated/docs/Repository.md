
# Repository


## Properties

Name | Type
------------ | -------------
`id` | string
`projectId` | string
`name` | string
`path` | string
`gitUrl` | string
`defaultBranch` | string
`status` | [RepositoryStatus](RepositoryStatus.md)
`createdAt` | Date
`updatedAt` | Date

## Example

```typescript
import type { Repository } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "projectId": null,
  "name": null,
  "path": null,
  "gitUrl": null,
  "defaultBranch": null,
  "status": null,
  "createdAt": null,
  "updatedAt": null,
} satisfies Repository

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as Repository
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


