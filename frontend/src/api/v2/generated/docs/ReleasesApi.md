# ReleasesApi

All URIs are relative to *http://localhost:8090/api*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**createRelease**](ReleasesApi.md#createreleaseoperation) | **POST** /projects/{projectRef}/releases | Create a new release |
| [**deleteRelease**](ReleasesApi.md#deleterelease) | **DELETE** /projects/{projectRef}/releases/{releaseRef} | Delete a release |
| [**getRelease**](ReleasesApi.md#getrelease) | **GET** /projects/{projectRef}/releases/{releaseRef} | Get a release |
| [**listReleases**](ReleasesApi.md#listreleases) | **GET** /projects/{projectRef}/releases | List releases in a project |
| [**updateRelease**](ReleasesApi.md#updatereleaseoperation) | **PUT** /projects/{projectRef}/releases/{releaseRef} | Update a release |



## createRelease

> Release createRelease(projectRef, createReleaseRequest)

Create a new release

### Example

```ts
import {
  Configuration,
  ReleasesApi,
} from '';
import type { CreateReleaseOperationRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ReleasesApi(config);

  const body = {
    // string
    projectRef: projectRef_example,
    // CreateReleaseRequest
    createReleaseRequest: ...,
  } satisfies CreateReleaseOperationRequest;

  try {
    const data = await api.createRelease(body);
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
| **createReleaseRequest** | [CreateReleaseRequest](CreateReleaseRequest.md) |  | |

### Return type

[**Release**](Release.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** | Release created |  -  |
| **400** | Validation error |  -  |
| **401** | Authentication required |  -  |
| **404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## deleteRelease

> deleteRelease(projectRef, releaseRef)

Delete a release

### Example

```ts
import {
  Configuration,
  ReleasesApi,
} from '';
import type { DeleteReleaseRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ReleasesApi(config);

  const body = {
    // string
    projectRef: projectRef_example,
    // string | Release public ID (rel_xxx) or display key (SPEC-R1)
    releaseRef: releaseRef_example,
  } satisfies DeleteReleaseRequest;

  try {
    const data = await api.deleteRelease(body);
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
| **releaseRef** | `string` | Release public ID (rel_xxx) or display key (SPEC-R1) | [Defaults to `undefined`] |

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
| **204** | Release deleted |  -  |
| **401** | Authentication required |  -  |
| **404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getRelease

> Release getRelease(projectRef, releaseRef)

Get a release

### Example

```ts
import {
  Configuration,
  ReleasesApi,
} from '';
import type { GetReleaseRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ReleasesApi(config);

  const body = {
    // string
    projectRef: projectRef_example,
    // string | Release public ID (rel_xxx) or display key (SPEC-R1)
    releaseRef: releaseRef_example,
  } satisfies GetReleaseRequest;

  try {
    const data = await api.getRelease(body);
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
| **releaseRef** | `string` | Release public ID (rel_xxx) or display key (SPEC-R1) | [Defaults to `undefined`] |

### Return type

[**Release**](Release.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Release details |  -  |
| **401** | Authentication required |  -  |
| **404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listReleases

> ReleaseListResponse listReleases(projectRef, cursor, limit, sort, order, status)

List releases in a project

### Example

```ts
import {
  Configuration,
  ReleasesApi,
} from '';
import type { ListReleasesRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ReleasesApi(config);

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
    // ReleaseStatus (optional)
    status: ...,
  } satisfies ListReleasesRequest;

  try {
    const data = await api.listReleases(body);
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
| **status** | `ReleaseStatus` |  | [Optional] [Defaults to `undefined`] [Enum: PLANNED, IN_PROGRESS, RELEASED, CANCELLED] |

### Return type

[**ReleaseListResponse**](ReleaseListResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | List of releases |  -  |
| **401** | Authentication required |  -  |
| **404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## updateRelease

> Release updateRelease(projectRef, releaseRef, updateReleaseRequest)

Update a release

### Example

```ts
import {
  Configuration,
  ReleasesApi,
} from '';
import type { UpdateReleaseOperationRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ReleasesApi(config);

  const body = {
    // string
    projectRef: projectRef_example,
    // string | Release public ID (rel_xxx) or display key (SPEC-R1)
    releaseRef: releaseRef_example,
    // UpdateReleaseRequest
    updateReleaseRequest: ...,
  } satisfies UpdateReleaseOperationRequest;

  try {
    const data = await api.updateRelease(body);
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
| **releaseRef** | `string` | Release public ID (rel_xxx) or display key (SPEC-R1) | [Defaults to `undefined`] |
| **updateReleaseRequest** | [UpdateReleaseRequest](UpdateReleaseRequest.md) |  | |

### Return type

[**Release**](Release.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Release updated |  -  |
| **400** | Validation error |  -  |
| **401** | Authentication required |  -  |
| **404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

