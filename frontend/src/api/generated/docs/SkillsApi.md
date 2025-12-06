# SkillsApi

All URIs are relative to *http://localhost:8090/api*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**createSkill**](SkillsApi.md#createskilloperation) | **POST** /api/projects/{projectRef}/skills | Add a skill to a project |
| [**deleteSkill**](SkillsApi.md#deleteskill) | **DELETE** /api/projects/{projectRef}/skills/{skillRef} | Remove a skill from a project |
| [**getSkill**](SkillsApi.md#getskill) | **GET** /api/projects/{projectRef}/skills/{skillRef} | Get a skill |
| [**listSkills**](SkillsApi.md#listskills) | **GET** /api/projects/{projectRef}/skills | List skills in a project |
| [**updateSkill**](SkillsApi.md#updateskilloperation) | **PUT** /api/projects/{projectRef}/skills/{skillRef} | Update a skill |



## createSkill

> Skill createSkill(projectRef, createSkillRequest)

Add a skill to a project

### Example

```ts
import {
  Configuration,
  SkillsApi,
} from '';
import type { CreateSkillOperationRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new SkillsApi(config);

  const body = {
    // string
    projectRef: projectRef_example,
    // CreateSkillRequest
    createSkillRequest: ...,
  } satisfies CreateSkillOperationRequest;

  try {
    const data = await api.createSkill(body);
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
| **createSkillRequest** | [CreateSkillRequest](CreateSkillRequest.md) |  | |

### Return type

[**Skill**](Skill.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** | Skill created |  -  |
| **400** | Validation error |  -  |
| **401** | Authentication required |  -  |
| **404** | Resource not found |  -  |
| **409** | Resource already exists |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## deleteSkill

> deleteSkill(projectRef, skillRef)

Remove a skill from a project

### Example

```ts
import {
  Configuration,
  SkillsApi,
} from '';
import type { DeleteSkillRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new SkillsApi(config);

  const body = {
    // string
    projectRef: projectRef_example,
    // string | Skill public ID (skill_xxx)
    skillRef: skillRef_example,
  } satisfies DeleteSkillRequest;

  try {
    const data = await api.deleteSkill(body);
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
| **skillRef** | `string` | Skill public ID (skill_xxx) | [Defaults to `undefined`] |

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
| **204** | Skill deleted |  -  |
| **401** | Authentication required |  -  |
| **404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getSkill

> Skill getSkill(projectRef, skillRef)

Get a skill

### Example

```ts
import {
  Configuration,
  SkillsApi,
} from '';
import type { GetSkillRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new SkillsApi(config);

  const body = {
    // string
    projectRef: projectRef_example,
    // string | Skill public ID (skill_xxx)
    skillRef: skillRef_example,
  } satisfies GetSkillRequest;

  try {
    const data = await api.getSkill(body);
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
| **skillRef** | `string` | Skill public ID (skill_xxx) | [Defaults to `undefined`] |

### Return type

[**Skill**](Skill.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Skill details |  -  |
| **401** | Authentication required |  -  |
| **404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listSkills

> SkillListResponse listSkills(projectRef)

List skills in a project

### Example

```ts
import {
  Configuration,
  SkillsApi,
} from '';
import type { ListSkillsRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new SkillsApi(config);

  const body = {
    // string
    projectRef: projectRef_example,
  } satisfies ListSkillsRequest;

  try {
    const data = await api.listSkills(body);
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

[**SkillListResponse**](SkillListResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | List of skills |  -  |
| **401** | Authentication required |  -  |
| **404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## updateSkill

> Skill updateSkill(projectRef, skillRef, updateSkillRequest)

Update a skill

### Example

```ts
import {
  Configuration,
  SkillsApi,
} from '';
import type { UpdateSkillOperationRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new SkillsApi(config);

  const body = {
    // string
    projectRef: projectRef_example,
    // string | Skill public ID (skill_xxx)
    skillRef: skillRef_example,
    // UpdateSkillRequest
    updateSkillRequest: ...,
  } satisfies UpdateSkillOperationRequest;

  try {
    const data = await api.updateSkill(body);
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
| **skillRef** | `string` | Skill public ID (skill_xxx) | [Defaults to `undefined`] |
| **updateSkillRequest** | [UpdateSkillRequest](UpdateSkillRequest.md) |  | |

### Return type

[**Skill**](Skill.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Skill updated |  -  |
| **400** | Validation error |  -  |
| **401** | Authentication required |  -  |
| **404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

