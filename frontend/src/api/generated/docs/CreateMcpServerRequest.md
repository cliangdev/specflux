
# CreateMcpServerRequest


## Properties

Name | Type
------------ | -------------
`name` | string
`command` | string
`args` | Array&lt;string&gt;
`envVars` | { [key: string]: string; }
`isActive` | boolean

## Example

```typescript
import type { CreateMcpServerRequest } from ''

// TODO: Update the object below with actual values
const example = {
  "name": null,
  "command": null,
  "args": null,
  "envVars": null,
  "isActive": null,
} satisfies CreateMcpServerRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as CreateMcpServerRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


