
# CreateTaskRequest


## Properties

Name | Type
------------ | -------------
`epicRef` | string
`title` | string
`description` | string
`priority` | [TaskPriority](TaskPriority.md)
`requiresApproval` | boolean
`estimatedDuration` | number
`assignedToRef` | string

## Example

```typescript
import type { CreateTaskRequest } from ''

// TODO: Update the object below with actual values
const example = {
  "epicRef": null,
  "title": null,
  "description": null,
  "priority": null,
  "requiresApproval": null,
  "estimatedDuration": null,
  "assignedToRef": null,
} satisfies CreateTaskRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as CreateTaskRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


