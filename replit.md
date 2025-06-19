# ParkPass Special Use Permits System

## Overview

ParkPass is a comprehensive special use permit management system designed for state parks. It provides a full-stack solution for managing permit applications, approvals, payments, and administration. The system supports both public-facing permit applications and internal staff management interfaces.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite for development and production builds
- **Routing**: Wouter for client-side routing
- **UI Library**: Radix UI components with Tailwind CSS styling
- **State Management**: TanStack Query for server state, React Context for global state
- **Form Handling**: React Hook Form with Zod validation
- **Styling**: Tailwind CSS with custom theming via shadcn/ui components

### Backend Architecture
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js for REST API
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with local strategy and session-based auth
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple

### Data Storage Solutions
- **Primary Database**: PostgreSQL (Neon serverless)
- **ORM**: Drizzle with schema-first approach
- **Session Store**: PostgreSQL tables for user sessions
- **Migrations**: Drizzle Kit for database schema management

## Key Components

### User Management
- Role-based access control (Staff, Manager, Admin)
- Session-based authentication with secure password hashing
- Park-specific user assignments for staff access control

### Permit System
- Template-based permit creation with customizable fields
- Location-specific configurations with availability scheduling
- Dynamic pricing based on park and permit type
- Insurance tier requirements based on activity types

### Application Processing
- Multi-step application workflow (Pending → Under Review → Approved/Disapproved)
- Email notifications for status changes
- Payment integration with Stripe for fees
- Document and requirement management

### Parks Management
- Multi-park support with individual configurations
- Location and facility management within parks
- Staff assignment to specific parks
- Blackout date management for unavailable periods

### Financial Management
- Stripe integration for payment processing
- Invoice generation and tracking
- Configurable application and permit fees
- Revenue reporting and analytics

## Data Flow

1. **Application Submission**: Public users submit permit applications through forms
2. **Staff Review**: Park staff review applications and can request additional information
3. **Approval Process**: Applications move through approval workflow with email notifications
4. **Payment Processing**: Approved applications generate invoices processed through Stripe
5. **Permit Issuance**: Paid applications result in issued permits with tracking numbers

## External Dependencies

### Payment Processing
- **Stripe**: Credit card processing and subscription management
- Product IDs generated dynamically based on park and fee structure

### Email Services
- **SendGrid**: Transactional email delivery for notifications
- Template-based emails for approval, disapproval, and payment confirmations

### AI Integration
- **OpenAI DALL-E**: Image generation for marketing and documentation purposes
- API key required for image generation features

### Development Tools
- **Replit**: Cloud development environment with PostgreSQL provisioning
- **Neon**: Serverless PostgreSQL hosting for production

## Deployment Strategy

### Development Environment
- Runs on Replit with hot-reload via Vite
- PostgreSQL database provisioned automatically
- Environment variables managed through Replit secrets

### Production Build
- Vite builds client-side assets to `dist/public`
- esbuild bundles server code for Node.js execution
- Single process serves both API and static assets

### Environment Configuration
- `DATABASE_URL`: PostgreSQL connection string
- `SENDGRID_API_KEY`: Email service authentication
- `OPENAI_API_KEY`: AI image generation
- `VITE_STRIPE_PUBLIC_KEY`: Client-side payment processing
- `SESSION_SECRET`: Secure session encryption

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

- **June 19, 2025**: Major permit system restructure (COMPLETED)
  - Replaced complex three-step permit template creation with simplified single-form approach
  - Updated database schema: removed templateData field, added dedicated fields (applicationFee, permitFee, refundableDeposit, maxPeople, insuranceRequired, locations as JSON array, termsAndConditions)
  - Created new simplified permit creation form with predefined fee options (App: $0/$10/$50, Permit: $35/$100/$250/$350)
  - Added Terms and Conditions field for permit-specific requirements
  - Restructured all server routes to handle new permit structure
  - Locations now stored as simple array of names instead of complex objects with availability/pricing
  - Added API endpoint for simplified permit template creation (/api/permit-templates/simple)

- **June 17, 2025**: Calendar and invoice fixes, database reset
  - Fixed calendar to properly display events using eventDate field mapping with color-coded status indicators
  - Added clickable calendar events with detailed application information dialogs
  - Corrected invoice card dialog data structure to display proper applicant and event information
  - Enhanced calendar with park and status filtering capabilities
  - Database reset: Cleared all applications, permits, and invoices while preserving parks data for fresh start
  - Critical currency display fixes and permit template improvements from earlier today
  - Fixed invoice price display issue where amounts showed extra zeros ($3000 instead of $30)
  - Standardized currency formatting across all components to properly convert cents to dollars

- **June 16, 2025**: Major date picker refactoring and UI improvements
  - Completely refactored date picker implementation from complex form bindings to local state management
  - Fixed critical calendar selection issues where dates wouldn't register properly
  - Resolved "No end date" functionality that was previously broken
  - Fixed weekly repetition days saving and restoring when editing locations
  - Simplified availability configuration with cleaner local state approach
  - Enhanced custom fields organization and layout in Additional Options section
  - Updated delete button styling to red outlined design with hover effects
  - Improved location form submission to properly handle date picker state values
  - Fixed TypeScript errors in permit template creation and editing pages

## Changelog

Changelog:
- June 16, 2025. Initial setup