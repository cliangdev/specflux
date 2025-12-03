
# Project


## Properties

Name | Type
------------ | -------------
`id` | string
`projectKey` | string
`name` | string
`description` | string
`ownerId` | string
`createdAt` | Date
`updatedAt` | Date

## Example

```typescript
import type { Project } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "projectKey": null,
  "name": null,
  "description": null,
  "ownerId": null,
  "createdAt": null,
  "updatedAt": null,
} satisfies Project

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as Project
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


