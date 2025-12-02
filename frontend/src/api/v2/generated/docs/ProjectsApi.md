# ProjectsApi

All URIs are relative to *http://localhost:8090/api*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**createProject**](ProjectsApi.md#createprojectoperation) | **POST** /projects | Create a new project |
| [**deleteProject**](ProjectsApi.md#deleteproject) | **DELETE** /projects/{ref} | Delete a project |
| [**getProject**](ProjectsApi.md#getproject) | **GET** /projects/{ref} | Get a project |
| [**listProjects**](ProjectsApi.md#listprojects) | **GET** /projects | List user\&#39;s projects |
| [**updateProject**](ProjectsApi.md#updateprojectoperation) | **PUT** /projects/{ref} | Update a project |



## createProject

> Project createProject(createProjectRequest)

Create a new project

### Example

```ts
import {
  Configuration,
  ProjectsApi,
} from '';
import type { CreateProjectOperationRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ProjectsApi(config);

  const body = {
    // CreateProjectRequest
    createProjectRequest: ...,
  } satisfies CreateProjectOperationRequest;

  try {
    const data = await api.createProject(body);
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
| **createProjectRequest** | [CreateProjectRequest](CreateProjectRequest.md) |  | |

### Return type

[**Project**](Project.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** | Project created |  -  |
| **400** | Validation error |  -  |
| **401** | Authentication required |  -  |
| **409** | Resource already exists |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## deleteProject

> deleteProject(ref)

Delete a project

### Example

```ts
import {
  Configuration,
  ProjectsApi,
} from '';
import type { DeleteProjectRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ProjectsApi(config);

  const body = {
    // string | Project public ID (proj_xxx) or project key (SPEC)
    ref: ref_example,
  } satisfies DeleteProjectRequest;

  try {
    const data = await api.deleteProject(body);
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
| **ref** | `string` | Project public ID (proj_xxx) or project key (SPEC) | [Defaults to `undefined`] |

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
| **204** | Project deleted |  -  |
| **401** | Authentication required |  -  |
| **404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getProject

> Project getProject(ref)

Get a project

### Example

```ts
import {
  Configuration,
  ProjectsApi,
} from '';
import type { GetProjectRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ProjectsApi(config);

  const body = {
    // string | Project public ID (proj_xxx) or project key (SPEC)
    ref: ref_example,
  } satisfies GetProjectRequest;

  try {
    const data = await api.getProject(body);
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
| **ref** | `string` | Project public ID (proj_xxx) or project key (SPEC) | [Defaults to `undefined`] |

### Return type

[**Project**](Project.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Project details |  -  |
| **401** | Authentication required |  -  |
| **404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listProjects

> ProjectListResponse listProjects(cursor, limit, sort, order)

List user\&#39;s projects

### Example

```ts
import {
  Configuration,
  ProjectsApi,
} from '';
import type { ListProjectsRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ProjectsApi(config);

  const body = {
    // string | Base64-encoded pagination cursor (optional)
    cursor: cursor_example,
    // number | Items per page (default 20, max 100) (optional)
    limit: 56,
    // 'created_at' | 'updated_at' | 'title' (optional)
    sort: sort_example,
    // 'asc' | 'desc' (optional)
    order: order_example,
  } satisfies ListProjectsRequest;

  try {
    const data = await api.listProjects(body);
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
| **cursor** | `string` | Base64-encoded pagination cursor | [Optional] [Defaults to `undefined`] |
| **limit** | `number` | Items per page (default 20, max 100) | [Optional] [Defaults to `20`] |
| **sort** | `created_at`, `updated_at`, `title` |  | [Optional] [Defaults to `&#39;created_at&#39;`] [Enum: created_at, updated_at, title] |
| **order** | `asc`, `desc` |  | [Optional] [Defaults to `&#39;desc&#39;`] [Enum: asc, desc] |

### Return type

[**ProjectListResponse**](ProjectListResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | List of projects |  -  |
| **401** | Authentication required |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## updateProject

> Project updateProject(ref, updateProjectRequest)

Update a project

### Example

```ts
import {
  Configuration,
  ProjectsApi,
} from '';
import type { UpdateProjectOperationRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ProjectsApi(config);

  const body = {
    // string | Project public ID (proj_xxx) or project key (SPEC)
    ref: ref_example,
    // UpdateProjectRequest
    updateProjectRequest: ...,
  } satisfies UpdateProjectOperationRequest;

  try {
    const data = await api.updateProject(body);
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
| **ref** | `string` | Project public ID (proj_xxx) or project key (SPEC) | [Defaults to `undefined`] |
| **updateProjectRequest** | [UpdateProjectRequest](UpdateProjectRequest.md) |  | |

### Return type

[**Project**](Project.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Project updated |  -  |
| **400** | Validation error |  -  |
| **401** | Authentication required |  -  |
| **404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

