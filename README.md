# LinguaLink - Digital Platform for Exchange Language Services Inc.

## Project Overview

LinguaLink is a comprehensive digital platform built for **Exchange Language Services Inc. (ELS)**, streamlining their interpretation and translation services by connecting clients, interpreters/translators, and ELS administrators in one cohesive ecosystem. The platform digitizes ELS's existing service operations, managing the entire service lifecycle from request submission and assignment to final delivery and quality feedback.

### About Exchange Language Services Inc.
ELS is a professional translation and interpretation company based in Ontario, Canada, with CIC (Ontario Ministry of Citizenship & Immigration Canada) approved certificates. The company specializes in providing secure, private interpretation services between English and many languages including Arabic, Bengali, Chinese (Mandarin/Cantonese), French, German, Hindi, Japanese, Korean, Portuguese, Russian, Spanish, and Vietnamese.

**Company Information:**
- **Website**: www.exls.ca
- **Phone**: 613.305.4552  
- **Email**: info@exls.ca
- **Business Hours**: Monday-Friday 8:30 AM - 4:00 PM, Weekends/Emergency On-Call
- **Established**: 2016

## System Architecture

### Three User Roles
- **Admin**: System management, user approval, request assignment, analytics
- **Client**: Organizations/agencies requesting services (formerly "agent")  
- **Interpreter/Translator**: Service providers for interpretation and translation

### Service Types

#### Translation (Document-based)
- **Language Support**: Any language pair
- **Request Format**: `T(#)(Month-MM)(Year-YYYY)` (e.g., T1072025)
- **Platform**: Primarily web-based for document upload/management

#### Interpretation (Real-time)
All interpretation services support English/French ↔ any language:

1. **In-person**: `IN(#)(Month-MM)(Year-YYYY)`
2. **Scheduled Phone**: `SP(#)(Month-MM)(Year-YYYY)` 
3. **Instant Virtual**: `IV(#)(Month-MM)(Year-YYYY)`

### Platform Distribution

#### Web Application (Complete Feature Set)
- **Admin Dashboard**: Full system management and oversight
- **Client Portal**: All service requests, document upload, tracking
- **Interpreter/Translator Portal**: Job management, document translation, availability

#### Mobile Applications (Client + Interpreter/Translator)
- **Technology**: Kotlin Multiplatform + Compose Multiplatform
- **Client App**: All service types, real-time tracking, instant requests
- **Interpreter App**: Job board, session management, instant virtual alerts

## Technology Stack

### Backend
- **Framework**: NestJS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Clerk
- **Real-time**: Supabase real-time subscriptions
- **File Storage**: Supabase Storage
- **Notifications**: Push notifications + WebSocket

### Web Frontend  
- **Framework**: React
- **Styling**: Modern component library
- **Real-time**: Supabase client
- **Video Calling**: WebRTC integration

### Mobile Applications
- **Core**: Kotlin Multiplatform
- **UI**: Compose Multiplatform  
- **Networking**: Ktor client
- **Local Storage**: SQLDelight
- **Platform Features**: Native implementations

## Key Features

### Manual Matching System
- No AI matching - interpreters accept jobs manually
- Real-time job board for available requests
- First-come-first-served for instant virtual interpretation

### Real-time Communication
- Instant notifications for new requests
- Live status updates across platforms
- Video/audio calling for virtual interpretation
- Check-in/check-out tracking with GPS verification

### Document Management
- Secure file upload for translation requests
- 2-month automatic deletion policy
- Support for PDF, Word, JPG formats

### Analytics & Invoicing
- Monthly payment calculations based on session times
- Yearly T4A tax report generation
- Request filtering by agent, language, date
- Performance tracking and analytics

## Business Rules

### Service Constraints
- **Translation**: Any language pair, document required
- **Interpretation**: English/French source languages only
- **Minimum Duration**: 1 hour for all interpretation services
- **Increments**: 30-minute increments for duration
- **Cancellation**: 24/48 hours notice required

### User Management
- All client and interpreter accounts require admin approval
- Admin can reassign interpreters at any time
- Real-time availability management for interpreters

### Payment Model
- No payment processing through platform
- Invoice generation available
- Rates calculated based on actual session time (check-in to check-out)

## Project Structure

```
lingualink/
├── docs/                    # Documentation
├── backend/                 # NestJS + Supabase
├── web-app/                # React application
├── mobile/                 # Kotlin Multiplatform
│   ├── shared/             # Shared business logic
│   ├── composeApp/         # Shared UI
│   ├── androidApp/         # Android platform
│   └── iosApp/             # iOS platform
└── shared/                 # Common types/utilities
```

## Getting Started

1. **Backend Setup**: Configure NestJS with Supabase
2. **Web Application**: React development environment
3. **Mobile Setup**: Kotlin Multiplatform development environment
4. **Database**: Initialize Supabase schema and real-time subscriptions

## Documentation

### Core Technical Documentation
- [Web Application Documentation](./docs/web-application.md) - Complete React frontend implementation guide
- [Mobile Application Documentation](./docs/mobile-application.md) - Kotlin Multiplatform mobile apps
- [Backend API Documentation](./docs/backend-api.md) - NestJS + Supabase backend implementation
- [Database Schema](./docs/database-schema.md) - Complete PostgreSQL database design

### Business & Planning Documentation
- [Business Requirements](./docs/business-requirements.md) - Operational policies, pricing structures, and business rules
- [Implementation Plan](./docs/implementation-plan.md) - 16-week development roadmap with budget ($252k)
- [User Flows](./docs/user-flows.md) - Comprehensive user journey documentation for all roles
- [Project Checklist](./docs/project-checklist.md) - Complete development and launch validation checklist
- [Landing Page Content](./docs/landing-page-content.md) - ELS brand identity and public-facing content guide

### Technical Specifications & Architecture
- [Technical Specifications](./docs/technical-specifications.md) - Performance, security, and infrastructure requirements
- [Platform Architecture Summary](./docs/platform-architecture-summary.md) - Executive overview and complete system architecture

## Development Timeline

**Total Duration**: 14-18 weeks

- **Phase 1**: Foundation & Core Features (6-8 weeks)
- **Phase 2**: Advanced Features & Integration (6-8 weeks)  
- **Phase 3**: Polish & Deployment (2-4 weeks)

## Support

For questions and support, please refer to the documentation in the `/docs` folder or contact the development team. 