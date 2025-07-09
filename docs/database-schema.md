# Database Schema Documentation

## Overview

The LinguaLink database is built on PostgreSQL through Supabase, providing robust relational data management with real-time capabilities. The schema is designed to handle complex business logic while maintaining data integrity and supporting real-time synchronization across web and mobile platforms.

## Core Tables

### Users Table
Stores all user information with role-based access control.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_id VARCHAR UNIQUE NOT NULL,
    email VARCHAR UNIQUE NOT NULL,
    first_name VARCHAR NOT NULL,
    last_name VARCHAR NOT NULL,
    role user_role NOT NULL DEFAULT 'client',
    status user_status NOT NULL DEFAULT 'pending_approval',
    profile JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enums for user management
CREATE TYPE user_role AS ENUM ('admin', 'client', 'interpreter');
CREATE TYPE user_status AS ENUM ('pending_approval', 'active', 'suspended', 'deactivated');

-- Indexes for performance
CREATE INDEX idx_users_clerk_id ON users(clerk_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
```

#### User Profile Structures (JSONB)

**Client Profile:**
```json
{
  "company_name": "Global Corp Inc.",
  "contact_person": "John Smith",
  "phone": "+1-555-0123",
  "address": {
    "street": "123 Business Ave",
    "city": "Toronto",
    "province": "ON",
    "postal_code": "M1A 2B3",
    "country": "Canada"
  },
  "billing_info": {
    "company_number": "123456789",
    "tax_number": "987654321"
  },
  "preferences": {
    "preferred_languages": ["English", "French"],
    "notification_settings": {
      "email": true,
      "sms": false,
      "push": true
    }
  }
}
```

**Interpreter Profile:**
```json
{
  "phone": "+1-555-0123",
  "sin_number": "123-456-789",
  "address": {
    "street": "456 Interpreter St",
    "city": "Montreal",
    "province": "QC",
    "postal_code": "H1A 2B3",
    "country": "Canada"
  },
  "languages": [
    {
      "language": "French",
      "proficiency": "native",
      "certifications": ["CILISAT Level 4"]
    },
    {
      "language": "Spanish",
      "proficiency": "professional",
      "certifications": ["DELE C2"]
    }
  ],
  "availability_mode": ["phone", "in_person", "virtual"],
  "working_hours": {
    "monday": { "start": "09:00", "end": "17:00" },
    "tuesday": { "start": "09:00", "end": "17:00" },
    "wednesday": { "start": "09:00", "end": "17:00" },
    "thursday": { "start": "09:00", "end": "17:00" },
    "friday": { "start": "09:00", "end": "17:00" },
    "saturday": null,
    "sunday": null
  },
  "rates": {
    "translation": 0.25,
    "interpretation_phone": 75.00,
    "interpretation_in_person": 85.00,
    "interpretation_virtual": 70.00
  },
  "certifications": [
    {
      "name": "Certified Court Interpreter",
      "issuer": "CTIC",
      "expiry_date": "2025-12-31"
    }
  ],
  "photo_url": "https://storage.supabase.co/..."
}
```

### Service Requests Table
Central table managing all translation and interpretation requests.

```sql
CREATE TABLE service_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_number VARCHAR UNIQUE NOT NULL,
    service_type service_type NOT NULL,
    language_from VARCHAR NOT NULL,
    language_to VARCHAR NOT NULL,
    status request_status NOT NULL DEFAULT 'open',
    
    -- User relationships
    client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    interpreter_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Scheduling information
    scheduled_at TIMESTAMP WITH TIME ZONE,
    duration INTEGER, -- in minutes
    deadline TIMESTAMP WITH TIME ZONE,
    
    -- Location and preferences
    location TEXT,
    location_details JSONB, -- Building #, floor, room, etc.
    
    -- Financial
    rate DECIMAL(10,2),
    estimated_cost DECIMAL(10,2),
    
    -- Additional information
    notes TEXT,
    special_requirements TEXT,
    documents JSONB, -- Array of document metadata
    preferences JSONB, -- Gender preference, specific interpreter, etc.
    
    -- Tracking
    assigned_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enums for service requests
CREATE TYPE service_type AS ENUM ('translation', 'in_person', 'scheduled_phone', 'instant_virtual');
CREATE TYPE request_status AS ENUM ('open', 'assigned', 'in_progress', 'completed', 'cancelled');

-- Auto-generate request numbers
CREATE OR REPLACE FUNCTION generate_request_number()
RETURNS TRIGGER AS $$
DECLARE
    prefix VARCHAR;
    counter INTEGER;
    month VARCHAR;
    year VARCHAR;
BEGIN
    -- Determine prefix based on service type
    CASE NEW.service_type
        WHEN 'translation' THEN prefix := 'T';
        WHEN 'in_person' THEN prefix := 'IN';
        WHEN 'scheduled_phone' THEN prefix := 'SP';
        WHEN 'instant_virtual' THEN prefix := 'IV';
    END CASE;
    
    -- Get current month and year
    month := TO_CHAR(NOW(), 'MM');
    year := TO_CHAR(NOW(), 'YYYY');
    
    -- Get next counter for this type/month/year
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(request_number FROM '\((\d+)\)') AS INTEGER)
    ), 0) + 1
    INTO counter
    FROM service_requests
    WHERE service_type = NEW.service_type
    AND TO_CHAR(created_at, 'MM-YYYY') = month || '-' || year;
    
    -- Generate request number
    NEW.request_number := prefix || '(' || counter || ')(' || month || ')(' || year || ')';
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_request_number
    BEFORE INSERT ON service_requests
    FOR EACH ROW
    EXECUTE FUNCTION generate_request_number();

-- Indexes for performance
CREATE INDEX idx_service_requests_client_id ON service_requests(client_id);
CREATE INDEX idx_service_requests_interpreter_id ON service_requests(interpreter_id);
CREATE INDEX idx_service_requests_status ON service_requests(status);
CREATE INDEX idx_service_requests_service_type ON service_requests(service_type);
CREATE INDEX idx_service_requests_scheduled_at ON service_requests(scheduled_at);
CREATE INDEX idx_service_requests_language_pair ON service_requests(language_from, language_to);
```

#### Request Preferences Structure (JSONB)
```json
{
  "gender_preference": "female", // "male", "female", "any"
  "specific_interpreter_id": "uuid-here", // optional
  "urgency": "normal", // "low", "normal", "high", "urgent"
  "special_instructions": "Medical terminology required",
  "contact_info": {
    "primary_contact": "Jane Doe",
    "phone": "+1-555-0123",
    "email": "jane@company.com"
  },
  "accessibility_requirements": [
    "wheelchair_accessible",
    "sign_language_support"
  ]
}
```

### Sessions Table
Tracks actual interpretation sessions with check-in/check-out functionality.

```sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
    
    -- Session timing
    check_in_time TIMESTAMP WITH TIME ZONE,
    check_out_time TIMESTAMP WITH TIME ZONE,
    scheduled_duration INTEGER, -- Original planned duration in minutes
    actual_duration INTEGER, -- Calculated actual duration in minutes
    
    -- Location tracking (for in-person sessions)
    check_in_location POINT, -- PostGIS point (longitude, latitude)
    check_out_location POINT,
    location_verified BOOLEAN DEFAULT FALSE,
    
    -- Session data
    session_notes TEXT,
    interpreter_notes TEXT,
    client_feedback TEXT,
    session_recording_url TEXT, -- For virtual sessions
    
    -- Payment calculation
    calculated_amount DECIMAL(10,2),
    rate_applied DECIMAL(10,2),
    overtime_amount DECIMAL(10,2) DEFAULT 0,
    
    -- Quality and completion
    completed_successfully BOOLEAN DEFAULT TRUE,
    quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger to calculate actual duration and amount
CREATE OR REPLACE FUNCTION calculate_session_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate actual duration when checking out
    IF NEW.check_out_time IS NOT NULL AND OLD.check_out_time IS NULL THEN
        NEW.actual_duration := EXTRACT(EPOCH FROM (NEW.check_out_time - NEW.check_in_time)) / 60;
        
        -- Calculate payment based on actual time
        -- Minimum billing is the scheduled duration or 1 hour, whichever is greater
        DECLARE
            billable_minutes INTEGER;
            hourly_rate DECIMAL(10,2);
        BEGIN
            billable_minutes := GREATEST(NEW.actual_duration, NEW.scheduled_duration, 60);
            
            -- Get rate from request or interpreter profile
            SELECT rate INTO hourly_rate FROM service_requests WHERE id = NEW.request_id;
            
            NEW.calculated_amount := (billable_minutes / 60.0) * hourly_rate;
            NEW.rate_applied := hourly_rate;
            
            -- Calculate overtime if session exceeds scheduled duration by more than 15 minutes
            IF NEW.actual_duration > (NEW.scheduled_duration + 15) THEN
                NEW.overtime_amount := ((NEW.actual_duration - NEW.scheduled_duration) / 60.0) * (hourly_rate * 1.5);
                NEW.calculated_amount := NEW.calculated_amount + NEW.overtime_amount;
            END IF;
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_session_metrics
    BEFORE UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION calculate_session_metrics();

-- Indexes
CREATE INDEX idx_sessions_request_id ON sessions(request_id);
CREATE INDEX idx_sessions_check_in_time ON sessions(check_in_time);
CREATE INDEX idx_sessions_actual_duration ON sessions(actual_duration);
```

### Availability Table
Manages interpreter availability schedules and real-time status.

```sql
CREATE TABLE availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interpreter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Availability type
    availability_type availability_type NOT NULL DEFAULT 'regular',
    
    -- Regular schedule (for recurring availability)
    day_of_week INTEGER, -- 0 = Sunday, 1 = Monday, etc.
    start_time TIME,
    end_time TIME,
    
    -- Specific date/time availability or unavailability
    specific_date DATE,
    start_datetime TIMESTAMP WITH TIME ZONE,
    end_datetime TIMESTAMP WITH TIME ZONE,
    
    -- Service modes available during this time
    available_modes TEXT[] DEFAULT ARRAY['phone', 'in_person', 'virtual'],
    
    -- Real-time status
    is_currently_available BOOLEAN DEFAULT TRUE,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TYPE availability_type AS ENUM ('regular', 'specific', 'unavailable', 'vacation');

-- Indexes for availability queries
CREATE INDEX idx_availability_interpreter_id ON availability(interpreter_id);
CREATE INDEX idx_availability_day_of_week ON availability(day_of_week);
CREATE INDEX idx_availability_specific_date ON availability(specific_date);
CREATE INDEX idx_availability_currently_available ON availability(is_currently_available);

-- Function to check if interpreter is available at a specific time
CREATE OR REPLACE FUNCTION is_interpreter_available(
    p_interpreter_id UUID,
    p_datetime TIMESTAMP WITH TIME ZONE,
    p_duration INTEGER -- in minutes
) RETURNS BOOLEAN AS $$
DECLARE
    end_datetime TIMESTAMP WITH TIME ZONE;
    day_of_week INTEGER;
    time_of_day TIME;
    is_available BOOLEAN := FALSE;
BEGIN
    end_datetime := p_datetime + (p_duration || ' minutes')::INTERVAL;
    day_of_week := EXTRACT(DOW FROM p_datetime);
    time_of_day := p_datetime::TIME;
    
    -- Check for specific unavailability first
    IF EXISTS (
        SELECT 1 FROM availability 
        WHERE interpreter_id = p_interpreter_id 
        AND availability_type IN ('unavailable', 'vacation')
        AND (
            (specific_date = p_datetime::DATE) OR
            (start_datetime <= p_datetime AND end_datetime >= end_datetime)
        )
    ) THEN
        RETURN FALSE;
    END IF;
    
    -- Check regular availability
    IF EXISTS (
        SELECT 1 FROM availability
        WHERE interpreter_id = p_interpreter_id
        AND availability_type = 'regular'
        AND day_of_week = day_of_week
        AND start_time <= time_of_day
        AND end_time >= (end_datetime)::TIME
    ) THEN
        is_available := TRUE;
    END IF;
    
    -- Check specific availability (overrides regular)
    IF EXISTS (
        SELECT 1 FROM availability
        WHERE interpreter_id = p_interpreter_id
        AND availability_type = 'specific'
        AND start_datetime <= p_datetime
        AND end_datetime >= end_datetime
    ) THEN
        is_available := TRUE;
    END IF;
    
    RETURN is_available;
END;
$$ LANGUAGE plpgsql;
```

### Messages Table
Handles communication between users.

```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Message content
    message_type message_type NOT NULL DEFAULT 'text',
    content TEXT NOT NULL,
    attachment_url TEXT,
    attachment_metadata JSONB,
    
    -- Related request (optional)
    request_id UUID REFERENCES service_requests(id) ON DELETE SET NULL,
    
    -- Status tracking
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TYPE message_type AS ENUM ('text', 'file', 'image', 'system', 'notification');

-- Indexes for message queries
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX idx_messages_request_id ON messages(request_id);
CREATE INDEX idx_messages_sent_at ON messages(sent_at);
```

### Files Table
Manages document uploads and metadata.

```sql
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_name VARCHAR NOT NULL,
    file_path VARCHAR UNIQUE NOT NULL,
    public_url VARCHAR,
    
    -- File metadata
    file_size BIGINT NOT NULL,
    mime_type VARCHAR NOT NULL,
    file_hash VARCHAR, -- For duplicate detection
    
    -- Ownership and access
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_id UUID REFERENCES service_requests(id) ON DELETE CASCADE,
    
    -- Access control
    access_level file_access_level NOT NULL DEFAULT 'private',
    allowed_users UUID[], -- Array of user IDs who can access
    
    -- Lifecycle management
    expires_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TYPE file_access_level AS ENUM ('private', 'shared', 'public');

-- Automatic expiry for translation documents (2 months)
CREATE OR REPLACE FUNCTION set_file_expiry()
RETURNS TRIGGER AS $$
BEGIN
    -- Set expiry to 2 months for translation documents
    IF EXISTS (
        SELECT 1 FROM service_requests 
        WHERE id = NEW.request_id 
        AND service_type = 'translation'
    ) THEN
        NEW.expires_at := NOW() + INTERVAL '2 months';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_file_expiry
    BEFORE INSERT ON files
    FOR EACH ROW
    EXECUTE FUNCTION set_file_expiry();

-- Indexes
CREATE INDEX idx_files_uploaded_by ON files(uploaded_by);
CREATE INDEX idx_files_request_id ON files(request_id);
CREATE INDEX idx_files_expires_at ON files(expires_at);
CREATE INDEX idx_files_file_hash ON files(file_hash);
```

### Ratings Table
Stores quality ratings and feedback.

```sql
CREATE TABLE ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    
    -- Rating parties
    rater_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rated_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Rating details
    overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
    communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
    professionalism_rating INTEGER CHECK (professionalism_rating >= 1 AND professionalism_rating <= 5),
    technical_quality_rating INTEGER CHECK (technical_quality_rating >= 1 AND technical_quality_rating <= 5),
    
    -- Feedback
    comment TEXT,
    would_recommend BOOLEAN,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Prevent duplicate ratings for the same request
CREATE UNIQUE INDEX idx_ratings_unique_per_request 
ON ratings(request_id, rater_id, rated_id);

-- Function to calculate average ratings
CREATE OR REPLACE FUNCTION get_average_rating(p_user_id UUID)
RETURNS DECIMAL(3,2) AS $$
DECLARE
    avg_rating DECIMAL(3,2);
BEGIN
    SELECT AVG(overall_rating)::DECIMAL(3,2)
    INTO avg_rating
    FROM ratings
    WHERE rated_id = p_user_id;
    
    RETURN COALESCE(avg_rating, 0);
END;
$$ LANGUAGE plpgsql;
```

### Notifications Table
Manages system notifications and alerts.

```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Notification details
    type notification_type NOT NULL,
    title VARCHAR NOT NULL,
    message TEXT NOT NULL,
    
    -- Related entities
    request_id UUID REFERENCES service_requests(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    
    -- Delivery tracking
    channels notification_channel[] DEFAULT ARRAY['in_app'],
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- Action data (for interactive notifications)
    action_data JSONB,
    
    -- Scheduling
    scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TYPE notification_type AS ENUM (
    'request_created',
    'request_assigned', 
    'request_accepted',
    'request_declined',
    'request_cancelled',
    'session_reminder',
    'session_started',
    'session_completed',
    'payment_processed',
    'rating_received',
    'system_announcement'
);

CREATE TYPE notification_channel AS ENUM ('in_app', 'email', 'sms', 'push');

-- Indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_scheduled_for ON notifications(scheduled_for);
CREATE INDEX idx_notifications_read_at ON notifications(read_at);
```

## Supabase Real-time Configuration

### Row Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- User policies
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid()::text = clerk_id);

CREATE POLICY "Admins can view all users" ON users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE clerk_id = auth.uid()::text 
            AND role = 'admin'
        )
    );

-- Service request policies
CREATE POLICY "Clients can view their own requests" ON service_requests
    FOR SELECT USING (
        client_id = (
            SELECT id FROM users WHERE clerk_id = auth.uid()::text
        )
    );

CREATE POLICY "Interpreters can view assigned requests" ON service_requests
    FOR SELECT USING (
        interpreter_id = (
            SELECT id FROM users WHERE clerk_id = auth.uid()::text
        )
    );

CREATE POLICY "Interpreters can view open requests matching their languages" ON service_requests
    FOR SELECT USING (
        status = 'open' AND
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.clerk_id = auth.uid()::text
            AND u.role = 'interpreter'
            AND u.profile->'languages' @> jsonb_build_array(
                jsonb_build_object('language', language_from)
            )
        )
    );

-- File access policies
CREATE POLICY "Users can access files they uploaded" ON files
    FOR SELECT USING (
        uploaded_by = (
            SELECT id FROM users WHERE clerk_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can access files for their requests" ON files
    FOR SELECT USING (
        request_id IN (
            SELECT id FROM service_requests sr
            WHERE sr.client_id = (
                SELECT id FROM users WHERE clerk_id = auth.uid()::text
            )
            OR sr.interpreter_id = (
                SELECT id FROM users WHERE clerk_id = auth.uid()::text
            )
        )
    );
```

### Real-time Subscriptions Setup

```sql
-- Enable real-time for specific tables and events
ALTER PUBLICATION supabase_realtime ADD TABLE service_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE availability;

-- Create channels for real-time updates
-- Client applications will subscribe to:
-- - public:service_requests:request_id=eq.{request_id}
-- - public:messages:conversation_id=eq.{conversation_id}
-- - public:notifications:user_id=eq.{user_id}
-- - public:sessions:request_id=eq.{request_id}
```

## Performance Optimization

### Database Indexes
```sql
-- Composite indexes for common query patterns
CREATE INDEX idx_requests_client_status ON service_requests(client_id, status);
CREATE INDEX idx_requests_interpreter_status ON service_requests(interpreter_id, status);
CREATE INDEX idx_requests_type_status_date ON service_requests(service_type, status, created_at);
CREATE INDEX idx_sessions_request_checkin ON sessions(request_id, check_in_time);
CREATE INDEX idx_availability_interpreter_datetime ON availability(interpreter_id, start_datetime, end_datetime);

-- Partial indexes for performance
CREATE INDEX idx_open_requests ON service_requests(created_at) WHERE status = 'open';
CREATE INDEX idx_active_sessions ON sessions(check_in_time) WHERE check_out_time IS NULL;
CREATE INDEX idx_unread_notifications ON notifications(user_id, created_at) WHERE read_at IS NULL;
```

### Database Functions for Analytics

```sql
-- Get request statistics for dashboard
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_user_id UUID, p_user_role user_role)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    CASE p_user_role
        WHEN 'admin' THEN
            SELECT json_build_object(
                'total_requests', (SELECT COUNT(*) FROM service_requests),
                'active_requests', (SELECT COUNT(*) FROM service_requests WHERE status IN ('open', 'assigned', 'in_progress')),
                'total_interpreters', (SELECT COUNT(*) FROM users WHERE role = 'interpreter' AND status = 'active'),
                'total_clients', (SELECT COUNT(*) FROM users WHERE role = 'client' AND status = 'active'),
                'pending_approvals', (SELECT COUNT(*) FROM users WHERE status = 'pending_approval')
            ) INTO result;
            
        WHEN 'client' THEN
            SELECT json_build_object(
                'my_requests', (SELECT COUNT(*) FROM service_requests WHERE client_id = p_user_id),
                'active_requests', (SELECT COUNT(*) FROM service_requests WHERE client_id = p_user_id AND status IN ('open', 'assigned', 'in_progress')),
                'completed_requests', (SELECT COUNT(*) FROM service_requests WHERE client_id = p_user_id AND status = 'completed'),
                'total_spent', (SELECT COALESCE(SUM(s.calculated_amount), 0) FROM sessions s JOIN service_requests sr ON s.request_id = sr.id WHERE sr.client_id = p_user_id)
            ) INTO result;
            
        WHEN 'interpreter' THEN
            SELECT json_build_object(
                'available_jobs', (SELECT COUNT(*) FROM service_requests WHERE status = 'open'),
                'my_jobs', (SELECT COUNT(*) FROM service_requests WHERE interpreter_id = p_user_id),
                'completed_jobs', (SELECT COUNT(*) FROM service_requests WHERE interpreter_id = p_user_id AND status = 'completed'),
                'total_earned', (SELECT COALESCE(SUM(calculated_amount), 0) FROM sessions s JOIN service_requests sr ON s.request_id = sr.id WHERE sr.interpreter_id = p_user_id),
                'average_rating', get_average_rating(p_user_id)
            ) INTO result;
    END CASE;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;
```

### Emergency Escalation Table
Manages emergency situations and escalation procedures.

```sql
CREATE TABLE emergency_escalations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    
    -- Emergency details
    escalation_type emergency_type NOT NULL,
    severity emergency_severity NOT NULL DEFAULT 'medium',
    description TEXT NOT NULL,
    
    -- Location and contact
    emergency_location POINT,
    emergency_contact_phone VARCHAR,
    emergency_contact_name VARCHAR,
    
    -- Status tracking
    status escalation_status NOT NULL DEFAULT 'open',
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL, -- Admin handling
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    
    -- Escalation timing
    escalated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    response_time INTERVAL, -- Time to first response
    resolution_time INTERVAL, -- Time to resolution
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Emergency enums
CREATE TYPE emergency_type AS ENUM (
    'interpreter_no_show',
    'client_safety_concern',
    'technical_failure',
    'inappropriate_behavior',
    'medical_emergency',
    'security_incident',
    'service_quality_issue'
);

CREATE TYPE emergency_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE escalation_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');

-- Indexes for emergency escalations
CREATE INDEX idx_emergency_escalations_request_id ON emergency_escalations(request_id);
CREATE INDEX idx_emergency_escalations_status ON emergency_escalations(status);
CREATE INDEX idx_emergency_escalations_severity ON emergency_escalations(severity);
CREATE INDEX idx_emergency_escalations_type ON emergency_escalations(escalation_type);
```

### Geolocation Validation Table
Tracks location accuracy and validation for in-person services.

```sql
CREATE TABLE location_validations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    request_id UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
    
    -- Location data
    recorded_location POINT NOT NULL,
    expected_location POINT,
    accuracy_radius DECIMAL(8,2), -- meters
    location_source location_source_type NOT NULL,
    
    -- Validation results
    is_valid BOOLEAN NOT NULL DEFAULT FALSE,
    distance_variance DECIMAL(10,2), -- meters from expected location
    validation_method validation_method_type NOT NULL,
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
    
    -- Metadata
    device_info JSONB, -- Device type, GPS accuracy, etc.
    timestamp_recorded TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    validation_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Location enums
CREATE TYPE location_source_type AS ENUM ('gps', 'network', 'manual', 'wifi', 'cellular');
CREATE TYPE validation_method_type AS ENUM ('automatic', 'manual_admin', 'manual_interpreter', 'proximity_based');

-- Indexes for location validations
CREATE INDEX idx_location_validations_session_id ON location_validations(session_id);
CREATE INDEX idx_location_validations_request_id ON location_validations(request_id);
CREATE INDEX idx_location_validations_location ON location_validations USING GIST (recorded_location);
CREATE INDEX idx_location_validations_valid ON location_validations(is_valid);
```

### System Health Monitoring Table
Tracks system performance and health metrics.

```sql
CREATE TABLE system_health_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_type health_metric_type NOT NULL,
    metric_name VARCHAR NOT NULL,
    metric_value DECIMAL(15,6) NOT NULL,
    metric_unit VARCHAR,
    
    -- Context and metadata
    source_component VARCHAR NOT NULL, -- 'api', 'database', 'storage', etc.
    environment VARCHAR NOT NULL DEFAULT 'production',
    additional_context JSONB,
    
    -- Thresholds and alerts
    warning_threshold DECIMAL(15,6),
    critical_threshold DECIMAL(15,6),
    is_alert_triggered BOOLEAN DEFAULT FALSE,
    
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Health metric enums
CREATE TYPE health_metric_type AS ENUM (
    'response_time',
    'error_rate',
    'throughput',
    'cpu_usage',
    'memory_usage',
    'disk_usage',
    'connection_count',
    'queue_size',
    'cache_hit_rate'
);

-- Indexes for system health metrics
CREATE INDEX idx_system_health_metrics_type ON system_health_metrics(metric_type);
CREATE INDEX idx_system_health_metrics_component ON system_health_metrics(source_component);
CREATE INDEX idx_system_health_metrics_recorded_at ON system_health_metrics(recorded_at);
CREATE INDEX idx_system_health_metrics_alerts ON system_health_metrics(is_alert_triggered);
```

### Audit Log Table
Comprehensive audit trail for all system activities.

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User and action information
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_role user_role,
    action audit_action_type NOT NULL,
    resource_type VARCHAR NOT NULL,
    resource_id UUID,
    
    -- Change tracking
    old_values JSONB,
    new_values JSONB,
    changes_summary TEXT,
    
    -- Request context
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR,
    request_id VARCHAR, -- Not FK, just tracking ID
    
    -- Result and metadata
    success BOOLEAN NOT NULL DEFAULT TRUE,
    error_message TEXT,
    execution_time_ms INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit action enums
CREATE TYPE audit_action_type AS ENUM (
    'CREATE',
    'READ',
    'UPDATE',
    'DELETE',
    'LOGIN',
    'LOGOUT',
    'ASSIGN',
    'APPROVE',
    'REJECT',
    'ESCALATE',
    'EXPORT'
);

-- Indexes for audit logs
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_success ON audit_logs(success);

### Calendar Integration Table
Manages external calendar synchronization and conflict detection.

```sql
CREATE TABLE calendar_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Integration details
    provider calendar_provider NOT NULL,
    external_calendar_id VARCHAR NOT NULL,
    access_token_encrypted VARCHAR NOT NULL,
    refresh_token_encrypted VARCHAR,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Configuration
    sync_enabled BOOLEAN DEFAULT TRUE,
    conflict_detection_enabled BOOLEAN DEFAULT TRUE,
    auto_block_conflicts BOOLEAN DEFAULT FALSE,
    sync_direction calendar_sync_direction DEFAULT 'bidirectional',
    
    -- Sync tracking
    last_sync_at TIMESTAMP WITH TIME ZONE,
    sync_status calendar_sync_status DEFAULT 'active',
    sync_errors_count INTEGER DEFAULT 0,
    last_error_message TEXT,
    
    -- Metadata
    timezone VARCHAR DEFAULT 'America/Toronto',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Calendar enums
CREATE TYPE calendar_provider AS ENUM ('google', 'outlook', 'apple', 'exchange');
CREATE TYPE calendar_sync_direction AS ENUM ('import_only', 'export_only', 'bidirectional');
CREATE TYPE calendar_sync_status AS ENUM ('active', 'error', 'suspended', 'disabled');

-- Indexes for calendar integrations
CREATE INDEX idx_calendar_integrations_user_id ON calendar_integrations(user_id);
CREATE INDEX idx_calendar_integrations_provider ON calendar_integrations(provider);
CREATE INDEX idx_calendar_integrations_sync_status ON calendar_integrations(sync_status);
CREATE INDEX idx_calendar_integrations_last_sync ON calendar_integrations(last_sync_at);
```

### Calendar Conflicts Table
Tracks detected scheduling conflicts and resolutions.

```sql
CREATE TABLE calendar_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    calendar_integration_id UUID NOT NULL REFERENCES calendar_integrations(id) ON DELETE CASCADE,
    request_id UUID REFERENCES service_requests(id) ON DELETE CASCADE,
    
    -- Conflict details
    conflict_type calendar_conflict_type NOT NULL,
    conflict_start TIMESTAMP WITH TIME ZONE NOT NULL,
    conflict_end TIMESTAMP WITH TIME ZONE NOT NULL,
    external_event_id VARCHAR,
    external_event_title VARCHAR,
    
    -- Resolution tracking
    status conflict_resolution_status DEFAULT 'detected',
    resolution_action conflict_resolution_action,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    
    -- Metadata
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    severity conflict_severity DEFAULT 'medium',
    auto_resolved BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conflict enums
CREATE TYPE calendar_conflict_type AS ENUM (
    'scheduling_overlap',
    'availability_mismatch',
    'timezone_conflict',
    'duration_conflict'
);

CREATE TYPE conflict_resolution_status AS ENUM ('detected', 'acknowledged', 'resolved', 'ignored');
CREATE TYPE conflict_resolution_action AS ENUM (
    'reschedule_request',
    'cancel_request',
    'ignore_conflict',
    'modify_availability',
    'manual_override'
);

CREATE TYPE conflict_severity AS ENUM ('low', 'medium', 'high', 'critical');

-- Indexes for calendar conflicts
CREATE INDEX idx_calendar_conflicts_user_id ON calendar_conflicts(user_id);
CREATE INDEX idx_calendar_conflicts_request_id ON calendar_conflicts(request_id);
CREATE INDEX idx_calendar_conflicts_status ON calendar_conflicts(status);
CREATE INDEX idx_calendar_conflicts_severity ON calendar_conflicts(severity);
CREATE INDEX idx_calendar_conflicts_time_range ON calendar_conflicts USING GIST (
    tstzrange(conflict_start, conflict_end)
);
```

### Third-Party Integration Monitoring Table
Monitors external service health and performance.

```sql
CREATE TABLE integration_monitoring (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name VARCHAR NOT NULL,
    service_type integration_service_type NOT NULL,
    endpoint_url VARCHAR NOT NULL,
    
    -- Health check details
    status integration_status NOT NULL DEFAULT 'healthy',
    response_time_ms INTEGER,
    last_check_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_success_at TIMESTAMP WITH TIME ZONE,
    last_failure_at TIMESTAMP WITH TIME ZONE,
    
    -- Failure tracking
    consecutive_failures INTEGER DEFAULT 0,
    total_failures_24h INTEGER DEFAULT 0,
    failure_rate_percent DECIMAL(5,2) DEFAULT 0.0,
    last_error_message TEXT,
    last_error_code VARCHAR,
    
    -- Configuration
    check_interval_minutes INTEGER DEFAULT 5,
    timeout_seconds INTEGER DEFAULT 30,
    max_failures_before_alert INTEGER DEFAULT 3,
    alert_enabled BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    environment VARCHAR DEFAULT 'production',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Integration enums
CREATE TYPE integration_service_type AS ENUM (
    'authentication',
    'database',
    'file_storage',
    'email_service',
    'sms_service',
    'video_calling',
    'calendar_sync',
    'payment_processing',
    'push_notifications'
);

CREATE TYPE integration_status AS ENUM ('healthy', 'degraded', 'unhealthy', 'maintenance');

-- Indexes for integration monitoring
CREATE INDEX idx_integration_monitoring_service_name ON integration_monitoring(service_name);
CREATE INDEX idx_integration_monitoring_service_type ON integration_monitoring(service_type);
CREATE INDEX idx_integration_monitoring_status ON integration_monitoring(status);
CREATE INDEX idx_integration_monitoring_last_check ON integration_monitoring(last_check_at);
CREATE INDEX idx_integration_monitoring_environment ON integration_monitoring(environment);
```

### Notification Preferences Table
Detailed user notification preferences and delivery tracking.

```sql
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Channel preferences
    email_enabled BOOLEAN DEFAULT TRUE,
    sms_enabled BOOLEAN DEFAULT FALSE,
    push_enabled BOOLEAN DEFAULT TRUE,
    in_app_enabled BOOLEAN DEFAULT TRUE,
    
    -- Notification type preferences
    request_notifications JSONB DEFAULT '{"email": true, "push": true, "sms": false}',
    session_notifications JSONB DEFAULT '{"email": true, "push": true, "sms": true}',
    payment_notifications JSONB DEFAULT '{"email": true, "push": false, "sms": false}',
    emergency_notifications JSONB DEFAULT '{"email": true, "push": true, "sms": true}',
    marketing_notifications JSONB DEFAULT '{"email": false, "push": false, "sms": false}',
    system_notifications JSONB DEFAULT '{"email": true, "push": true, "sms": false}',
    
    -- Timing preferences
    quiet_hours_enabled BOOLEAN DEFAULT FALSE,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    timezone VARCHAR DEFAULT 'America/Toronto',
    
    -- Delivery preferences
    digest_mode BOOLEAN DEFAULT FALSE,
    digest_frequency notification_digest_frequency DEFAULT 'daily',
    max_notifications_per_hour INTEGER DEFAULT 10,
    
    -- Contact information
    email_address VARCHAR,
    phone_number VARCHAR,
    phone_verified BOOLEAN DEFAULT FALSE,
    email_verified BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification preference enums
CREATE TYPE notification_digest_frequency AS ENUM ('immediate', 'hourly', 'daily', 'weekly');

-- Unique constraint to ensure one preference record per user
CREATE UNIQUE INDEX idx_notification_preferences_user_unique ON notification_preferences(user_id);

-- Indexes for notification preferences
CREATE INDEX idx_notification_preferences_email ON notification_preferences(email_address);
CREATE INDEX idx_notification_preferences_phone ON notification_preferences(phone_number);
```
```

## Migration Scripts

### Initial Schema Migration
```sql
-- Migration: 001_initial_schema.sql
-- Create all base tables, types, and functions

BEGIN;

-- Create all enum types first
CREATE TYPE user_role AS ENUM ('admin', 'client', 'interpreter');
-- ... (all other enum types)

-- Create base tables
CREATE TABLE users (
    -- ... (table definition)
);

-- Create all other tables with foreign key relationships

-- Create all functions and triggers

-- Create all indexes

COMMIT;
```

### Sample Data Seeds
```sql
-- Seeds for development environment
INSERT INTO users (clerk_id, email, first_name, last_name, role, status) VALUES
('admin_clerk_id', 'admin@lingualink.com', 'System', 'Administrator', 'admin', 'active'),
('client1_clerk_id', 'client1@example.com', 'John', 'Smith', 'client', 'active'),
('interpreter1_clerk_id', 'interpreter1@example.com', 'Marie', 'Dubois', 'interpreter', 'active');

-- Sample service requests
INSERT INTO service_requests (service_type, language_from, language_to, client_id, status) VALUES
('translation', 'English', 'French', (SELECT id FROM users WHERE email = 'client1@example.com'), 'open'),
('in_person', 'English', 'Spanish', (SELECT id FROM users WHERE email = 'client1@example.com'), 'open');
```

This comprehensive database schema provides:

1. **Complete data model** for all business entities
2. **Automated business logic** through triggers and functions
3. **Performance optimization** with strategic indexing
4. **Security** through Row Level Security policies
5. **Real-time capabilities** with Supabase subscriptions
6. **Analytics support** with specialized functions
7. **Data integrity** through constraints and validation

The schema is designed to scale while maintaining consistency and supporting all features across web and mobile platforms. 