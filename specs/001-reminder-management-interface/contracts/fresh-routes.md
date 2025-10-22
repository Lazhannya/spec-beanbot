# Fresh Framework Route Contracts

## Route Structure

```
routes/
├── index.tsx                    # Dashboard home page
├── admin/
│   ├── reminders/
│   │   ├── index.tsx           # Reminder list page
│   │   ├── new.tsx             # Create reminder form
│   │   └── [id]/
│   │       ├── index.tsx       # Reminder detail page
│   │       └── edit.tsx        # Edit reminder form
│   └── settings.tsx            # Admin settings
├── auth/
│   ├── login.tsx               # Login page
│   ├── callback.tsx            # OAuth callback handler
│   └── logout.tsx              # Logout handler
└── api/
    ├── reminders/
    │   ├── index.ts            # List/Create reminders
    │   ├── [id]/
    │   │   ├── index.ts        # Get/Update/Delete reminder
    │   │   └── test.ts         # Test reminder trigger
    │   └── status.ts           # Real-time status updates
    ├── auth/
    │   ├── session.ts          # Session management
    │   └── validate.ts         # Session validation
    └── webhook/
        └── discord.ts          # Discord response webhook
```

## Page Component Contracts

### Dashboard (`/`)
```typescript
interface DashboardPageProps {
  reminderStats: {
    pending: number;
    sent: number;
    acknowledged: number;
    failed: number;
  };
  recentReminders: Reminder[];
  adminUser: AdminUser;
}

export default function Dashboard(props: DashboardPageProps): JSX.Element;
```

### Reminder List (`/admin/reminders`)
```typescript
interface ReminderListProps {
  reminders: Reminder[];
  pagination: {
    total: number;
    offset: number;
    limit: number;
    hasMore: boolean;
  };
  filters: {
    status?: ReminderStatus;
    userId?: string;
  };
}

export default function ReminderList(props: ReminderListProps): JSX.Element;
```

### Create Reminder (`/admin/reminders/new`)
```typescript
interface CreateReminderProps {
  defaultValues?: Partial<CreateReminderRequest>;
  validationErrors?: Record<string, string>;
}

export default function CreateReminder(props: CreateReminderProps): JSX.Element;
```

### Reminder Detail (`/admin/reminders/[id]`)
```typescript
interface ReminderDetailProps {
  reminder: Reminder;
  canEdit: boolean;
  canTest: boolean;
}

export default function ReminderDetail(props: ReminderDetailProps): JSX.Element;
```

## Handler Function Contracts

### API Route Handlers
```typescript
// GET /api/reminders
export async function handler(
  req: Request,
  ctx: HandlerContext
): Promise<Response> {
  // Query parameters: status, userId, limit, offset
  // Returns: { reminders: Reminder[], total: number, hasMore: boolean }
}

// POST /api/reminders
export async function handler(
  req: Request,
  ctx: HandlerContext
): Promise<Response> {
  // Body: CreateReminderRequest
  // Returns: Reminder (201) or ErrorResponse (400)
}

// GET /api/reminders/[id]
export async function handler(
  req: Request,
  ctx: HandlerContext<{ id: string }>
): Promise<Response> {
  // Path parameter: id
  // Returns: Reminder (200) or ErrorResponse (404)
}

// PUT /api/reminders/[id]
export async function handler(
  req: Request,
  ctx: HandlerContext<{ id: string }>
): Promise<Response> {
  // Path parameter: id
  // Body: UpdateReminderRequest
  // Returns: Reminder (200) or ErrorResponse (400/404)
}

// DELETE /api/reminders/[id]
export async function handler(
  req: Request,
  ctx: HandlerContext<{ id: string }>
): Promise<Response> {
  // Path parameter: id
  // Returns: 204 or ErrorResponse (400/404)
}

// POST /api/reminders/[id]/test
export async function handler(
  req: Request,
  ctx: HandlerContext<{ id: string }>
): Promise<Response> {
  // Path parameter: id
  // Body: TestReminderRequest
  // Returns: TestExecution (200) or ErrorResponse (400/404)
}
```

### Page Route Handlers
```typescript
// GET / (Dashboard)
export async function handler(
  req: Request,
  ctx: HandlerContext
): Promise<Response> {
  // Requires authentication
  // Returns: DashboardPageProps
}

// GET /admin/reminders (Reminder List)
export async function handler(
  req: Request,
  ctx: HandlerContext
): Promise<Response> {
  // Query parameters: status, userId, page
  // Requires authentication
  // Returns: ReminderListProps
}

// GET /admin/reminders/new (Create Form)
export async function handler(
  req: Request,
  ctx: HandlerContext
): Promise<Response> {
  // Requires authentication
  // Returns: CreateReminderProps
}

// POST /admin/reminders/new (Form Submission)
export async function handler(
  req: Request,
  ctx: HandlerContext
): Promise<Response> {
  // Body: FormData with reminder fields
  // Requires authentication
  // Returns: Redirect to reminder detail or form with errors
}
```

## Middleware Contracts

### Authentication Middleware
```typescript
interface AuthMiddleware {
  (req: Request, ctx: HandlerContext): Promise<Response | void>;
}

interface AuthenticatedRequest extends Request {
  adminUser: AdminUser;
  sessionId: string;
}
```

### Session Management
```typescript
interface SessionManager {
  create(adminUser: AdminUser): Promise<string>;
  validate(sessionId: string): Promise<AdminUser | null>;
  destroy(sessionId: string): Promise<void>;
  refresh(sessionId: string): Promise<string>;
}
```

### Discord Integration
```typescript
interface DiscordClient {
  sendDirectMessage(userId: string, content: string): Promise<boolean>;
  validateUser(userId: string): Promise<boolean>;
  getUserInfo(userId: string): Promise<{ username: string; discriminator: string } | null>;
}
```

## Component Props Contracts

### Shared Components
```typescript
// Reminder status badge
interface StatusBadgeProps {
  status: ReminderStatus;
  size?: 'sm' | 'md' | 'lg';
}

// Reminder form
interface ReminderFormProps {
  initialData?: Partial<Reminder>;
  onSubmit: (data: CreateReminderRequest | UpdateReminderRequest) => void;
  validationErrors?: Record<string, string>;
  isLoading?: boolean;
}

// Test trigger button
interface TestTriggerProps {
  reminderId: string;
  disabled?: boolean;
  onTestComplete: (result: TestExecution) => void;
}

// Response log display
interface ResponseLogProps {
  responses: ResponseLog[];
  showUsernames?: boolean;
}
```

## Form Validation Contracts

### Client-side Validation
```typescript
interface FormValidator<T> {
  validate(data: T): ValidationResult;
}

interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

// Reminder form validation
const reminderValidator: FormValidator<CreateReminderRequest> = {
  validate(data) {
    const errors: Record<string, string> = {};
    
    if (!data.content || data.content.length === 0) {
      errors.content = "Message content is required";
    } else if (data.content.length > 2000) {
      errors.content = "Message content must be under 2000 characters";
    }
    
    if (!data.targetUserId || !/^[0-9]{17,19}$/.test(data.targetUserId)) {
      errors.targetUserId = "Valid Discord user ID is required";
    }
    
    if (!data.scheduledTime || new Date(data.scheduledTime) <= new Date()) {
      errors.scheduledTime = "Scheduled time must be in the future";
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
};
```

## Real-time Updates (Islands)

### Status Update Island
```typescript
interface StatusUpdateIslandProps {
  reminderId: string;
  initialStatus: ReminderStatus;
  pollInterval?: number; // milliseconds, default 5000
}

// Island component for real-time status updates
export function StatusUpdateIsland(props: StatusUpdateIslandProps): JSX.Element;
```

### Test Progress Island
```typescript
interface TestProgressIslandProps {
  reminderId: string;
  onTestComplete: (result: TestExecution) => void;
}

// Island component for test execution progress
export function TestProgressIsland(props: TestProgressIslandProps): JSX.Element;
```