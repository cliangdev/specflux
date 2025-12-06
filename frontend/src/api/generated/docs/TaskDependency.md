
# TaskDependency


## Properties

Name | Type
------------ | -------------
`taskId` | string
`dependsOnTaskId` | string
`dependsOnDisplayKey` | string
`createdAt` | Date

## Example

```typescript
import type { TaskDependency } from ''

// TODO: Update the object below with actual values
const example = {
  "taskId": null,
  "dependsOnTaskId": null,
  "dependsOnDisplayKey": null,
  "createdAt": null,
} satisfies TaskDependency

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as TaskDependency
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


