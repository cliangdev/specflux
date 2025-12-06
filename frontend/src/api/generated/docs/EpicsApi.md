# EpicsApi

All URIs are relative to *http://localhost:8090/api*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**addEpicDependency**](EpicsApi.md#addepicdependencyoperation) | **POST** /api/projects/{projectRef}/epics/{epicRef}/dependencies | Add a dependency to an epic |
| [**createEpic**](EpicsApi.md#createepicoperation) | **POST** /api/projects/{projectRef}/epics | Create a new epic |
| [**createEpicAcceptanceCriteria**](EpicsApi.md#createepicacceptancecriteria) | **POST** /api/projects/{projectRef}/epics/{epicRef}/acceptance-criteria | Add acceptance criteria to an epic |
| [**deleteEpic**](EpicsApi.md#deleteepic) | **DELETE** /api/projects/{projectRef}/epics/{epicRef} | Delete an epic |
| [**deleteEpicAcceptanceCriteria**](EpicsApi.md#deleteepicacceptancecriteria) | **DELETE** /api/projects/{projectRef}/epics/{epicRef}/acceptance-criteria/{criteriaId} | Delete acceptance criteria from an epic |
| [**getEpic**](EpicsApi.md#getepic) | **GET** /api/projects/{projectRef}/epics/{epicRef} | Get an epic |
| [**getEpicAcceptanceCriteria**](EpicsApi.md#getepicacceptancecriteria) | **GET** /api/projects/{projectRef}/epics/{epicRef}/acceptance-criteria/{criteriaId} | Get a specific acceptance criteria for an epic |
| [**listEpicAcceptanceCriteria**](EpicsApi.md#listepicacceptancecriteria) | **GET** /api/projects/{projectRef}/epics/{epicRef}/acceptance-criteria | List acceptance criteria for an epic |
| [**listEpicDependencies**](EpicsApi.md#listepicdependencies) | **GET** /api/projects/{projectRef}/epics/{epicRef}/dependencies | List epics this epic depends on |
| [**listEpicTasks**](EpicsApi.md#listepictasks) | **GET** /api/projects/{projectRef}/epics/{epicRef}/tasks | List tasks in an epic |
| [**listEpics**](EpicsApi.md#listepics) | **GET** /api/projects/{projectRef}/epics | List epics in a project |
| [**removeEpicDependency**](EpicsApi.md#removeepicdependency) | **DELETE** /api/projects/{projectRef}/epics/{epicRef}/dependencies/{depEpicRef} | Remove a dependency from an epic |
| [**updateEpic**](EpicsApi.md#updateepicoperation) | **PUT** /api/projects/{projectRef}/epics/{epicRef} | Update an epic |
| [**updateEpicAcceptanceCriteria**](EpicsApi.md#updateepicacceptancecriteria) | **PUT** /api/projects/{projectRef}/epics/{epicRef}/acceptance-criteria/{criteriaId} | Update acceptance criteria for an epic |



## addEpicDependency

> Epic addEpicDependency(projectRef, epicRef, addEpicDependencyRequest)

Add a dependency to an epic

### Example

```ts
import {
  Configuration,
  EpicsApi,
} from '';
import type { AddEpicDependencyOperationRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new EpicsApi(config);

  const body = {
    // string
    projectRef: projectRef_example,
    // string
    epicRef: epicRef_example,
    // AddEpicDependencyRequest
    addEpicDependencyRequest: ...,
  } satisfies AddEpicDependencyOperationRequest;

  try {
    const data = await api.addEpicDependency(body);
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
| **epicRef** | `string` |  | [Defaults to `undefined`] |
| **addEpicDependencyRequest** | [AddEpicDependencyRequest](AddEpicDependencyRequest.md) |  | |

### Return type

[**Epic**](Epic.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** | Dependency added |  -  |
| **400** | Validation error |  -  |
| **401** | Authentication required |  -  |
| **404** | Resource not found |  -  |
| **409** | Resource already exists |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## createEpic

> Epic createEpic(projectRef, createEpicRequest)

Create a new epic

### Example

```ts
import {
  Configuration,
  EpicsApi,
} from '';
import type { CreateEpicOperationRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new EpicsApi(config);

  const body = {
    // string
    projectRef: projectRef_example,
    // CreateEpicRequest
    createEpicRequest: ...,
  } satisfies CreateEpicOperationRequest;

  try {
    const data = await api.createEpic(body);
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
| **createEpicRequest** | [CreateEpicRequest](CreateEpicRequest.md) |  | |

### Return type

[**Epic**](Epic.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** | Epic created |  -  |
| **400** | Validation error |  -  |
| **401** | Authentication required |  -  |
| **404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## createEpicAcceptanceCriteria

> AcceptanceCriteria createEpicAcceptanceCriteria(projectRef, epicRef, createAcceptanceCriteriaRequest)

Add acceptance criteria to an epic

### Example

```ts
import {
  Configuration,
  EpicsApi,
} from '';
import type { CreateEpicAcceptanceCriteriaRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new EpicsApi(config);

  const body = {
    // string
    projectRef: projectRef_example,
    // string
    epicRef: epicRef_example,
    // CreateAcceptanceCriteriaRequest
    createAcceptanceCriteriaRequest: ...,
  } satisfies CreateEpicAcceptanceCriteriaRequest;

  try {
    const data = await api.createEpicAcceptanceCriteria(body);
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
| **epicRef** | `string` |  | [Defaults to `undefined`] |
| **createAcceptanceCriteriaRequest** | [CreateAcceptanceCriteriaRequest](CreateAcceptanceCriteriaRequest.md) |  | |

### Return type

[**AcceptanceCriteria**](AcceptanceCriteria.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** | Acceptance criteria created |  -  |
| **400** | Validation error |  -  |
| **401** | Authentication required |  -  |
| **404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## deleteEpic

> deleteEpic(projectRef, epicRef)

Delete an epic

### Example

```ts
import {
  Configuration,
  EpicsApi,
} from '';
import type { DeleteEpicRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new EpicsApi(config);

  const body = {
    // string
    projectRef: projectRef_example,
    // string | Epic public ID (epic_xxx) or display key (SPEC-E1)
    epicRef: epicRef_example,
  } satisfies DeleteEpicRequest;

  try {
    const data = await api.deleteEpic(body);
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
| **epicRef** | `string` | Epic public ID (epic_xxx) or display key (SPEC-E1) | [Defaults to `undefined`] |

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
| **204** | Epic deleted |  -  |
| **401** | Authentication required |  -  |
| **404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## deleteEpicAcceptanceCriteria

> deleteEpicAcceptanceCriteria(projectRef, epicRef, criteriaId)

Delete acceptance criteria from an epic

### Example

```ts
import {
  Configuration,
  EpicsApi,
} from '';
import type { DeleteEpicAcceptanceCriteriaRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new EpicsApi(config);

  const body = {
    // string
    projectRef: projectRef_example,
    // string
    epicRef: epicRef_example,
    // number | Acceptance criteria ID
    criteriaId: 789,
  } satisfies DeleteEpicAcceptanceCriteriaRequest;

  try {
    const data = await api.deleteEpicAcceptanceCriteria(body);
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
| **epicRef** | `string` |  | [Defaults to `undefined`] |
| **criteriaId** | `number` | Acceptance criteria ID | [Defaults to `undefined`] |

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
| **204** | Acceptance criteria deleted |  -  |
| **401** | Authentication required |  -  |
| **404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getEpic

> Epic getEpic(projectRef, epicRef)

Get an epic

### Example

```ts
import {
  Configuration,
  EpicsApi,
} from '';
import type { GetEpicRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new EpicsApi(config);

  const body = {
    // string
    projectRef: projectRef_example,
    // string | Epic public ID (epic_xxx) or display key (SPEC-E1)
    epicRef: epicRef_example,
  } satisfies GetEpicRequest;

  try {
    const data = await api.getEpic(body);
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
| **epicRef** | `string` | Epic public ID (epic_xxx) or display key (SPEC-E1) | [Defaults to `undefined`] |

### Return type

[**Epic**](Epic.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Epic details |  -  |
| **401** | Authentication required |  -  |
| **404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getEpicAcceptanceCriteria

> AcceptanceCriteria getEpicAcceptanceCriteria(projectRef, epicRef, criteriaId)

Get a specific acceptance criteria for an epic

### Example

```ts
import {
  Configuration,
  EpicsApi,
} from '';
import type { GetEpicAcceptanceCriteriaRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new EpicsApi(config);

  const body = {
    // string
    projectRef: projectRef_example,
    // string
    epicRef: epicRef_example,
    // number | Acceptance criteria ID
    criteriaId: 789,
  } satisfies GetEpicAcceptanceCriteriaRequest;

  try {
    const data = await api.getEpicAcceptanceCriteria(body);
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
| **epicRef** | `string` |  | [Defaults to `undefined`] |
| **criteriaId** | `number` | Acceptance criteria ID | [Defaults to `undefined`] |

### Return type

[**AcceptanceCriteria**](AcceptanceCriteria.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Acceptance criteria details |  -  |
| **401** | Authentication required |  -  |
| **404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listEpicAcceptanceCriteria

> AcceptanceCriteriaListResponse listEpicAcceptanceCriteria(projectRef, epicRef)

List acceptance criteria for an epic

### Example

```ts
import {
  Configuration,
  EpicsApi,
} from '';
import type { ListEpicAcceptanceCriteriaRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new EpicsApi(config);

  const body = {
    // string
    projectRef: projectRef_example,
    // string
    epicRef: epicRef_example,
  } satisfies ListEpicAcceptanceCriteriaRequest;

  try {
    const data = await api.listEpicAcceptanceCriteria(body);
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
| **epicRef** | `string` |  | [Defaults to `undefined`] |

### Return type

[**AcceptanceCriteriaListResponse**](AcceptanceCriteriaListResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | List of acceptance criteria |  -  |
| **401** | Authentication required |  -  |
| **404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listEpicDependencies

> EpicListResponse listEpicDependencies(projectRef, epicRef)

List epics this epic depends on

### Example

```ts
import {
  Configuration,
  EpicsApi,
} from '';
import type { ListEpicDependenciesRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new EpicsApi(config);

  const body = {
    // string
    projectRef: projectRef_example,
    // string
    epicRef: epicRef_example,
  } satisfies ListEpicDependenciesRequest;

  try {
    const data = await api.listEpicDependencies(body);
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
| **epicRef** | `string` |  | [Defaults to `undefined`] |

### Return type

[**EpicListResponse**](EpicListResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | List of dependency epics |  -  |
| **401** | Authentication required |  -  |
| **404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listEpicTasks

> TaskListResponse listEpicTasks(projectRef, epicRef, cursor, limit, status)

List tasks in an epic

### Example

```ts
import {
  Configuration,
  EpicsApi,
} from '';
import type { ListEpicTasksRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new EpicsApi(config);

  const body = {
    // string
    projectRef: projectRef_example,
    // string
    epicRef: epicRef_example,
    // string | Base64-encoded pagination cursor (optional)
    cursor: cursor_example,
    // number | Items per page (default 20, max 100) (optional)
    limit: 56,
    // TaskStatus | Filter by task status (optional)
    status: ...,
  } satisfies ListEpicTasksRequest;

  try {
    const data = await api.listEpicTasks(body);
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
| **epicRef** | `string` |  | [Defaults to `undefined`] |
| **cursor** | `string` | Base64-encoded pagination cursor | [Optional] [Defaults to `undefined`] |
| **limit** | `number` | Items per page (default 20, max 100) | [Optional] [Defaults to `20`] |
| **status** | `TaskStatus` | Filter by task status | [Optional] [Defaults to `undefined`] [Enum: BACKLOG, READY, IN_PROGRESS, IN_REVIEW, BLOCKED, COMPLETED, CANCELLED] |

### Return type

[**TaskListResponse**](TaskListResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | List of tasks in the epic |  -  |
| **401** | Authentication required |  -  |
| **404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listEpics

> EpicListResponse listEpics(projectRef, cursor, limit, sort, order, status)

List epics in a project

### Example

```ts
import {
  Configuration,
  EpicsApi,
} from '';
import type { ListEpicsRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new EpicsApi(config);

  const body = {
    // string
    projectRef: projectRef_example,
    // string | Base64-encoded pagination cursor (optional)
    cursor: cursor_example,
    // number | Items per page (default 20, max 100) (optional)
    limit: 56,
    // 'created_at' | 'updated_at' | 'title' (optional)
    sort: sort_example,
    // 'asc' | 'desc' (optional)
    order: order_example,
    // EpicStatus (optional)
    status: ...,
  } satisfies ListEpicsRequest;

  try {
    const data = await api.listEpics(body);
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
| **cursor** | `string` | Base64-encoded pagination cursor | [Optional] [Defaults to `undefined`] |
| **limit** | `number` | Items per page (default 20, max 100) | [Optional] [Defaults to `20`] |
| **sort** | `created_at`, `updated_at`, `title` |  | [Optional] [Defaults to `&#39;created_at&#39;`] [Enum: created_at, updated_at, title] |
| **order** | `asc`, `desc` |  | [Optional] [Defaults to `&#39;desc&#39;`] [Enum: asc, desc] |
| **status** | `EpicStatus` |  | [Optional] [Defaults to `undefined`] [Enum: PLANNING, IN_PROGRESS, BLOCKED, COMPLETED, CANCELLED] |

### Return type

[**EpicListResponse**](EpicListResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | List of epics |  -  |
| **401** | Authentication required |  -  |
| **404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## removeEpicDependency

> removeEpicDependency(projectRef, epicRef, depEpicRef)

Remove a dependency from an epic

### Example

```ts
import {
  Configuration,
  EpicsApi,
} from '';
import type { RemoveEpicDependencyRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new EpicsApi(config);

  const body = {
    // string
    projectRef: projectRef_example,
    // string
    epicRef: epicRef_example,
    // string | Dependency epic public ID or display key
    depEpicRef: depEpicRef_example,
  } satisfies RemoveEpicDependencyRequest;

  try {
    const data = await api.removeEpicDependency(body);
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
| **epicRef** | `string` |  | [Defaults to `undefined`] |
| **depEpicRef** | `string` | Dependency epic public ID or display key | [Defaults to `undefined`] |

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
| **204** | Dependency removed |  -  |
| **401** | Authentication required |  -  |
| **404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## updateEpic

> Epic updateEpic(projectRef, epicRef, updateEpicRequest)

Update an epic

### Example

```ts
import {
  Configuration,
  EpicsApi,
} from '';
import type { UpdateEpicOperationRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new EpicsApi(config);

  const body = {
    // string
    projectRef: projectRef_example,
    // string | Epic public ID (epic_xxx) or display key (SPEC-E1)
    epicRef: epicRef_example,
    // UpdateEpicRequest
    updateEpicRequest: ...,
  } satisfies UpdateEpicOperationRequest;

  try {
    const data = await api.updateEpic(body);
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
| **epicRef** | `string` | Epic public ID (epic_xxx) or display key (SPEC-E1) | [Defaults to `undefined`] |
| **updateEpicRequest** | [UpdateEpicRequest](UpdateEpicRequest.md) |  | |

### Return type

[**Epic**](Epic.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Epic updated |  -  |
| **400** | Validation error |  -  |
| **401** | Authentication required |  -  |
| **404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## updateEpicAcceptanceCriteria

> AcceptanceCriteria updateEpicAcceptanceCriteria(projectRef, epicRef, criteriaId, updateAcceptanceCriteriaRequest)

Update acceptance criteria for an epic

### Example

```ts
import {
  Configuration,
  EpicsApi,
} from '';
import type { UpdateEpicAcceptanceCriteriaRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new EpicsApi(config);

  const body = {
    // string
    projectRef: projectRef_example,
    // string
    epicRef: epicRef_example,
    // number | Acceptance criteria ID
    criteriaId: 789,
    // UpdateAcceptanceCriteriaRequest
    updateAcceptanceCriteriaRequest: ...,
  } satisfies UpdateEpicAcceptanceCriteriaRequest;

  try {
    const data = await api.updateEpicAcceptanceCriteria(body);
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
| **epicRef** | `string` |  | [Defaults to `undefined`] |
| **criteriaId** | `number` | Acceptance criteria ID | [Defaults to `undefined`] |
| **updateAcceptanceCriteriaRequest** | [UpdateAcceptanceCriteriaRequest](UpdateAcceptanceCriteriaRequest.md) |  | |

### Return type

[**AcceptanceCriteria**](AcceptanceCriteria.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Acceptance criteria updated |  -  |
| **400** | Validation error |  -  |
| **401** | Authentication required |  -  |
| **404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

