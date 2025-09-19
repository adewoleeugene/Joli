# Multi-Port Architecture Design

## Overview
This document outlines the multi-port architecture for the Joli Events platform, providing dedicated services for different user roles with proper security and isolation.

## Current Architecture Analysis
- **Client (Users)**: Port 3000 - General user interface
- **Server**: Port 5002 - Unified backend API

## Proposed Multi-Port Architecture

### Frontend Services
| Service | Port | Purpose | Target Users |
|---------|------|---------|-------------|
| User Portal | 3000 | General user interface | Regular users |
| Organizer Portal | 3001 | Event organizer interface | Event organizers |


### Backend Services
| Service | Port | Purpose | Security Level |
|---------|------|---------|---------------|
| User API | 5000 | User-specific endpoints | Standard |
| Organizer API | 5001 | Organizer-specific endpoints | Enhanced |

| Shared Services | 5003 | Common services (auth, websockets) | Variable |

## Security Configuration

### CORS Policy
- Each backend service only accepts requests from its designated frontend
- Cross-origin requests between different role services are blocked
- Shared services have controlled access based on authentication

### Authentication & Authorization
- Role-based middleware on each service
- JWT tokens with role-specific claims
- Service-to-service authentication for internal communication

### Rate Limiting
- Different rate limits per service based on usage patterns
- Stricter limits on organizer endpoints for management actions
- Progressive rate limiting for organizer services

## Implementation Plan

1. **Create Organizer Frontend Service** (Port 3001)
   - Duplicate client structure
   - Customize for organizer-specific features
   - Configure dedicated API endpoints

2. **Split Backend Services**
   - User API (5000): Events, games, submissions
   - Organizer API (5001): Event management, analytics
   - Shared Services (5003): Authentication, websockets
   - Shared Services (5003): Authentication, websockets

3. **Update Configuration**
   - Environment variables for each service
   - Proxy configurations
   - Security policies

4. **Documentation & Testing**
   - Service endpoint documentation
   - Security verification
   - Performance testing

## Benefits

- **Security**: Role-based service isolation
- **Scalability**: Independent service scaling
- **Maintainability**: Clear separation of concerns
- **Performance**: Optimized services per role
- **Monitoring**: Service-specific metrics and logging