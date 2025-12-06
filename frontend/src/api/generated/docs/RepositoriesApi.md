# RepositoriesApi

All URIs are relative to *http://localhost:8090/api*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**createRepository**](RepositoriesApi.md#createrepositoryoperation) | **POST** /api/projects/{projectRef}/repositories | Add a repository to a project |
| [**deleteRepository**](RepositoriesApi.md#deleterepository) | **DELETE** /api/projects/{projectRef}/repositories/{repoRef} | Remove a repository from a project |
| [**getRepository**](RepositoriesApi.md#getrepository) | **GET** /api/projects/{projectRef}/repositories/{repoRef} | Get a repository |
| [**listRepositories**](RepositoriesApi.md#listrepositories) | **GET** /api/projects/{projectRef}/repositories | List repositories in a project |
| [**updateRepository**](RepositoriesApi.md#updaterepositoryoperation) | **PUT** /api/projects/{projectRef}/repositories/{repoRef} | Update a repository |



## createRepository

> Repository createRepository(projectRef, createRepositoryRequest)

Add a repository to a project

### Example

```ts
import {
  Configuration,
  RepositoriesApi,
} from '';
import type { CreateRepositoryOperationRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new RepositoriesApi(config);

  const body = {
    // string
    projectRef: projectRef_example,
    // CreateRepositoryRequest
    createRepositoryRequest: ...,
  } satisfies CreateRepositoryOperationRequest;

  try {
    const data = await api.createRepository(body);
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
| **createRepositoryRequest** | [CreateRepositoryRequest](CreateRepositoryRequest.md) |  | |

### Return type

[**Repository**](Repository.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** | Repository created |  -  |
| **400** | Validation error |  -  |
| **401** | Authentication required |  -  |
| **404** | Resource not found |  -  |
| **409** | Resource already exists |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## deleteRepository

> deleteRepository(projectRef, repoRef)

Remove a repository from a project

### Example

```ts
import {
  Configuration,
  RepositoriesApi,
} from '';
import type { DeleteRepositoryRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new RepositoriesApi(config);

  const body = {
    // string
    projectRef: projectRef_example,
    // string | Repository public ID (repo_xxx)
    repoRef: repoRef_example,
  } satisfies DeleteRepositoryRequest;

  try {
    const data = await api.deleteRepository(body);
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
| **repoRef** | `string` | Repository public ID (repo_xxx) | [Defaults to `undefined`] |

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
| **204** | Repository deleted |  -  |
| **401** | Authentication required |  -  |
| **404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getRepository

> Repository getRepository(projectRef, repoRef)

Get a repository

### Example

```ts
import {
  Configuration,
  RepositoriesApi,
} from '';
import type { GetRepositoryRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new RepositoriesApi(config);

  const body = {
    // string
    projectRef: projectRef_example,
    // string | Repository public ID (repo_xxx)
    repoRef: repoRef_example,
  } satisfies GetRepositoryRequest;

  try {
    const data = await api.getRepository(body);
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
| **repoRef** | `string` | Repository public ID (repo_xxx) | [Defaults to `undefined`] |

### Return type

[**Repository**](Repository.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Repository details |  -  |
| **401** | Authentication required |  -  |
| **404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listRepositories

> RepositoryListResponse listRepositories(projectRef)

List repositories in a project

### Example

```ts
import {
  Configuration,
  RepositoriesApi,
} from '';
import type { ListRepositoriesRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new RepositoriesApi(config);

  const body = {
    // string
    projectRef: projectRef_example,
  } satisfies ListRepositoriesRequest;

  try {
    const data = await api.listRepositories(body);
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

[**RepositoryListResponse**](RepositoryListResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | List of repositories |  -  |
| **401** | Authentication required |  -  |
| **404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## updateRepository

> Repository updateRepository(projectRef, repoRef, updateRepositoryRequest)

Update a repository

### Example

```ts
import {
  Configuration,
  RepositoriesApi,
} from '';
import type { UpdateRepositoryOperationRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new RepositoriesApi(config);

  const body = {
    // string
    projectRef: projectRef_example,
    // string | Repository public ID (repo_xxx)
    repoRef: repoRef_example,
    // UpdateRepositoryRequest
    updateRepositoryRequest: ...,
  } satisfies UpdateRepositoryOperationRequest;

  try {
    const data = await api.updateRepository(body);
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
| **repoRef** | `string` | Repository public ID (repo_xxx) | [Defaults to `undefined`] |
| **updateRepositoryRequest** | [UpdateRepositoryRequest](UpdateRepositoryRequest.md) |  | |

### Return type

[**Repository**](Repository.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Repository updated |  -  |
| **400** | Validation error |  -  |
| **401** | Authentication required |  -  |
| **404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

