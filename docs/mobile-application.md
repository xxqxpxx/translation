# Mobile Application Documentation

## Overview

The LinguaLink mobile applications provide comprehensive functionality for clients and interpreters/translators using Kotlin Multiplatform (KMP) and Compose Multiplatform. This architecture enables maximum code sharing while maintaining native performance and platform-specific capabilities.

## Architecture

### Technology Stack
- **Core**: Kotlin Multiplatform (KMP)
- **UI Framework**: Compose Multiplatform
- **Networking**: Ktor Client with real-time WebSocket support
- **Local Database**: SQLDelight for offline data persistence
- **Dependency Injection**: Koin
- **Navigation**: Compose Navigation
- **Image Loading**: Kamel (multiplatform)
- **Date/Time**: Kotlinx DateTime
- **JSON Serialization**: Kotlinx Serialization
- **Concurrency**: Kotlinx Coroutines

### Project Structure
```
mobile/
├── shared/
│   ├── src/
│   │   ├── commonMain/kotlin/
│   │   │   ├── data/
│   │   │   │   ├── api/              # Ktor HTTP clients
│   │   │   │   ├── database/         # SQLDelight database
│   │   │   │   ├── models/           # Data models
│   │   │   │   └── repository/       # Data repositories
│   │   │   ├── domain/
│   │   │   │   ├── models/           # Domain models
│   │   │   │   ├── usecases/         # Business logic
│   │   │   │   └── repository/       # Repository interfaces
│   │   │   ├── presentation/
│   │   │   │   ├── viewmodels/       # Shared ViewModels
│   │   │   │   └── state/            # UI state management
│   │   │   └── utils/                # Shared utilities
│   │   ├── androidMain/kotlin/       # Android-specific implementations
│   │   ├── iosMain/kotlin/           # iOS-specific implementations
│   │   └── commonTest/kotlin/        # Shared tests
│   └── build.gradle.kts
├── composeApp/
│   ├── src/
│   │   ├── commonMain/kotlin/
│   │   │   ├── ui/
│   │   │   │   ├── client/           # Client app UI
│   │   │   │   ├── interpreter/      # Interpreter app UI
│   │   │   │   ├── shared/           # Shared UI components
│   │   │   │   └── theme/            # Material Design theme
│   │   │   ├── navigation/           # App navigation
│   │   │   └── di/                   # Dependency injection
│   │   ├── androidMain/kotlin/       # Android UI adaptations
│   │   ├── iosMain/kotlin/           # iOS UI adaptations
│   │   └── commonTest/kotlin/        # UI tests
│   └── build.gradle.kts
├── androidApp/                       # Android application module
├── iosApp/                          # iOS application (Xcode project)
└── gradle/                          # Gradle configuration
```

## User Applications

### Client Mobile App

#### Core Features
- **Service Request Management**
  - Create translation requests with document upload
  - Book in-person interpretation with location selection
  - Schedule phone interpretation sessions
  - Request instant virtual interpretation
  - Real-time request status tracking

- **Document Management**
  - Native file picker integration
  - Multiple format support (PDF, Word, JPG)
  - Upload progress tracking
  - Secure document access and download

- **Communication**
  - Real-time messaging with interpreters
  - Push notifications for status updates
  - Video/audio calling for instant virtual sessions
  - Chat history and file sharing

#### Client App Screens
```kotlin
// Client navigation structure
sealed class ClientScreen(val route: String) {
    object Dashboard : ClientScreen("dashboard")
    object NewRequest : ClientScreen("new_request")
    object ActiveRequests : ClientScreen("active_requests")
    object RequestHistory : ClientScreen("request_history")
    object InterpreterProfiles : ClientScreen("interpreters")
    object Messaging : ClientScreen("messaging")
    object Profile : ClientScreen("profile")
    object InstantVirtual : ClientScreen("instant_virtual")
}
```

### Interpreter/Translator Mobile App

#### Core Features
- **Job Management**
  - Browse available jobs with filtering
  - Quick accept/decline actions
  - Detailed job information views
  - Earnings calculator and tracking

- **Session Management**
  - GPS-enabled check-in/check-out
  - Session timer and notes
  - Document translation workflow
  - Real-time session tracking

- **Availability Management**
  - Calendar integration for schedule setting
  - Real-time availability toggle
  - Service mode preferences
  - Vacation and unavailable period marking

- **Performance Tracking**
  - Job completion history
  - Client ratings and feedback
  - Monthly earnings reports
  - Performance analytics

#### Interpreter App Screens
```kotlin
// Interpreter navigation structure
sealed class InterpreterScreen(val route: String) {
    object Dashboard : InterpreterScreen("dashboard")
    object JobBoard : InterpreterScreen("job_board")
    object ActiveJobs : InterpreterScreen("active_jobs")
    object Schedule : InterpreterScreen("schedule")
    object Earnings : InterpreterScreen("earnings")
    object Profile : InterpreterScreen("profile")
    object CheckIn : InterpreterScreen("check_in")
}
```

## Shared Business Logic

### Data Layer Architecture

#### API Client (Ktor)
```kotlin
// Shared HTTP client configuration
class ApiClient {
    private val client = HttpClient {
        install(ContentNegotiation) {
            json(Json {
                prettyPrint = true
                isLenient = true
                ignoreUnknownKeys = true
            })
        }
        install(Auth) {
            bearer {
                loadTokens {
                    BearerTokens(
                        accessToken = TokenManager.getAccessToken(),
                        refreshToken = TokenManager.getRefreshToken()
                    )
                }
                refreshTokens {
                    TokenManager.refreshToken()
                }
            }
        }
        install(WebSockets)
        install(Logging) {
            logger = Logger.DEFAULT
            level = LogLevel.INFO
        }
    }

    // Service request endpoints
    suspend fun getAvailableRequests(): Result<List<ServiceRequest>> {
        return try {
            val response = client.get("$BASE_URL/api/requests/available")
            Result.success(response.body<List<ServiceRequest>>())
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun createRequest(request: CreateRequestDto): Result<ServiceRequest> {
        return try {
            val response = client.post("$BASE_URL/api/requests") {
                contentType(ContentType.Application.Json)
                setBody(request)
            }
            Result.success(response.body<ServiceRequest>())
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
```

#### Real-time WebSocket Integration
```kotlin
// Shared WebSocket manager for real-time features
class RealTimeManager {
    private val client = HttpClient { install(WebSockets) }
    private var session: DefaultClientWebSocketSession? = null

    suspend fun connect(): Flow<RealTimeEvent> = flow {
        client.webSocket(
            method = HttpMethod.Get,
            host = WEBSOCKET_HOST,
            port = WEBSOCKET_PORT,
            path = "/api/realtime"
        ) {
            session = this
            
            // Send authentication
            send(Frame.Text(Json.encodeToString(AuthMessage(token = getAuthToken()))))
            
            // Listen for incoming messages
            for (frame in incoming) {
                if (frame is Frame.Text) {
                    val event = Json.decodeFromString<RealTimeEvent>(frame.readText())
                    emit(event)
                }
            }
        }
    }

    suspend fun sendMessage(message: RealTimeMessage) {
        session?.send(Frame.Text(Json.encodeToString(message)))
    }
}
```

#### Local Database (SQLDelight)
```sql
-- Database schema for offline storage
CREATE TABLE ServiceRequest (
    id TEXT PRIMARY KEY NOT NULL,
    request_number TEXT NOT NULL,
    service_type TEXT NOT NULL,
    language_from TEXT NOT NULL,
    language_to TEXT NOT NULL,
    status TEXT NOT NULL,
    client_id TEXT NOT NULL,
    interpreter_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    duration INTEGER,
    location TEXT,
    rate REAL,
    notes TEXT
);

CREATE TABLE Session (
    id TEXT PRIMARY KEY NOT NULL,
    request_id TEXT NOT NULL,
    check_in_time INTEGER,
    check_out_time INTEGER,
    gps_location TEXT,
    session_notes TEXT,
    FOREIGN KEY (request_id) REFERENCES ServiceRequest(id)
);

-- Query definitions
selectAllRequests:
SELECT * FROM ServiceRequest ORDER BY created_at DESC;

selectRequestsByStatus:
SELECT * FROM ServiceRequest WHERE status = ? ORDER BY created_at DESC;

insertRequest:
INSERT INTO ServiceRequest VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
```

### Domain Layer

#### Use Cases
```kotlin
// Shared business logic use cases
class AcceptRequestUseCase(
    private val repository: RequestRepository,
    private val notificationService: NotificationService
) {
    suspend operator fun invoke(requestId: String): Result<ServiceRequest> {
        return try {
            val request = repository.acceptRequest(requestId)
            notificationService.notifyRequestAccepted(request)
            Result.success(request)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

class CheckInUseCase(
    private val sessionRepository: SessionRepository,
    private val locationService: LocationService
) {
    suspend operator fun invoke(requestId: String): Result<Session> {
        return try {
            val location = locationService.getCurrentLocation()
            val session = sessionRepository.checkIn(requestId, location)
            Result.success(session)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
```

#### Repository Implementations
```kotlin
// Shared repository with local caching
class RequestRepositoryImpl(
    private val apiClient: ApiClient,
    private val database: Database
) : RequestRepository {
    
    override suspend fun getAvailableRequests(): Flow<List<ServiceRequest>> {
        return merge(
            // Local cache
            database.requestQueries.selectAllRequests()
                .asFlow()
                .mapToList(),
            // Remote updates
            flow {
                val remoteRequests = apiClient.getAvailableRequests().getOrNull()
                remoteRequests?.let { requests ->
                    database.transaction {
                        requests.forEach { request ->
                            database.requestQueries.insertRequest(request.toDbModel())
                        }
                    }
                }
            }
        )
    }

    override suspend fun acceptRequest(requestId: String): ServiceRequest {
        val request = apiClient.acceptRequest(requestId).getOrThrow()
        database.requestQueries.updateRequestStatus(requestId, "accepted")
        return request
    }
}
```

## Shared UI Components

### Design System
```kotlin
// Shared Material Design theme
@Composable
fun LinguaLinkTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        darkTheme -> darkColorScheme(
            primary = Color(0xFF2196F3),
            secondary = Color(0xFF03DAC6),
            background = Color(0xFF121212)
        )
        else -> lightColorScheme(
            primary = Color(0xFF1976D2),
            secondary = Color(0xFF00BCD4),
            background = Color(0xFFFFFFF)
        )
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography(),
        content = content
    )
}
```

### Reusable Components
```kotlin
// Shared service request card component
@Composable
fun ServiceRequestCard(
    request: ServiceRequest,
    userRole: UserRole,
    onAccept: (() -> Unit)? = null,
    onDecline: (() -> Unit)? = null,
    onViewDetails: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        onClick = onViewDetails
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            // Request header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = request.requestNumber,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                ServiceTypeBadge(type = request.serviceType)
            }

            // Language pair
            Text(
                text = "${request.languageFrom} → ${request.languageTo}",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            // Details based on service type
            when (request.serviceType) {
                ServiceType.TRANSLATION -> {
                    Text("Deadline: ${request.deadline?.format()}")
                }
                ServiceType.IN_PERSON -> {
                    Text("Location: ${request.location}")
                    Text("Date: ${request.scheduledAt?.format()}")
                }
                ServiceType.SCHEDULED_PHONE -> {
                    Text("Date: ${request.scheduledAt?.format()}")
                    Text("Duration: ${request.duration} minutes")
                }
                ServiceType.INSTANT_VIRTUAL -> {
                    Text("Instant request - Available now")
                }
            }

            // Action buttons for interpreters
            if (userRole == UserRole.INTERPRETER && onAccept != null && onDecline != null) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Button(
                        onClick = onAccept,
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("Accept")
                    }
                    OutlinedButton(
                        onClick = onDecline,
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("Decline")
                    }
                }
            }
        }
    }
}
```

## Platform-Specific Implementations

### Android-Specific Features

#### Push Notifications
```kotlin
// androidMain - Firebase Cloud Messaging
class AndroidNotificationService : NotificationService {
    override suspend fun initialize() {
        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            if (task.isSuccessful) {
                val token = task.result
                registerDeviceToken(token)
            }
        }
    }

    override suspend fun sendLocalNotification(
        title: String,
        body: String,
        data: Map<String, String>
    ) {
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(body)
            .setSmallIcon(R.drawable.ic_notification)
            .setAutoCancel(true)
            .build()

        NotificationManagerCompat.from(context).notify(notificationId++, notification)
    }
}
```

#### File Management
```kotlin
// androidMain - Document picker and file upload
class AndroidFileManager(private val context: Context) : FileManager {
    override suspend fun pickDocument(): DocumentFile? {
        return suspendCoroutine { continuation ->
            val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                type = "*/*"
                putExtra(Intent.EXTRA_MIME_TYPES, arrayOf(
                    "application/pdf",
                    "application/msword",
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    "image/jpeg",
                    "image/png"
                ))
                addCategory(Intent.CATEGORY_OPENABLE)
            }
            
            // Launch picker and handle result
            documentPickerLauncher.launch(intent)
            // Result handled in callback
        }
    }

    override suspend fun uploadFile(file: DocumentFile): Result<String> {
        return try {
            val inputStream = context.contentResolver.openInputStream(file.uri)
            val bytes = inputStream?.readBytes() ?: throw Exception("Cannot read file")
            
            val uploadResult = apiClient.uploadFile(
                fileName = file.name,
                content = bytes,
                mimeType = file.type
            )
            
            Result.success(uploadResult.fileUrl)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
```

#### Location Services
```kotlin
// androidMain - GPS location for check-in/out
class AndroidLocationService(private val context: Context) : LocationService {
    private val fusedLocationClient = LocationServices.getFusedLocationProviderClient(context)

    @SuppressLint("MissingPermission")
    override suspend fun getCurrentLocation(): Location? {
        return suspendCoroutine { continuation ->
            fusedLocationClient.lastLocation.addOnCompleteListener { task ->
                if (task.isSuccessful && task.result != null) {
                    val location = task.result
                    continuation.resume(
                        Location(
                            latitude = location.latitude,
                            longitude = location.longitude,
                            accuracy = location.accuracy
                        )
                    )
                } else {
                    continuation.resume(null)
                }
            }
        }
    }

    override fun requestLocationPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
    }
}
```

### iOS-Specific Features

#### Push Notifications
```kotlin
// iosMain - Apple Push Notification Service
class IOSNotificationService : NotificationService {
    override suspend fun initialize() {
        val center = UNUserNotificationCenter.currentNotificationCenter()
        center.requestAuthorizationWithOptions(
            options = UNAuthorizationOptionAlert or UNAuthorizationOptionSound or UNAuthorizationOptionBadge
        ) { granted, error ->
            if (granted) {
                platform.UIKit.UIApplication.sharedApplication.registerForRemoteNotifications()
            }
        }
    }

    override suspend fun sendLocalNotification(
        title: String,
        body: String,
        data: Map<String, String>
    ) {
        val content = UNMutableNotificationContent().apply {
            setTitle(title)
            setBody(body)
            setSound(UNNotificationSound.defaultSound)
        }

        val request = UNNotificationRequest.requestWithIdentifier(
            identifier = UUID().toString(),
            content = content,
            trigger = null
        )

        UNUserNotificationCenter.currentNotificationCenter()
            .addNotificationRequest(request) { error ->
                error?.let { println("Notification error: $it") }
            }
    }
}
```

#### File Management
```kotlin
// iosMain - iOS document picker and file upload
class IOSFileManager : FileManager {
    override suspend fun pickDocument(): DocumentFile? {
        return suspendCoroutine { continuation ->
            val documentPicker = UIDocumentPickerViewController(
                documentTypes = listOf("public.data"),
                mode = UIDocumentPickerModeImport
            )
            
            documentPicker.delegate = object : UIDocumentPickerDelegate {
                override fun documentPicker(
                    controller: UIDocumentPickerViewController,
                    didPickDocumentsAt: List<NSURL>
                ) {
                    val url = didPickDocumentsAt.firstOrNull()
                    url?.let {
                        val file = DocumentFile(
                            uri = it.absoluteString ?: "",
                            name = it.lastPathComponent ?: "unknown",
                            type = "application/octet-stream",
                            size = 0 // iOS doesn't provide size easily
                        )
                        continuation.resume(file)
                    } ?: continuation.resume(null)
                }

                override fun documentPickerWasCancelled(
                    controller: UIDocumentPickerViewController
                ) {
                    continuation.resume(null)
                }
            }
            
            // Present document picker
            UIApplication.sharedApplication.keyWindow?.rootViewController
                ?.presentViewController(documentPicker, animated = true, completion = null)
        }
    }
}
```

## Real-time Features

### Instant Virtual Interpretation Flow
```kotlin
// Shared instant virtual interpretation logic
class InstantVirtualUseCase(
    private val realTimeManager: RealTimeManager,
    private val webRTCManager: WebRTCManager
) {
    suspend fun requestInstantInterpretation(
        languagePair: LanguagePair
    ): Flow<InstantVirtualState> = flow {
        emit(InstantVirtualState.Searching)
        
        // Send request to available interpreters
        realTimeManager.sendMessage(
            InstantVirtualRequest(
                languageFrom = languagePair.from,
                languageTo = languagePair.to,
                clientId = getCurrentUserId()
            )
        )
        
        // Listen for interpreter responses
        realTimeManager.connect()
            .filterIsInstance<InterpreterAcceptedEvent>()
            .collect { event ->
                emit(InstantVirtualState.InterpreterFound(event.interpreter))
                
                // Initialize WebRTC connection
                val connection = webRTCManager.createConnection(event.sessionId)
                emit(InstantVirtualState.Connecting(connection))
                
                // Wait for connection establishment
                connection.onConnected {
                    emit(InstantVirtualState.Connected(connection))
                }
            }
    }
}
```

### Push Notification Handling
```kotlin
// Shared notification handling logic
class NotificationHandler(
    private val repository: RequestRepository
) {
    suspend fun handleNotification(notification: PushNotification) {
        when (notification.type) {
            NotificationType.NEW_REQUEST -> {
                // Refresh local data
                repository.refreshAvailableRequests()
            }
            NotificationType.REQUEST_ACCEPTED -> {
                // Update request status
                repository.updateRequestStatus(
                    requestId = notification.data["request_id"]!!,
                    status = RequestStatus.ACCEPTED
                )
            }
            NotificationType.INSTANT_VIRTUAL_REQUEST -> {
                // Show instant virtual notification
                showInstantVirtualNotification(notification.data)
            }
            NotificationType.SESSION_REMINDER -> {
                // Schedule local reminder
                scheduleSessionReminder(notification.data)
            }
        }
    }
}
```

## Testing Strategy

### Shared Unit Tests
```kotlin
// commonTest - Shared business logic tests
class RequestRepositoryTest {
    @Test
    fun `getAvailableRequests returns cached data when offline`() = runTest {
        // Given
        val cachedRequests = listOf(mockRequest1, mockRequest2)
        every { database.requestQueries.selectAllRequests() } returns flowOf(cachedRequests)
        every { apiClient.getAvailableRequests() } throws NetworkException()
        
        // When
        val result = repository.getAvailableRequests().first()
        
        // Then
        assertEquals(cachedRequests, result)
    }
}
```

### UI Tests
```kotlin
// commonTest - Compose UI tests
@Test
fun serviceRequestCardDisplaysCorrectInformation() {
    composeRule.setContent {
        ServiceRequestCard(
            request = mockRequest,
            userRole = UserRole.CLIENT,
            onViewDetails = {}
        )
    }
    
    composeRule.onNodeWithText(mockRequest.requestNumber).assertIsDisplayed()
    composeRule.onNodeWithText("English → French").assertIsDisplayed()
}
```

## Deployment

### Android Deployment
```kotlin
// Android build configuration
android {
    compileSdk = 34
    
    defaultConfig {
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"
    }
    
    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"))
        }
    }
    
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }
}
```

### iOS Deployment
```swift
// iOS build configuration in Xcode
// Minimum deployment target: iOS 14.0
// Architecture: arm64 (iPhone/iPad), x86_64 (Simulator)
// Code signing: Distribution certificate for App Store
```

### CI/CD Pipeline
```yaml
# GitHub Actions workflow
name: Mobile Build and Test

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-java@v3
        with:
          java-version: '17'
      - name: Run shared tests
        run: ./gradlew :shared:testDebugUnitTest
      - name: Run UI tests
        run: ./gradlew :composeApp:testDebugUnitTest

  android-build:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - name: Build Android APK
        run: ./gradlew :androidApp:assembleRelease

  ios-build:
    runs-on: macos-latest
    needs: test
    steps:
      - name: Build iOS app
        run: xcodebuild -workspace iosApp/iosApp.xcworkspace -scheme iosApp -configuration Release
``` 