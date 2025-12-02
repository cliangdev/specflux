
# Task


## Properties

Name | Type
------------ | -------------
`publicId` | string
`displayKey` | string
`projectId` | string
`epicId` | string
`epicDisplayKey` | string
`title` | string
`description` | string
`status` | [TaskStatus](TaskStatus.md)
`priority` | [TaskPriority](TaskPriority.md)
`requiresApproval` | boolean
`estimatedDuration` | number
`actualDuration` | number
`githubPrUrl` | string
`createdById` | string
`assignedToId` | string
`createdAt` | Date
`updatedAt` | Date

## Example

```typescript
import type { Task } from ''

// TODO: Update the object below with actual values
const example = {
  "publicId": null,
  "displayKey": null,
  "projectId": null,
  "epicId": null,
  "epicDisplayKey": null,
  "title": null,
  "description": null,
  "status": null,
  "priority": null,
  "requiresApproval": null,
  "estimatedDuration": null,
  "actualDuration": null,
  "githubPrUrl": null,
  "createdById": null,
  "assignedToId": null,
  "createdAt": null,
  "updatedAt": null,
} satisfies Task

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as Task
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


