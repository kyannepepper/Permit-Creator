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

- **June 20, 2025**: Insurance document handling and JSONB data parsing (COMPLETED)
  - Enhanced insurance display system to handle complex JSONB data structure in database
  - Added support for insurance document download links when documents are uploaded
  - Created getInsuranceInfo() helper function to parse insurance status and document paths
  - Insurance now displays carrier information and "View Document" links to parkspass-sups.replit.app
  - Fixed location mapping system to handle large location_id numbers that don't correspond to array indices
  - Updated both applications page and dashboard with comprehensive insurance and document display
  - Insurance documents are accessible via cross-domain links to the main application website

- **June 20, 2025**: Application card UI improvements and location system updates (COMPLETED)
  - Removed Setup Time, Start Time, End Time, and Amount Paid fields from event information sections
  - Updated insurance information to use database column (applications.insurance boolean field)
  - Fixed location mapping to use applications.locationId field from database
  - Added location fees display in permit information when applicable
  - Location fees now properly calculated from parks.locations JSON data structure
  - Updated total fees calculation to include location fees alongside application and permit fees
  - Cleaned up all references to removed database fields (specialRequests, attendees)

- **June 20, 2025**: Applications API database schema fixes and cleanup (COMPLETED)
  - Fixed database schema mismatch causing "Failed to fetch applications" errors
  - Cleaned up applications table by removing unwanted columns: special_requests, additional_requirements, setup_time, start_time, attendees, end_time
  - Kept essential columns: insurance (boolean) and all core application fields
  - Applications API now successfully returns 2 pending applications from authentic database
  - Dashboard statistics and pending applications endpoints fully operational
  - Fixed React rendering error preventing dashboard display

- **June 20, 2025**: Database connection and mobile navigation fixes (COMPLETED)
  - Switched from in-memory storage back to PostgreSQL database with real data
  - Optimized database connection pooling to resolve Neon serverless connection limits
  - Fixed "Applications" link in mobile nav to point to `/applications` instead of `/permits`
  - Enhanced mobile nav to include all main sections: Dashboard, Applications, Permits, Parks, Reports
  - App now displays authentic parks data: Anasazi State Park, Antelope Island State Park, Sand Hollow State Park
  - Completed missing storage methods for permit templates and applications API endpoints
  - Enhanced mobile navigation with expandable "More" menu to access calendar, view permits, add park, invoices, staff accounts, and roles
  - Updated calendar to only show three available statuses: pending, approved, and disapproved (removed "under review")

- **June 19, 2025**: Insurance checkbox update and navigation fixes (COMPLETED)
  - Replaced complex insurance dropdown with simple checkbox in both permit forms
  - Updated data types to handle boolean values correctly for insurance field
  - Fixed "Create Permit" button navigation from View Permits tab to go to correct permit creation form
  - Resolved data type validation errors preventing permit updates (NaN values in fees)
  - Both forms now have identical single-column layouts with matching styling

- **June 19, 2025**: Standardized permit form layouts and fixed sidebar navigation (COMPLETED)
  - Made permit creation and editing forms visually identical with single-column layout
  - Both forms now use same field labels, spacing, and styling
  - Fixed sidebar highlighting to show only "View Permits" when editing permits
  - Removed dynamic "Edit Application" and "Edit Permit" tabs from sidebar
  - Fixed SelectItem error by changing empty string value to "none" for insurance dropdown
  - Updated form logic to properly handle insurance field conversion between display and database values

- **June 19, 2025**: Updated permit editing form and parks table view (COMPLETED)
  - Rebuilt permit editing page to use same comprehensive form as permit creation
  - Pre-populates all fields with existing permit data for editing
  - Includes all form sections: permit type, park, fees, deposit, max people, insurance, terms
  - Updated parks table view to show only Name, Location, and Actions columns
  - Removed Description and Status columns from parks display table
  - Cleaned up unused status handling code and imports

- **June 19, 2025**: Removed description and status fields from parks (COMPLETED)
  - Dropped description and status columns from parks database table
  - Updated shared schema to remove these fields from parks table definition
  - Removed description and status fields from park creation and editing forms
  - Updated server routes to remove status field references
  - Simplified park data structure to only include: id, name, location, locations array, waiver text

- **June 19, 2025**: Simplified permits database schema (COMPLETED)
  - Removed unnecessary fields from permits table: permit_number, location, permittee_name, permittee_email, permittee_phone, activity, description, participant_count, start_date, end_date, special_conditions, status, issue_date, created_at, created_by, updated_at, updated_by, is_template, template_data
  - Permits table now only contains essential form input fields: id, permit_type, park_id, application_fee, permit_fee, refundable_deposit, max_people, insurance_required, terms_and_conditions
  - Updated storage methods to work with simplified schema
  - Fixed all server routes to handle new simplified permit structure
  - Database migration completed successfully

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