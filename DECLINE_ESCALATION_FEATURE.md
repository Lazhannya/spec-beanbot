# Discord Button Decline - Escalation Implementation

## Feature Summary

When a user clicks the "Decline" button on a reminder, the system now automatically sends an escalation message to the configured escalation target user (if one exists).

## Implementation Details

### 1. Updated Webhook Handler (`routes/api/webhook/discord.ts`)

**Enhanced `processReminderResponse()` function:**
- Now `async` to support database operations
- Fetches reminder from database when declined
- Checks if reminder has escalation configured
- Sends escalation notification to secondary user

**Flow when reminder is declined:**
1. User clicks "Decline" button
2. Webhook receives interaction
3. Message updates immediately (prevents "interaction failed")
4. Background process starts:
   - Fetches reminder from database using reminder ID
   - Checks for escalation configuration
   - If escalation exists and is active, sends DM to escalation user
   - Logs all actions with detailed status

### 2. Updated Delivery Service (`discord-bot/lib/discord/delivery.ts`)

**Enhanced `sendMessage()` method:**
- Added `includeButtons` parameter (default: `true`)
- Only includes interactive buttons when `includeButtons = true`
- Escalation messages sent without buttons (cleaner notification)

**Updated `sendEscalation()` method:**
- Passes `includeButtons = false` to `sendMessage()`
- Escalation notifications are informational only, no interaction needed

## Escalation Message Format

When a reminder is declined, the escalation user receives:

```
🚨 **Reminder Declined by User**

**Original Reminder:**
[Reminder content here]

**Status:** The reminder was manually declined by @userid
**Time:** 2025-10-23T12:34:56.789Z

This reminder requires your attention as the escalation contact.
```

## Logging

Comprehensive logs for debugging:

### Successful Escalation Flow:
```
Processing decline response from user 123456789 for reminder abc-123
🚨 Reminder abc-123 was declined, checking for escalation target...
Found reminder: abc-123, has escalation: true
📤 Sending escalation to user 987654321
Sending escalation for reminder abc-123 to user 987654321
Successfully sent escalation for reminder abc-123, message ID: msg_xyz
✅ Escalation message sent successfully to 987654321
Message ID: msg_xyz
```

### No Escalation Configured:
```
Processing decline response from user 123456789 for reminder abc-123
🚨 Reminder abc-123 was declined, checking for escalation target...
Found reminder: abc-123, has escalation: false
ℹ️ No escalation configured for reminder abc-123
```

### Acknowledged (No Escalation):
```
Processing acknowledge response from user 123456789 for reminder abc-123
✅ Reminder abc-123 was acknowledged - no escalation needed
```

## Testing Checklist

- [x] Create reminder with escalation configured
- [ ] Send test reminder to primary user
- [ ] Click "Decline" button
- [ ] Verify primary user sees "Reminder declined" message
- [ ] Verify escalation user receives DM notification
- [ ] Check Deno Deploy logs for successful escalation
- [ ] Test with reminder without escalation (should not error)
- [ ] Test "Acknowledge" button (should not trigger escalation)

## Database Requirements

- Requires Deno KV to be available (production environment)
- Uses `ReminderRepository` to fetch reminder details
- Accesses `reminder.escalation.secondaryUserId` for target

## Error Handling

- **Reminder not found**: Logs error, does not send escalation
- **No escalation configured**: Logs info message, normal flow
- **Discord API failure**: Logs error with details, doesn't crash
- **Database error**: Caught and logged with stack trace

## Configuration Required

None! If a reminder has escalation configured and is declined, the escalation happens automatically.

## Future Enhancements

Potential additions:
1. **Update reminder status** in database to mark as "declined"
2. **Response logging** in database for audit trail
3. **Cancel scheduled reminders** when declined
4. **Escalation acknowledgment** - allow escalation user to respond
5. **Custom escalation messages** - configurable templates
6. **Multiple escalation levels** - chain of escalation contacts

## Files Modified

1. ✅ `routes/api/webhook/discord.ts`
   - Made `processReminderResponse()` async
   - Added database lookup for declined reminders
   - Added escalation message sending logic
   - Enhanced logging throughout

2. ✅ `discord-bot/lib/discord/delivery.ts`
   - Added `includeButtons` parameter to `sendMessage()`
   - Updated `sendEscalation()` to exclude buttons
   - Escalation messages now are notification-only

## Status: ✅ READY FOR TESTING

Deploy to production and test:
1. Create reminder with escalation target
2. Send test via dashboard
3. Click "Decline" button
4. Check escalation user's Discord DMs
5. Verify logs show successful escalation send

The escalation should happen automatically within seconds of clicking "Decline"!
