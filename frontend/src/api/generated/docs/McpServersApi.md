# McpServersApi

All URIs are relative to *http://localhost:8090/api*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**createMcpServer**](McpServersApi.md#createmcpserveroperation) | **POST** /api/projects/{projectRef}/mcp-servers | Add an MCP server to a project |
| [**deleteMcpServer**](McpServersApi.md#deletemcpserver) | **DELETE** /api/projects/{projectRef}/mcp-servers/{serverRef} | Remove an MCP server from a project |
| [**getMcpServer**](McpServersApi.md#getmcpserver) | **GET** /api/projects/{projectRef}/mcp-servers/{serverRef} | Get an MCP server |
| [**listMcpServers**](McpServersApi.md#listmcpservers) | **GET** /api/projects/{projectRef}/mcp-servers | List MCP servers in a project |
| [**toggleMcpServer**](McpServersApi.md#togglemcpserver) | **POST** /api/projects/{projectRef}/mcp-servers/{serverRef}/toggle | Toggle MCP server active status |
| [**updateMcpServer**](McpServersApi.md#updatemcpserveroperation) | **PUT** /api/projects/{projectRef}/mcp-servers/{serverRef} | Update an MCP server |



## createMcpServer

> McpServer createMcpServer(projectRef, createMcpServerRequest)

Add an MCP server to a project

### Example

```ts
import {
  Configuration,
  McpServersApi,
} from '';
import type { CreateMcpServerOperationRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new McpServersApi(config);

  const body = {
    // string
    projectRef: projectRef_example,
    // CreateMcpServerRequest
    createMcpServerRequest: ...,
  } satisfies CreateMcpServerOperationRequest;

  try {
    const data = await api.createMcpServer(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **projectRef** | `string` |  | [Defaults to `undefined`] |
| **createMcpServerRequest** | [CreateMcpServerRequest](CreateMcpServerRequest.md) |  | |

### Return type

[**McpServer**](McpServer.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** | MCP server created |  -  |
| **400** | Validation error |  -  |
| **401** | Authentication required |  -  |
| **404** | Resource not found |  -  |
| **409** | Resource already exists |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## deleteMcpServer

> deleteMcpServer(projectRef, serverRef)

Remove an MCP server from a project

### Example

```ts
import {
  Configuration,
  McpServersApi,
} from '';
import type { DeleteMcpServerRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new McpServersApi(config);

  const body = {
    // string
    projectRef: projectRef_example,
    // string | MCP server public ID (mcp_xxx)
    serverRef: serverRef_example,
  } satisfies DeleteMcpServerRequest;

  try {
    const data = await api.deleteMcpServer(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **projectRef** | `string` |  | [Defaults to `undefined`] |
| **serverRef** | `string` | MCP server public ID (mcp_xxx) | [Defaults to `undefined`] |

### Return type

`void` (Empty response body)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **204** | MCP server deleted |  -  |
| **401** | Authentication required |  -  |
| **404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getMcpServer

> McpServer getMcpServer(projectRef, serverRef)

Get an MCP server

### Example

```ts
import {
  Configuration,
  McpServersApi,
} from '';
import type { GetMcpServerRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new McpServersApi(config);

  const body = {
    // string
    projectRef: projectRef_example,
    // string | MCP server public ID (mcp_xxx)
    serverRef: serverRef_example,
  } satisfies GetMcpServerRequest;

  try {
    const data = await api.getMcpServer(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **projectRef** | `string` |  | [Defaults to `undefined`] |
| **serverRef** | `string` | MCP server public ID (mcp_xxx) | [Defaults to `undefined`] |

### Return type

[**McpServer**](McpServer.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | MCP server details |  -  |
| **401** | Authentication required |  -  |
| **404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listMcpServers

> McpServerListResponse listMcpServers(projectRef)

List MCP servers in a project

### Example

```ts
import {
  Configuration,
  McpServersApi,
} from '';
import type { ListMcpServersRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new McpServersApi(config);

  const body = {
    // string
    projectRef: projectRef_example,
  } satisfies ListMcpServersRequest;

  try {
    const data = await api.listMcpServers(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **projectRef** | `string` |  | [Defaults to `undefined`] |

### Return type

[**McpServerListResponse**](McpServerListResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | List of MCP servers |  -  |
| **401** | Authentication required |  -  |
| **404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## toggleMcpServer

> McpServer toggleMcpServer(projectRef, serverRef)

Toggle MCP server active status

### Example

```ts
import {
  Configuration,
  McpServersApi,
} from '';
import type { ToggleMcpServerRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new McpServersApi(config);

  const body = {
    // string
    projectRef: projectRef_example,
    // string
    serverRef: serverRef_example,
  } satisfies ToggleMcpServerRequest;

  try {
    const data = await api.toggleMcpServer(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **projectRef** | `string` |  | [Defaults to `undefined`] |
| **serverRef** | `string` |  | [Defaults to `undefined`] |

### Return type

[**McpServer**](McpServer.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | MCP server toggled |  -  |
| **401** | Authentication required |  -  |
| **404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## updateMcpServer

> McpServer updateMcpServer(projectRef, serverRef, updateMcpServerRequest)

Update an MCP server

### Example

```ts
import {
  Configuration,
  McpServersApi,
} from '';
import type { UpdateMcpServerOperationRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new McpServersApi(config);

  const body = {
    // string
    projectRef: projectRef_example,
    // string | MCP server public ID (mcp_xxx)
    serverRef: serverRef_example,
    // UpdateMcpServerRequest
    updateMcpServerRequest: ...,
  } satisfies UpdateMcpServerOperationRequest;

  try {
    const data = await api.updateMcpServer(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **projectRef** | `string` |  | [Defaults to `undefined`] |
| **serverRef** | `string` | MCP server public ID (mcp_xxx) | [Defaults to `undefined`] |
| **updateMcpServerRequest** | [UpdateMcpServerRequest](UpdateMcpServerRequest.md) |  | |

### Return type

[**McpServer**](McpServer.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | MCP server updated |  -  |
| **400** | Validation error |  -  |
| **401** | Authentication required |  -  |
| **404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

