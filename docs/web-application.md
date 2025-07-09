# Web Application Documentation

## Overview

The LinguaLink web application provides comprehensive functionality for all user types with full feature parity across all roles. Built with React and modern web technologies, it serves as the primary platform for complex operations like document management, detailed analytics, and administrative functions.

## Architecture

### Technology Stack
- **Framework**: React 18+ with TypeScript
- **State Management**: Redux Toolkit + RTK Query
- **Styling**: Tailwind CSS + Headless UI components
- **Real-time**: Supabase client with WebSocket subscriptions
- **Authentication**: Clerk integration
- **File Upload**: React Dropzone + Supabase Storage
- **Video Calling**: WebRTC with simple-peer
- **Charts**: Recharts for analytics
- **Forms**: React Hook Form + Zod validation

### Project Structure
```
web-app/
├── src/
│   ├── components/
│   │   ├── admin/           # Admin-specific components
│   │   ├── client/          # Client portal components
│   │   ├── interpreter/     # Interpreter dashboard components
│   │   ├── shared/          # Reusable components
│   │   └── ui/              # Base UI components
│   ├── pages/
│   │   ├── admin/           # Admin dashboard pages
│   │   ├── client/          # Client portal pages
│   │   ├── interpreter/     # Interpreter pages
│   │   └── auth/            # Authentication pages
│   ├── hooks/               # Custom React hooks
│   ├── store/               # Redux store configuration
│   ├── services/            # API services and real-time subscriptions
│   ├── types/               # TypeScript type definitions
│   ├── utils/               # Utility functions
│   └── constants/           # Application constants
├── public/                  # Static assets
└── docs/                   # Component documentation
```

## User Roles & Features

### Admin Dashboard (Web Only)

#### Core Features
- **User Management**
  - Approve/reject client and interpreter registrations
  - Deactivate user accounts
  - Edit user information and profiles
  - Reset user passwords

- **Request Management**
  - View all service requests with advanced filtering
  - Manually assign/reassign interpreters
  - Modify request details and parameters
  - Cancel requests with notifications
  - Track request lifecycle and status

- **System Analytics**
  - Request volume reports by date range
  - Interpreter response time analysis
  - Service completion rate tracking
  - Client efficiency metrics
  - Language pair demand analysis
  - Revenue and usage statistics

- **Communication Center**
  - Direct messaging with clients and interpreters
  - System-wide announcements
  - Email notification management
  - Support ticket handling

#### Admin Dashboard Pages
```
/admin/
├── /dashboard              # Overview with key metrics
├── /requests              # Request management interface
├── /users                 # User management (clients & interpreters)
├── /analytics             # Detailed reports and charts
├── /messaging             # Communication center
├── /settings              # System configuration
└── /invoicing             # Invoice generation and management
```

### Client Portal (Web + Mobile Responsive)

#### Service Request Management
- **Translation Requests**
  - Document upload (PDF, Word, JPG)
  - Language pair selection (any language ↔ any language)
  - Deadline specification
  - Special instructions and notes
  - Progress tracking and file delivery

- **Interpretation Requests**
  - In-person booking with location details
  - Scheduled phone interpretation
  - Instant virtual interpretation
  - Language selection (English/French ↔ any language)
  - Duration and timing preferences
  - Gender preference selection
  - Specific interpreter requests

#### Request Tracking & History
- Real-time status updates
- Request history with filtering
- Communication logs with interpreters
- Session recordings and notes access
- Invoice generation and download

#### Client Portal Pages
```
/client/
├── /dashboard             # Request overview and quick actions
├── /new-request           # Create translation/interpretation requests
├── /requests              # Active and pending requests
├── /history               # Completed request history
├── /interpreters          # Available interpreter profiles
├── /messaging             # Communication center
├── /invoices              # Invoice management
└── /profile               # Account settings and preferences
```

### Interpreter/Translator Portal (Web + Mobile Responsive)

#### Job Management
- **Available Jobs Board**
  - Filter by service type, language, location
  - Sort by date, duration, rate
  - Quick accept/decline actions
  - Job details modal with full information

- **Active Assignments**
  - Upcoming job schedule with calendar view
  - Job details and client information
  - Check-in/check-out functionality
  - Session notes and documentation

- **Translation Workflow**
  - Document download and access
  - Translation upload interface
  - Progress tracking and version control
  - Quality review and submission

#### Availability Management
- **Schedule Configuration**
  - Set regular working hours by day
  - Mark unavailable periods (vacations, etc.)
  - Real-time availability toggle
  - Service mode preferences (phone, in-person, all)

- **Performance Tracking**
  - Completed job history
  - Earnings calculator and reports
  - Client ratings and feedback
  - Performance metrics and analytics

#### Interpreter Portal Pages
```
/interpreter/
├── /dashboard             # Overview with upcoming jobs
├── /jobs                  # Available job board
├── /schedule              # Calendar and availability management
├── /active-jobs           # Current assignments and check-in
├── /history               # Completed job history
├── /earnings              # Payment history and T4A reports
├── /messaging             # Client and admin communication
└── /profile               # Skills, languages, and preferences
```

## Real-time Features

### WebSocket Integration
```typescript
// Real-time subscription setup
const useRealTimeSubscriptions = (userRole: UserRole) => {
  const { user } = useAuth();
  
  useEffect(() => {
    const supabase = createClient();
    
    // Subscribe to relevant channels based on user role
    const channels = {
      admin: ['requests', 'users', 'sessions'],
      client: [`client_${user.id}`, 'request_updates'],
      interpreter: [`interpreter_${user.id}`, 'job_alerts']
    };
    
    channels[userRole].forEach(channel => {
      supabase
        .channel(channel)
        .on('postgres_changes', { event: '*' }, handleUpdate)
        .subscribe();
    });
    
    return () => supabase.removeAllChannels();
  }, [userRole, user.id]);
};
```

### Instant Virtual Interpretation Flow
1. **Client initiates request** → Real-time notification to available interpreters
2. **First interpreter accepts** → Immediate WebRTC connection setup
3. **Video/audio session** → Session monitoring and recording
4. **Session completion** → Automatic billing and feedback collection

## Component Architecture

### Shared Components
```typescript
// Reusable request card component
interface RequestCardProps {
  request: ServiceRequest;
  actions?: RequestAction[];
  viewMode: 'client' | 'interpreter' | 'admin';
}

export const RequestCard: React.FC<RequestCardProps> = ({
  request,
  actions,
  viewMode
}) => {
  return (
    <div className="card">
      <RequestHeader request={request} />
      <RequestDetails request={request} viewMode={viewMode} />
      <RequestActions actions={actions} />
    </div>
  );
};
```

### Role-based Routing
```typescript
// Protected route wrapper with role checks
export const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  requiredRole: UserRole;
}> = ({ children, requiredRole }) => {
  const { user, isLoaded } = useUser();
  
  if (!isLoaded) return <LoadingSpinner />;
  if (!user) return <Navigate to="/sign-in" />;
  if (user.role !== requiredRole) return <AccessDenied />;
  
  return <>{children}</>;
};
```

## State Management

### Redux Store Structure
```typescript
export interface RootState {
  auth: AuthState;
  requests: RequestsState;
  users: UsersState;
  real_time: RealTimeState;
  ui: UIState;
}

// RTK Query API slices
export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    prepareHeaders: (headers, { getState }) => {
      headers.set('authorization', `Bearer ${getToken(getState())}`);
      return headers;
    },
  }),
  tagTypes: ['Request', 'User', 'Session'],
  endpoints: (builder) => ({
    getRequests: builder.query<ServiceRequest[], RequestFilters>({
      query: (filters) => ({ url: 'requests', params: filters }),
      providesTags: ['Request'],
    }),
    // ... other endpoints
  }),
});
```

## Responsive Design

### Mobile-Web Hybrid Approach
- **Desktop-first design** with mobile adaptations
- **Touch-friendly interfaces** for mobile browsers
- **Progressive Web App (PWA)** capabilities
- **Offline-first caching** for essential features

### Breakpoint Strategy
```css
/* Tailwind CSS breakpoints */
sm: 640px   /* Mobile landscape */
md: 768px   /* Tablet */
lg: 1024px  /* Desktop */
xl: 1280px  /* Large desktop */
2xl: 1536px /* Extra large */
```

## Performance Optimization

### Code Splitting
```typescript
// Lazy loading by user role
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const ClientPortal = lazy(() => import('./pages/client/Portal'));
const InterpreterPortal = lazy(() => import('./pages/interpreter/Portal'));
```

### Caching Strategy
- **RTK Query** for API response caching
- **React Query** for complex data synchronization
- **Service Worker** for offline functionality
- **Local Storage** for user preferences

## Security Considerations

### Authentication & Authorization
- **Clerk integration** for secure authentication
- **Role-based access control** (RBAC) implementation
- **JWT token management** with refresh logic
- **Session timeout** and security monitoring

### Data Protection
- **Input validation** with Zod schemas
- **XSS prevention** with sanitized rendering
- **CSRF protection** with secure headers
- **File upload scanning** for malicious content

## Testing Strategy

### Test Coverage
```typescript
// Component testing with React Testing Library
describe('RequestCard', () => {
  it('displays request information correctly', () => {
    render(<RequestCard request={mockRequest} viewMode="client" />);
    expect(screen.getByText(mockRequest.title)).toBeInTheDocument();
  });
  
  it('shows appropriate actions based on user role', () => {
    render(<RequestCard request={mockRequest} viewMode="admin" />);
    expect(screen.getByText('Reassign')).toBeInTheDocument();
  });
});
```

### Integration Testing
- **API integration tests** with MSW (Mock Service Worker)
- **Real-time subscription testing** with WebSocket mocks
- **End-to-end testing** with Playwright
- **Accessibility testing** with axe-core

## Deployment

### Build Configuration
```typescript
// Vite configuration for optimal bundling
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          admin: ['./src/pages/admin'],
          client: ['./src/pages/client'],
          interpreter: ['./src/pages/interpreter'],
        },
      },
    },
  },
});
```

### Environment Configuration
- **Development**: Local development with hot reload
- **Staging**: Pre-production testing environment
- **Production**: Optimized build with CDN distribution 