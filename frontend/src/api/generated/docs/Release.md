
# Release


## Properties

Name | Type
------------ | -------------
`id` | string
`displayKey` | string
`projectId` | string
`name` | string
`description` | string
`targetDate` | Date
`status` | [ReleaseStatus](ReleaseStatus.md)
`createdAt` | Date
`updatedAt` | Date

## Example

```typescript
import type { Release } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "displayKey": null,
  "projectId": null,
  "name": null,
  "description": null,
  "targetDate": null,
  "status": null,
  "createdAt": null,
  "updatedAt": null,
} satisfies Release

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as Release
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


