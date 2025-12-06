
# McpServer


## Properties

Name | Type
------------ | -------------
`id` | string
`projectId` | string
`name` | string
`command` | string
`args` | Array&lt;string&gt;
`envVars` | { [key: string]: string; }
`isActive` | boolean
`createdAt` | Date
`updatedAt` | Date

## Example

```typescript
import type { McpServer } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "projectId": null,
  "name": null,
  "command": null,
  "args": null,
  "envVars": null,
  "isActive": null,
  "createdAt": null,
  "updatedAt": null,
} satisfies McpServer

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as McpServer
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


