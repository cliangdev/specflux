# AgentsApi

All URIs are relative to *http://localhost:8090/api*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**createAgent**](AgentsApi.md#createagentoperation) | **POST** /api/projects/{projectRef}/agents | Add an agent to a project |
| [**deleteAgent**](AgentsApi.md#deleteagent) | **DELETE** /api/projects/{projectRef}/agents/{agentRef} | Remove an agent from a project |
| [**getAgent**](AgentsApi.md#getagent) | **GET** /api/projects/{projectRef}/agents/{agentRef} | Get an agent |
| [**listAgents**](AgentsApi.md#listagents) | **GET** /api/projects/{projectRef}/agents | List agents in a project |
| [**updateAgent**](AgentsApi.md#updateagentoperation) | **PUT** /api/projects/{projectRef}/agents/{agentRef} | Update an agent |



## createAgent

> Agent createAgent(projectRef, createAgentRequest)

Add an agent to a project

### Example

```ts
import {
  Configuration,
  AgentsApi,
} from '';
import type { CreateAgentOperationRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new AgentsApi(config);

  const body = {
    // string
    projectRef: projectRef_example,
    // CreateAgentRequest
    createAgentRequest: ...,
  } satisfies CreateAgentOperationRequest;

  try {
    const data = await api.createAgent(body);
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
| **createAgentRequest** | [CreateAgentRequest](CreateAgentRequest.md) |  | |

### Return type

[**Agent**](Agent.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** | Agent created |  -  |
| **400** | Validation error |  -  |
| **401** | Authentication required |  -  |
| **404** | Resource not found |  -  |
| **409** | Resource already exists |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## deleteAgent

> deleteAgent(projectRef, agentRef)

Remove an agent from a project

### Example

```ts
import {
  Configuration,
  AgentsApi,
} from '';
import type { DeleteAgentRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new AgentsApi(config);

  const body = {
    // string
    projectRef: projectRef_example,
    // string | Agent public ID (agent_xxx)
    agentRef: agentRef_example,
  } satisfies DeleteAgentRequest;

  try {
    const data = await api.deleteAgent(body);
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
| **agentRef** | `string` | Agent public ID (agent_xxx) | [Defaults to `undefined`] |

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
| **204** | Agent deleted |  -  |
| **401** | Authentication required |  -  |
| **404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getAgent

> Agent getAgent(projectRef, agentRef)

Get an agent

### Example

```ts
import {
  Configuration,
  AgentsApi,
} from '';
import type { GetAgentRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new AgentsApi(config);

  const body = {
    // string
    projectRef: projectRef_example,
    // string | Agent public ID (agent_xxx)
    agentRef: agentRef_example,
  } satisfies GetAgentRequest;

  try {
    const data = await api.getAgent(body);
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
| **agentRef** | `string` | Agent public ID (agent_xxx) | [Defaults to `undefined`] |

### Return type

[**Agent**](Agent.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Agent details |  -  |
| **401** | Authentication required |  -  |
| **404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listAgents

> AgentListResponse listAgents(projectRef)

List agents in a project

### Example

```ts
import {
  Configuration,
  AgentsApi,
} from '';
import type { ListAgentsRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new AgentsApi(config);

  const body = {
    // string
    projectRef: projectRef_example,
  } satisfies ListAgentsRequest;

  try {
    const data = await api.listAgents(body);
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

[**AgentListResponse**](AgentListResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | List of agents |  -  |
| **401** | Authentication required |  -  |
| **404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## updateAgent

> Agent updateAgent(projectRef, agentRef, updateAgentRequest)

Update an agent

### Example

```ts
import {
  Configuration,
  AgentsApi,
} from '';
import type { UpdateAgentOperationRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new AgentsApi(config);

  const body = {
    // string
    projectRef: projectRef_example,
    // string | Agent public ID (agent_xxx)
    agentRef: agentRef_example,
    // UpdateAgentRequest
    updateAgentRequest: ...,
  } satisfies UpdateAgentOperationRequest;

  try {
    const data = await api.updateAgent(body);
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
| **agentRef** | `string` | Agent public ID (agent_xxx) | [Defaults to `undefined`] |
| **updateAgentRequest** | [UpdateAgentRequest](UpdateAgentRequest.md) |  | |

### Return type

[**Agent**](Agent.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Agent updated |  -  |
| **400** | Validation error |  -  |
| **401** | Authentication required |  -  |
| **404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

