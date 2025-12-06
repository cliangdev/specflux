# TasksApi

All URIs are relative to *http://localhost:8090/api*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**addTaskDependency**](TasksApi.md#addtaskdependencyoperation) | **POST** /api/projects/{projectRef}/tasks/{taskRef}/dependencies | Add a dependency to a task |
| [**createTask**](TasksApi.md#createtaskoperation) | **POST** /api/projects/{projectRef}/tasks | Create a new task |
| [**createTaskAcceptanceCriteria**](TasksApi.md#createtaskacceptancecriteria) | **POST** /api/projects/{projectRef}/tasks/{taskRef}/acceptance-criteria | Add acceptance criteria to a task |
| [**deleteTask**](TasksApi.md#deletetask) | **DELETE** /api/projects/{projectRef}/tasks/{taskRef} | Delete a task |
| [**deleteTaskAcceptanceCriteria**](TasksApi.md#deletetaskacceptancecriteria) | **DELETE** /api/projects/{projectRef}/tasks/{taskRef}/acceptance-criteria/{criteriaId} | Delete acceptance criteria from a task |
| [**getTask**](TasksApi.md#gettask) | **GET** /api/projects/{projectRef}/tasks/{taskRef} | Get a task |
| [**getTaskAcceptanceCriteria**](TasksApi.md#gettaskacceptancecriteria) | **GET** /api/projects/{projectRef}/tasks/{taskRef}/acceptance-criteria/{criteriaId} | Get a specific acceptance criteria for a task |
| [**listTaskAcceptanceCriteria**](TasksApi.md#listtaskacceptancecriteria) | **GET** /api/projects/{projectRef}/tasks/{taskRef}/acceptance-criteria | List acceptance criteria for a task |
| [**listTaskDependencies**](TasksApi.md#listtaskdependencies) | **GET** /api/projects/{projectRef}/tasks/{taskRef}/dependencies | List dependencies for a task |
| [**listTasks**](TasksApi.md#listtasks) | **GET** /api/projects/{projectRef}/tasks | List tasks in a project |
| [**removeTaskDependency**](TasksApi.md#removetaskdependency) | **DELETE** /api/projects/{projectRef}/tasks/{taskRef}/dependencies/{dependsOnTaskRef} | Remove a dependency from a task |
| [**updateTask**](TasksApi.md#updatetaskoperation) | **PATCH** /api/projects/{projectRef}/tasks/{taskRef} | Partially update a task |
| [**updateTaskAcceptanceCriteria**](TasksApi.md#updatetaskacceptancecriteria) | **PUT** /api/projects/{projectRef}/tasks/{taskRef}/acceptance-criteria/{criteriaId} | Update acceptance criteria for a task |



## addTaskDependency

> TaskDependency addTaskDependency(projectRef, taskRef, addTaskDependencyRequest)

Add a dependency to a task

### Example

```ts
import {
  Configuration,
  TasksApi,
} from '';
import type { AddTaskDependencyOperationRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new TasksApi(config);

  const body = {
    // string
    projectRef: projectRef_example,
    // string
    taskRef: taskRef_example,
    // AddTaskDependencyRequest
    addTaskDependencyRequest: ...,
  } satisfies AddTaskDependencyOperationRequest;

  try {
    const data = await api.addTaskDependency(body);
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
| **taskRef** | `string` |  | [Defaults to `undefined`] |
| **addTaskDependencyRequest** | [AddTaskDependencyRequest](AddTaskDependencyRequest.md) |  | |

### Return type

[**TaskDependency**](TaskDependency.md)

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


## createTask

> Task createTask(projectRef, createTaskRequest)

Create a new task

### Example

```ts
import {
  Configuration,
  TasksApi,
} from '';
import type { CreateTaskOperationRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new TasksApi(config);

  const body = {
    // string
    projectRef: projectRef_example,
    // CreateTaskRequest
    createTaskRequest: ...,
  } satisfies CreateTaskOperationRequest;

  try {
    const data = await api.createTask(body);
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
| **createTaskRequest** | [CreateTaskRequest](CreateTaskRequest.md) |  | |

### Return type

[**Task**](Task.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** | Task created |  -  |
| **400** | Validation error |  -  |
| **401** | Authentication required |  -  |
| **404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## createTaskAcceptanceCriteria

> AcceptanceCriteria createTaskAcceptanceCriteria(projectRef, taskRef, createAcceptanceCriteriaRequest)

Add acceptance criteria to a task

### Example

```ts
import {
  Configuration,
  TasksApi,
} from '';
import type { CreateTaskAcceptanceCriteriaRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new TasksApi(config);

  const body = {
    // string
    projectRef: projectRef_example,
    // string
    taskRef: taskRef_example,
    // CreateAcceptanceCriteriaRequest
    createAcceptanceCriteriaRequest: ...,
  } satisfies CreateTaskAcceptanceCriteriaRequest;

  try {
    const data = await api.createTaskAcceptanceCriteria(body);
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
| **taskRef** | `string` |  | [Defaults to `undefined`] |
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


## deleteTask

> deleteTask(projectRef, taskRef)

Delete a task

### Example

```ts
import {
  Configuration,
  TasksApi,
} from '';
import type { DeleteTaskRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new TasksApi(config);

  const body = {
    // string
    projectRef: projectRef_example,
    // string | Task public ID (task_xxx) or display key (SPEC-42)
    taskRef: taskRef_example,
  } satisfies DeleteTaskRequest;

  try {
    const data = await api.deleteTask(body);
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
| **taskRef** | `string` | Task public ID (task_xxx) or display key (SPEC-42) | [Defaults to `undefined`] |

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
| **204** | Task deleted |  -  |
| **401** | Authentication required |  -  |
| **404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## deleteTaskAcceptanceCriteria

> deleteTaskAcceptanceCriteria(projectRef, taskRef, criteriaId)

Delete acceptance criteria from a task

### Example

```ts
import {
  Configuration,
  TasksApi,
} from '';
import type { DeleteTaskAcceptanceCriteriaRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new TasksApi(config);

  const body = {
    // string
    projectRef: projectRef_example,
    // string
    taskRef: taskRef_example,
    // number | Acceptance criteria ID
    criteriaId: 789,
  } satisfies DeleteTaskAcceptanceCriteriaRequest;

  try {
    const data = await api.deleteTaskAcceptanceCriteria(body);
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
| **taskRef** | `string` |  | [Defaults to `undefined`] |
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


## getTask

> Task getTask(projectRef, taskRef)

Get a task

### Example

```ts
import {
  Configuration,
  TasksApi,
} from '';
import type { GetTaskRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new TasksApi(config);

  const body = {
    // string
    projectRef: projectRef_example,
    // string | Task public ID (task_xxx) or display key (SPEC-42)
    taskRef: taskRef_example,
  } satisfies GetTaskRequest;

  try {
    const data = await api.getTask(body);
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
| **taskRef** | `string` | Task public ID (task_xxx) or display key (SPEC-42) | [Defaults to `undefined`] |

### Return type

[**Task**](Task.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Task details |  -  |
| **401** | Authentication required |  -  |
| **404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getTaskAcceptanceCriteria

> AcceptanceCriteria getTaskAcceptanceCriteria(projectRef, taskRef, criteriaId)

Get a specific acceptance criteria for a task

### Example

```ts
import {
  Configuration,
  TasksApi,
} from '';
import type { GetTaskAcceptanceCriteriaRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new TasksApi(config);

  const body = {
    // string
    projectRef: projectRef_example,
    // string
    taskRef: taskRef_example,
    // number | Acceptance criteria ID
    criteriaId: 789,
  } satisfies GetTaskAcceptanceCriteriaRequest;

  try {
    const data = await api.getTaskAcceptanceCriteria(body);
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
| **taskRef** | `string` |  | [Defaults to `undefined`] |
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


## listTaskAcceptanceCriteria

> AcceptanceCriteriaListResponse listTaskAcceptanceCriteria(projectRef, taskRef)

List acceptance criteria for a task

### Example

```ts
import {
  Configuration,
  TasksApi,
} from '';
import type { ListTaskAcceptanceCriteriaRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new TasksApi(config);

  const body = {
    // string
    projectRef: projectRef_example,
    // string
    taskRef: taskRef_example,
  } satisfies ListTaskAcceptanceCriteriaRequest;

  try {
    const data = await api.listTaskAcceptanceCriteria(body);
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
| **taskRef** | `string` |  | [Defaults to `undefined`] |

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


## listTaskDependencies

> TaskDependencyListResponse listTaskDependencies(projectRef, taskRef)

List dependencies for a task

Returns tasks that this task depends on (blockers)

### Example

```ts
import {
  Configuration,
  TasksApi,
} from '';
import type { ListTaskDependenciesRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new TasksApi(config);

  const body = {
    // string
    projectRef: projectRef_example,
    // string
    taskRef: taskRef_example,
  } satisfies ListTaskDependenciesRequest;

  try {
    const data = await api.listTaskDependencies(body);
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
| **taskRef** | `string` |  | [Defaults to `undefined`] |

### Return type

[**TaskDependencyListResponse**](TaskDependencyListResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | List of task dependencies |  -  |
| **401** | Authentication required |  -  |
| **404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listTasks

> TaskListResponse listTasks(projectRef, cursor, limit, sort, order, status, priority, epicRef, assignedToRef, search)

List tasks in a project

### Example

```ts
import {
  Configuration,
  TasksApi,
} from '';
import type { ListTasksRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new TasksApi(config);

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
    // TaskStatus (optional)
    status: ...,
    // TaskPriority (optional)
    priority: ...,
    // string | Filter by epic (public ID or display key) (optional)
    epicRef: epicRef_example,
    // string | Filter by assignee (user public ID) (optional)
    assignedToRef: assignedToRef_example,
    // string | Search in title and description (optional)
    search: search_example,
  } satisfies ListTasksRequest;

  try {
    const data = await api.listTasks(body);
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
| **status** | `TaskStatus` |  | [Optional] [Defaults to `undefined`] [Enum: BACKLOG, READY, IN_PROGRESS, IN_REVIEW, BLOCKED, COMPLETED, CANCELLED] |
| **priority** | `TaskPriority` |  | [Optional] [Defaults to `undefined`] [Enum: LOW, MEDIUM, HIGH, CRITICAL] |
| **epicRef** | `string` | Filter by epic (public ID or display key) | [Optional] [Defaults to `undefined`] |
| **assignedToRef** | `string` | Filter by assignee (user public ID) | [Optional] [Defaults to `undefined`] |
| **search** | `string` | Search in title and description | [Optional] [Defaults to `undefined`] |

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
| **200** | List of tasks |  -  |
| **401** | Authentication required |  -  |
| **404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## removeTaskDependency

> removeTaskDependency(projectRef, taskRef, dependsOnTaskRef)

Remove a dependency from a task

### Example

```ts
import {
  Configuration,
  TasksApi,
} from '';
import type { RemoveTaskDependencyRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new TasksApi(config);

  const body = {
    // string
    projectRef: projectRef_example,
    // string
    taskRef: taskRef_example,
    // string | Task reference that this task depends on
    dependsOnTaskRef: dependsOnTaskRef_example,
  } satisfies RemoveTaskDependencyRequest;

  try {
    const data = await api.removeTaskDependency(body);
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
| **taskRef** | `string` |  | [Defaults to `undefined`] |
| **dependsOnTaskRef** | `string` | Task reference that this task depends on | [Defaults to `undefined`] |

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


## updateTask

> Task updateTask(projectRef, taskRef, updateTaskRequest)

Partially update a task

### Example

```ts
import {
  Configuration,
  TasksApi,
} from '';
import type { UpdateTaskOperationRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new TasksApi(config);

  const body = {
    // string
    projectRef: projectRef_example,
    // string | Task public ID (task_xxx) or display key (SPEC-42)
    taskRef: taskRef_example,
    // UpdateTaskRequest
    updateTaskRequest: ...,
  } satisfies UpdateTaskOperationRequest;

  try {
    const data = await api.updateTask(body);
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
| **taskRef** | `string` | Task public ID (task_xxx) or display key (SPEC-42) | [Defaults to `undefined`] |
| **updateTaskRequest** | [UpdateTaskRequest](UpdateTaskRequest.md) |  | |

### Return type

[**Task**](Task.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Task updated |  -  |
| **400** | Validation error |  -  |
| **401** | Authentication required |  -  |
| **404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## updateTaskAcceptanceCriteria

> AcceptanceCriteria updateTaskAcceptanceCriteria(projectRef, taskRef, criteriaId, updateAcceptanceCriteriaRequest)

Update acceptance criteria for a task

### Example

```ts
import {
  Configuration,
  TasksApi,
} from '';
import type { UpdateTaskAcceptanceCriteriaRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new TasksApi(config);

  const body = {
    // string
    projectRef: projectRef_example,
    // string
    taskRef: taskRef_example,
    // number | Acceptance criteria ID
    criteriaId: 789,
    // UpdateAcceptanceCriteriaRequest
    updateAcceptanceCriteriaRequest: ...,
  } satisfies UpdateTaskAcceptanceCriteriaRequest;

  try {
    const data = await api.updateTaskAcceptanceCriteria(body);
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
| **taskRef** | `string` |  | [Defaults to `undefined`] |
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

