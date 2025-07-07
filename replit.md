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

- **July 7, 2025**: Fixed applications page 500 error for manager access (IN PROGRESS)
  - Identified deployment routing issue: `/api/applications` endpoint not receiving requests on deployed version
  - Created new `/api/applications/all` endpoint that works in development but still fails on deployment
  - Server logs show endpoint working locally (22 applications returned for manager joshdelmonte)
  - Deployed version at permit-creator.replit.app still returns 500 errors despite successful local testing
  - Issue appears to be deployment environment differences rather than code logic

- **July 2, 2025**: Simplified roles page by removing redundant sections (COMPLETED)
  - Removed "Detailed Permissions Matrix" table section as it duplicated information from role cards
  - Removed "Role Descriptions" section which was redundant with card descriptions
  - Kept only the main role cards section showing Staff, Manager, and Admin roles with their permissions
  - Updated navigation to show "Insurance Matrix" instead of "Insurance Requirements"
  - Page now focuses on essential role information without repetitive content

- **July 1, 2025**: Converted insurance requirements page to read-only chart display (COMPLETED)
  - Removed all editing functionality including Add Activity button and delete actions
  - Created visual tier legend with four color-coded cards showing risk levels and coverage amounts
  - Redesigned table with color-coded tier badges for better visual organization
  - Simplified layout from editable interface to clean, professional chart display
  - Activities now sorted by tier (highest to lowest) then alphabetically for consistent organization
  - Made page accessible to all staff levels (not just managers) since staff need to reference insurance requirements when processing applications
  - Moved navigation link from "Administration" to new "Reference" section in sidebar

- **July 1, 2025**: Fixed duplicate three-dot menus on application cards (COMPLETED)
  - Consolidated two separate three-dot menus into single unified menu
  - All application cards now show exactly one three-dot menu with contextual options
  - Delete option available for fully paid applications as requested
  - Menu includes View Details, Send Message, Add Note, and conditional Approve/Disapprove/Delete options

- **July 1, 2025**: Comprehensive terminology standardization from "fee" to "cost" completed (COMPLETED)
  - Updated all server backend routes to use costBreakdown instead of feeBreakdown
  - Modified approval email templates to use applicationCost, permitCost, and locationCost
  - Changed email service interface to use consistent costBreakdown structure
  - Server routes now calculate and pass costBreakdown to email service correctly
  - All variables in routes.ts updated: applicationCost, permitCost, locationCost, locationName
  - Email template displays properly formatted cost breakdown in approval notifications

- **July 1, 2025**: Fixed currency formatting bug displaying $0.000 instead of $0.00 (COMPLETED)
  - Updated formatCurrency functions in applications page and dashboard to properly handle zero values
  - Changed logic from string matching to numeric comparison (num <= 0) for better reliability
  - Removed duplicate implementations and consolidated currency formatting logic
  - Zero amounts now consistently display as $0.00 across all application fee displays
  - Debug logging confirmed function works correctly but browser displayed cached/incorrect values initially

- **July 1, 2025**: Implemented comprehensive multiple event dates support and approval tracking (COMPLETED)
  - Updated database schema from single event_date to event_dates JSON array for multiple date selection
  - Enhanced all UI components to properly display multiple dates with comma-separated formatting
  - Updated dashboard, applications page, calendar, and application cards to handle multiple event dates
  - Created formatEventDates helper function used consistently across all components
  - Modified calendar page to show events on all selected dates rather than just one date
  - Updated approval email system to handle multiple dates in notifications
  - Enhanced application details dialogs to show "Event Date" vs "Event Dates" dynamically
  - Fixed all TypeScript errors related to eventDate/eventDates field transition
  - Calendar now creates separate calendar entries for each selected date of multi-date events
  - Fixed calendar events to appear only on specified dates instead of spanning multiple days
  - Synchronized calendar status display with applications page to show "Completed" for fully paid applications
  - Added approval tracking with approvedBy and approvedAt fields to record who approved applications
  - Application details now display who approved each application and when

- **June 30, 2025**: Implemented automatic cleanup system for unpaid applications (COMPLETED)
  - Added automatic deletion of unpaid applications after 24 hours as designed
  - Created cleanupOldUnpaidApplications() function that runs on server startup and every hour
  - System identifies pending applications that are unpaid and older than 24 hours for deletion
  - Cleanup process logs deletions for monitoring and debugging purposes
  - Enhanced unpaid application management with "Will be deleted in 24 hours" warning messages
  - Periodic cleanup runs every 3600000 milliseconds (1 hour) to maintain database hygiene
  - Initial cleanup runs on server startup to immediately remove any existing old unpaid applications

- **June 30, 2025**: Removed invoices system entirely and simplified application processing (COMPLETED)
  - Deleted invoices page and all related routes/components as applications page shows all needed invoice information
  - Removed invoices table from database schema and storage methods
  - Updated approval process to calculate fees dynamically without creating database invoice records
  - Email notifications now include fee breakdown (application + permit + location costs) calculated on-demand
  - Simplified system architecture by removing redundant invoice tracking since applications page displays payment status
  - Enhanced location fee integration using park_locations table with proper database IDs instead of JSON arrays
  - Approval emails include itemized cost breakdown showing permit fees, location fees, and total amounts
  - Updated approval email template to show detailed fee breakdown including application, permit, and location fees
  - Modified approval route to calculate total costs including location fees from park_locations table
  - Enhanced invoice creation to include all applicable fees (application + permit + location) in total amount
  - Email now displays itemized breakdown with location name when location fees apply
  - Fixed location mapping system by implementing proper park_locations table integration
  - Resolved invoice display issues by updating approved-with-invoices endpoint to fetch both approved and completed applications

- **June 27, 2025**: Enhanced application search functionality and email system configuration (COMPLETED)
  - Added search by application number capability to applications page
  - Updated search placeholder to show all searchable fields (application number, event title, name, email)
  - Fixed SendGrid email service configuration with new API key
  - Configured approval emails to send from kyannemyler@parkspass.org with proper error handling
  - Email notifications now working for application approvals with detailed logging

- **June 24, 2025**: Enhanced email templates and fully paid application styling (COMPLETED)
  - Redesigned approval email template using professional HTML structure for better email client compatibility
  - Applied sophisticated color scheme and table-based layout to resolve rendering issues in Gmail and other clients
  - Enhanced visual styling throughout system to prominently highlight fully paid applications
  - Added distinctive green gradient borders and backgrounds for applications with all payments complete
  - Implemented bold "FULLY PAID" status badges with green background and rounded styling
  - Applied consistent fully paid styling across dashboard, applications page, and invoices page
  - Payment status logic now checks all fees (application, permit, location) to determine full payment status
  - Applications with completed payments now have thick green border, gradient background, and enhanced shadows
  - Fixed runtime error with undefined fullyPaid variable in applications page rendering
  - Complete insurance document system and unpaid applications management from earlier today

- **June 23, 2025**: Simplified insurance requirements from tier system to checkbox and fixed fee display (COMPLETED)
  - Simplified insurance from complex tier system (0-3) to simple required/not required checkbox
  - Updated database schema from insurance_tier to insurance_required (boolean field)
  - Modified permit template forms to use checkbox instead of dropdown for insurance
  - Fixed fee display spacing in application details to remove large gaps between labels and amounts
  - Updated image upload to store full URLs instead of relative paths for cross-site access
  - Enhanced location handling to support custom text locations when users select "other"

- **June 23, 2025**: Image upload functionality and enhanced card UI for permit templates (COMPLETED)
  - Added ImageUpload component with drag-and-drop support and 10MB file size limit
  - Updated database schema to include imagePath field for permits table
  - Added server endpoints for image upload handling with authentication
  - Modified both create and edit permit template forms to include image upload capability
  - Created multer middleware for secure file uploads to uploads/ directory
  - Images are served via /uploads route with proper static file serving
  - Fixed PUT route for permit templates to include imagePath field in updates
  - Added image display on permit template cards (left side) with proper error handling
  - Enhanced edit form to display existing uploaded images with click-to-replace functionality
  - Single image upload per template with visual "Click to Replace" indicator
  - Implemented uniform card heights (160px) with full-height image cropping using object-cover
  - Added click-to-expand functionality for all cards showing detailed information
  - Simplified compact view to show only permit type and park name
  - Images now properly fill card height and crop excess width for consistent layout
  - Added proper spacing between image section and expanded details
  - Removed duplicate insurance text for cleaner information display

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