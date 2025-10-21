# Research: Personal Assistant Discord Bot

**Created**: 2025-10-21  
**Feature**: Personal Assistant Discord Bot  
**Purpose**: Technical research and decisions for Deno Deploy implementation with embedded data

## Key Technical Decisions

### Decision 1: Deno Deploy vs Traditional Server Deployment

**Decision**: Deploy on Deno Deploy instead of traditional Docker containers

**Rationale**: 
- Serverless edge deployment provides automatic scaling and global distribution
- Eliminates infrastructure management overhead
- Native Deno support with optimized performance
- Built-in HTTPS and custom domain support
- Cost-effective for moderate traffic patterns
- Simplified deployment pipeline with git integration

**Alternatives considered**:
- Self-hosted Docker containers: Requires more infrastructure management
- Vercel/Netlify: Limited Deno support, primarily Node.js focused
- Railway/Render: Traditional server deployment, more complex than needed

**Implementation Impact**:
- Must design stateless architecture
- Use Deno KV for session management and temporary data
- Implement graceful handling of cold starts
- Optimize for edge runtime constraints

### Decision 2: Embedded Data Modules vs External Database

**Decision**: Use embedded TypeScript modules for reminders and patterns instead of external database

**Rationale**:
- Simplifies deployment to Deno Deploy (no database connection required)
- Enables easy editing and version control of patterns and reminder templates
- Reduces complexity and external dependencies
- Faster read access for pattern matching
- Eliminates database connection overhead and potential failures
- n8n already handles persistent user prompt data

**Alternatives considered**:
- PostgreSQL/SQLite: Adds complexity and connection management
- Deno KV only: Limited querying capabilities for complex operations
- JSON files: Less type safety and harder to validate

**Implementation Impact**:
- Design data modules with TypeScript interfaces for type safety
- Implement atomic updates for data modifications
- Use Deno KV for runtime state that needs persistence across restarts
- Create migration utilities for data format changes

### Decision 3: Unified Application vs Microservices

**Decision**: Single Fresh application with integrated Discord bot functionality

**Rationale**:
- Simplifies deployment to Deno Deploy (single application)
- Reduces operational complexity
- Enables shared state and easier testing
- Better suited for moderate scale requirements
- Leverages Fresh's API routes for webhook handling

**Alternatives considered**:
- Separate Discord bot and web services: More complex deployment
- Worker-based architecture: Overkill for current requirements

**Implementation Impact**:
- Discord bot runs as background process within Fresh application
- API routes handle webhook endpoints and Discord interactions
- Shared utilities and types across web and bot functionality

## Technical Architecture Decisions

### Data Storage Strategy

**Reminders Storage**:
```typescript
// data/reminders.ts
export interface Reminder {
  id: string;
  creatorId: string;
  targetUserId: string;
  secondaryUserId?: string;
  message: string;
  scheduledTime: Date;
  timeoutMinutes: number;
  status: ReminderStatus;
}

// Runtime state stored in Deno KV
// Static templates/configuration in TypeScript modules
```

**Pattern Storage**:
```typescript
// data/patterns.ts
export interface TextPattern {
  id: string;
  pattern: string;
  response: string;
  matchType: 'exact' | 'contains' | 'regex';
  priority: number;
  isActive: boolean;
}

// Patterns defined as exportable arrays for easy editing
export const defaultPatterns: TextPattern[] = [
  // Easily editable pattern definitions
];
```

### Deno Deploy Optimization

**Cold Start Mitigation**:
- Minimize initial imports and lazy load heavy dependencies
- Use dynamic imports for Discord client initialization
- Implement health check endpoints to keep instance warm

**Edge Runtime Constraints**:
- No long-running background processes (use scheduled functions)
- Stateless request handling with KV for state persistence
- Optimize bundle size and startup time

**Resource Management**:
- Use Deno KV for session storage and temporary data
- Implement proper cleanup for scheduled reminders
- Handle Discord connection lifecycle properly

### Security Considerations

**Webhook Security**:
- Implement signature verification for n8n webhooks
- Validate all incoming Discord payloads
- Rate limiting for webhook endpoints

**Data Protection**:
- Discord OAuth2 for web interface authentication
- Secure session management with Deno KV
- Input validation and sanitization for all user data

**Deployment Security**:
- Environment variable management on Deno Deploy
- Secure Discord bot token handling
- HTTPS enforcement and CORS configuration

## Integration Patterns

### n8n Webhook Integration

**Approach**: Direct HTTP POST to existing n8n webhook endpoint
- Simple integration with existing n8n workflows
- No changes required to n8n setup
- Leverage existing LLM processing capabilities

**Payload Format**:
```typescript
interface WebhookPayload {
  messageId: string;
  channelId: string;
  author: DiscordUser;
  content: string;
  timestamp: string;
  guildId?: string;
  mentionType: 'direct_mention' | 'reply' | 'dm';
}
```

### Discord API Integration

**Bot Architecture**:
- Single Discord client instance within Fresh application
- Event-driven message handling with webhook forwarding
- Rate limiting compliance with Discord API limits

**Message Processing Flow**:
1. Discord message received
2. Check for mention or pattern match
3. If mention: Forward to n8n webhook
4. If pattern match: Send configured response
5. Log interaction for monitoring

### Fresh Web Interface Integration

**API Routes**:
- `/api/reminders/*` - Reminder CRUD operations
- `/api/patterns/*` - Pattern management
- `/api/discord/*` - Discord webhook handlers
- `/api/auth/*` - OAuth2 authentication

**Data Flow**:
- Web interface modifies embedded data modules
- Changes persisted through API endpoints
- Runtime state synchronized with Deno KV

## Performance Considerations

### Scalability Design

**Concurrent Operations**:
- Reminder delivery using Promise.all for batch operations
- Pattern matching with efficient regex compilation
- Webhook retry logic with exponential backoff

**Memory Management**:
- Embedded data loaded once at startup
- Efficient pattern matching algorithms
- Proper cleanup of Discord event handlers

**Edge Optimization**:
- Static asset optimization for Fresh
- Minimal JavaScript bundle size
- Efficient server-side rendering

### Monitoring and Observability

**Logging Strategy**:
- Structured logging with JSON format
- Discord interaction tracking
- Webhook delivery monitoring
- Performance metrics collection

**Error Handling**:
- Graceful Discord API error handling
- Webhook retry with exponential backoff
- User-friendly error messages in web interface

**Health Monitoring**:
- Discord bot connection status
- Webhook endpoint availability
- Reminder delivery success rates

## Development Workflow

### Local Development

**Setup Requirements**:
- Deno 2.0+ installation
- Discord bot token for testing
- n8n webhook endpoint (or mock server)

**Development Scripts**:
- Hot reload for Fresh development
- Discord bot testing utilities
- Webhook testing tools

### Deployment Pipeline

**Deno Deploy Integration**:
- Git-based deployment from main branch
- Environment variable configuration
- Automatic HTTPS and domain setup

**Testing Strategy**:
- Unit tests for individual modules
- Integration tests for Discord interactions
- Contract tests for webhook payloads

This research establishes the technical foundation for implementing a Deno Deploy-optimized Discord bot with embedded data storage, providing a simpler alternative to traditional database-backed applications while maintaining functionality and performance requirements.