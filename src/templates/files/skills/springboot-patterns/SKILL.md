---
name: springboot-patterns
description: Spring Boot and Java best practices for SpecFlux backend. Use when developing REST APIs, services, repositories, or any Java code. Applies DDD architecture, transaction management, and code style conventions.
---

# Spring Boot Best Practices for SpecFlux Backend

## Project Structure (Domain-Driven Design)

```
src/main/java/com/specflux/
├── {domain}/                    # One package per domain (project, epic, task, user)
│   ├── domain/                  # Domain layer - entities and repository interfaces
│   │   ├── {Entity}.java        # JPA entity
│   │   └── {Entity}Repository.java  # Spring Data JPA repository interface
│   ├── application/             # Application layer - business logic
│   │   └── {Entity}ApplicationService.java
│   └── interfaces/              # Interface layer - REST controllers
│       └── rest/
│           ├── {Entity}Controller.java
│           └── {Entity}Mapper.java
├── shared/                      # Cross-cutting concerns
│   ├── application/
│   ├── domain/
│   └── interfaces/rest/
└── api/generated/               # OpenAPI generated code (do not edit)
```

## Transaction Management

### Minimize Transaction Scope
Only wrap the actual database operation in a transaction, not the entire method:

```java
// Good - minimal transaction scope
public EpicDto updateEpic(String projectRef, String epicRef, UpdateEpicRequestDto request) {
    Project project = refResolver.resolveProject(projectRef);
    Epic epic = refResolver.resolveEpic(project, epicRef);

    if (request.getTitle() != null) {
        epic.setTitle(request.getTitle());
    }
    // ... other field updates

    Epic saved = transactionTemplate.execute(status -> epicRepository.save(epic));
    return epicMapper.toDto(saved);
}

// Bad - entire method in transaction
public EpicDto updateEpic(String projectRef, String epicRef, UpdateEpicRequestDto request) {
    return transactionTemplate.execute(status -> {
        Project project = refResolver.resolveProject(projectRef);  // Read doesn't need transaction
        Epic epic = refResolver.resolveEpic(project, epicRef);
        // ... field updates don't need transaction
        Epic saved = epicRepository.save(epic);  // Only this needs transaction
        return epicMapper.toDto(saved);
    });
}
```

### Use TransactionTemplate, Not @Transactional
Prefer `TransactionTemplate` over `@Transactional` annotation for explicit control:

```java
@Service
@RequiredArgsConstructor
public class TaskApplicationService {
    private final TransactionTemplate transactionTemplate;
    private final TaskRepository taskRepository;

    public void deleteTask(String projectRef, String taskRef) {
        Project project = refResolver.resolveProject(projectRef);
        Task task = refResolver.resolveTask(project, taskRef);
        transactionTemplate.executeWithoutResult(status -> taskRepository.delete(task));
    }
}
```

### When Full Transaction Is Needed
Keep full transaction scope when operations must be atomic:

```java
// Create needs full transaction for sequence number atomicity
public TaskDto createTask(String projectRef, CreateTaskRequestDto request) {
    return transactionTemplate.execute(status -> {
        Project project = refResolver.resolveProject(projectRef);
        int sequenceNumber = getNextSequenceNumber(project);  // Read
        Task task = new Task(..., sequenceNumber, ...);       // Must be atomic
        return taskMapper.toDto(taskRepository.save(task));   // Write
    });
}
```

## Lombok Usage

### Use @RequiredArgsConstructor for Dependency Injection
Never write constructors manually for Spring beans:

```java
// Good
@Service
@RequiredArgsConstructor
public class TaskApplicationService {
    private final TaskRepository taskRepository;
    private final RefResolver refResolver;
    private final TaskMapper taskMapper;
}

// Bad
@Service
public class TaskApplicationService {
    private final TaskRepository taskRepository;

    public TaskApplicationService(TaskRepository taskRepository) {
        this.taskRepository = taskRepository;
    }
}
```

### Standard Lombok Annotations for Entities

```java
@Entity
@Table(name = "tasks")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)  // JPA requires no-arg constructor
public class Task {
    // fields...

    // Required-args constructor for creating new instances
    public Task(String publicId, Project project, int sequenceNumber, ...) {
        // initialization
    }
}
```

## OpenAPI Generated Code

### DTO Suffix Convention
All generated model classes have `Dto` suffix to distinguish from domain entities:

- Domain: `Epic`, `Project`, `Task`
- DTOs: `EpicDto`, `ProjectDto`, `TaskDto`, `CreateTaskRequestDto`, `TaskStatusDto`

### Never Import with Wildcards
Always use explicit imports:

```java
// Good
import com.specflux.api.generated.model.TaskDto;
import com.specflux.api.generated.model.CreateTaskRequestDto;

// Bad
import com.specflux.api.generated.model.*;
```

### Controller Implementation
Controllers implement generated API interfaces:

```java
@RestController
@RequiredArgsConstructor
public class TaskController implements TasksApi {
    private final TaskApplicationService taskApplicationService;

    @Override
    public ResponseEntity<TaskDto> createTask(String projectRef, CreateTaskRequestDto request) {
        TaskDto created = taskApplicationService.createTask(projectRef, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }
}
```

## Mapper Pattern

Mappers convert between domain entities and DTOs:

```java
@Component
public class TaskMapper {

    public TaskDto toDto(Task domain) {
        TaskDto dto = new TaskDto();
        dto.setPublicId(domain.getPublicId());
        dto.setTitle(domain.getTitle());
        dto.setStatus(toApiStatus(domain.getStatus()));
        // ... map all fields
        return dto;
    }

    public TaskStatus toDomainStatus(TaskStatusDto apiStatus) {
        return switch (apiStatus) {
            case BACKLOG -> TaskStatus.BACKLOG;
            case IN_PROGRESS -> TaskStatus.IN_PROGRESS;
            case DONE -> TaskStatus.DONE;
        };
    }

    private TaskStatusDto toApiStatus(TaskStatus domainStatus) {
        return switch (domainStatus) {
            case BACKLOG -> TaskStatusDto.BACKLOG;
            case IN_PROGRESS -> TaskStatusDto.IN_PROGRESS;
            case DONE -> TaskStatusDto.DONE;
        };
    }
}
```

## Reference Resolution Pattern

Use `RefResolver` for looking up entities by publicId or displayKey:

```java
@Component
@RequiredArgsConstructor
public class RefResolver {
    private final ProjectRepository projectRepository;

    public Project resolveProject(String ref) {
        return projectRepository.findByPublicId(ref)
            .or(() -> projectRepository.findByProjectKey(ref))
            .orElseThrow(() -> new EntityNotFoundException("Project", ref));
    }

    // For optional references (can be null or empty string to clear)
    public Epic resolveEpicOptional(Project project, String ref) {
        if (ref == null || ref.isBlank()) {
            return null;
        }
        return resolveEpic(project, ref);
    }
}
```

## Exception Handling

### Custom Exceptions

```java
public class EntityNotFoundException extends RuntimeException {
    public EntityNotFoundException(String entityType, String reference) {
        super(entityType + " not found: " + reference);
    }
}

public class ResourceConflictException extends RuntimeException {
    public ResourceConflictException(String message) {
        super(message);
    }
}
```

### Global Exception Handler

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ErrorResponseDto> handleNotFound(EntityNotFoundException ex) {
        ErrorResponseDto error = new ErrorResponseDto();
        error.setCode("NOT_FOUND");
        error.setMessage(ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponseDto> handleValidation(MethodArgumentNotValidException ex) {
        ErrorResponseDto error = new ErrorResponseDto();
        error.setCode("VALIDATION_ERROR");
        error.setMessage("Validation failed");
        error.setDetails(ex.getBindingResult().getFieldErrors().stream()
            .map(fe -> {
                FieldErrorDto fieldError = new FieldErrorDto();
                fieldError.setField(fe.getField());
                fieldError.setMessage(fe.getDefaultMessage());
                return fieldError;
            })
            .toList());
        return ResponseEntity.badRequest().body(error);
    }
}
```

## Testing Patterns

### Integration Tests with Schema Isolation

```java
@AutoConfigureMockMvc
@Transactional
class TaskControllerTest extends AbstractIntegrationTest {

    private static final String SCHEMA_NAME = "task_controller_test";

    @DynamicPropertySource
    static void configureSchema(DynamicPropertyRegistry registry) {
        AbstractIntegrationTest.configureSchema(registry, SCHEMA_NAME);
    }

    @Autowired private MockMvc mockMvc;
    @MockitoBean private CurrentUserService currentUserService;

    @BeforeEach
    void setUp() {
        testUser = userRepository.save(new User(...));
        when(currentUserService.getCurrentUser()).thenReturn(testUser);
    }

    @Test
    @WithMockUser(username = "user")
    void createTask_shouldReturnCreatedTask() throws Exception {
        CreateTaskRequestDto request = new CreateTaskRequestDto();
        request.setTitle("Test Task");

        mockMvc.perform(post("/projects/{projectRef}/tasks", project.getPublicId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.title").value("Test Task"));
    }
}
```

## Code Style

### Checkstyle Rules
- No star imports (`import x.y.*`)
- No unused imports
- No redundant imports

### Spotless Formatting
Run `mvn spotless:apply` before committing.

### Switch Expressions
Use modern switch expressions:

```java
// Good
private TaskStatusDto toApiStatus(TaskStatus status) {
    return switch (status) {
        case BACKLOG -> TaskStatusDto.BACKLOG;
        case IN_PROGRESS -> TaskStatusDto.IN_PROGRESS;
        case DONE -> TaskStatusDto.DONE;
    };
}

// Bad
private TaskStatusDto toApiStatus(TaskStatus status) {
    switch (status) {
        case BACKLOG: return TaskStatusDto.BACKLOG;
        case IN_PROGRESS: return TaskStatusDto.IN_PROGRESS;
        case DONE: return TaskStatusDto.DONE;
        default: throw new IllegalArgumentException();
    }
}
```

## Build Commands

```bash
# Generate OpenAPI code
mvn generate-sources

# Format code
mvn spotless:apply

# Check style
mvn checkstyle:check

# Run tests
mvn test

# Full build
mvn clean verify
```
