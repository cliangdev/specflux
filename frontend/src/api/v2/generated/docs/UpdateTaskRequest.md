
# UpdateTaskRequest


## Properties

Name | Type
------------ | -------------
`epicRef` | string
`title` | string
`description` | string
`status` | [TaskStatus](TaskStatus.md)
`priority` | [TaskPriority](TaskPriority.md)
`requiresApproval` | boolean
`estimatedDuration` | number
`actualDuration` | number
`githubPrUrl` | string
`assignedToRef` | string

## Example

```typescript
import type { UpdateTaskRequest } from ''

// TODO: Update the object below with actual values
const example = {
  "epicRef": null,
  "title": null,
  "description": null,
  "status": null,
  "priority": null,
  "requiresApproval": null,
  "estimatedDuration": null,
  "actualDuration": null,
  "githubPrUrl": null,
  "assignedToRef": null,
} satisfies UpdateTaskRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as UpdateTaskRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


