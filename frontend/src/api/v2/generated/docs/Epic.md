
# Epic


## Properties

Name | Type
------------ | -------------
`publicId` | string
`displayKey` | string
`projectId` | string
`releaseId` | string
`title` | string
`description` | string
`status` | [EpicStatus](EpicStatus.md)
`targetDate` | Date
`prdFilePath` | string
`epicFilePath` | string
`dependsOn` | Array&lt;string&gt;
`phase` | number
`taskStats` | [TaskStats](TaskStats.md)
`progressPercentage` | number
`createdById` | string
`createdAt` | Date
`updatedAt` | Date

## Example

```typescript
import type { Epic } from ''

// TODO: Update the object below with actual values
const example = {
  "publicId": null,
  "displayKey": null,
  "projectId": null,
  "releaseId": null,
  "title": null,
  "description": null,
  "status": null,
  "targetDate": null,
  "prdFilePath": null,
  "epicFilePath": null,
  "dependsOn": null,
  "phase": null,
  "taskStats": null,
  "progressPercentage": null,
  "createdById": null,
  "createdAt": null,
  "updatedAt": null,
} satisfies Epic

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as Epic
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


