# Notification API - cURL Commands

This document contains all cURL commands for notification-related APIs.

## Base URL
```
http://localhost:3001
```

## Authentication
Most endpoints require a Bearer token. Replace `YOUR_TOKEN` with your actual JWT token.

---

## User Notification APIs

### 1. Get User Notifications
Get paginated list of notifications for the authenticated user.

```bash
curl --location --request GET 'http://localhost:3001/api/v1/notifications/list?page=1&limit=20&status=ALL' \
--header 'Authorization: Bearer YOUR_TOKEN'
```

**Query Parameters:**
- `page` (optional, default: 1) - Page number (starts at 1)
- `limit` (optional, default: 20, max: 100) - Number of notifications per page
- `status` (optional, default: ALL) - Filter by status: `READ`, `UNREAD`, or `ALL`

**Example with filters:**
```bash
# Get only unread notifications
curl --location --request GET 'http://localhost:3001/api/v1/notifications/list?page=1&limit=20&status=UNREAD' \
--header 'Authorization: Bearer YOUR_TOKEN'

# Get only read notifications
curl --location --request GET 'http://localhost:3001/api/v1/notifications/list?page=1&limit=20&status=READ' \
--header 'Authorization: Bearer YOUR_TOKEN'
```

---

### 2. Get Unread Notification Count
Get the total count of unread notifications.

```bash
curl --location --request GET 'http://localhost:3001/api/v1/notifications/unread-count' \
--header 'Authorization: Bearer YOUR_TOKEN'
```

**Response:**
```json
{
  "success": true,
  "message": "Unread count fetched successfully",
  "data": {
    "unreadCount": 5
  }
}
```

---

### 3. Mark Notification as Read
Mark a specific notification as read.

```bash
curl --location --request PATCH 'http://localhost:3001/api/v1/notifications/NOTIFICATION_ID/read' \
--header 'Authorization: Bearer YOUR_TOKEN'
```

**Replace `NOTIFICATION_ID` with the actual notification ID.**

**Example:**
```bash
curl --location --request PATCH 'http://localhost:3001/api/v1/notifications/60d5ec49f8d2e63a4c8e9a1b/read' \
--header 'Authorization: Bearer YOUR_TOKEN'
```

---

### 4. Mark All Notifications as Read
Mark all unread notifications as read for the authenticated user.

```bash
curl --location --request PATCH 'http://localhost:3001/api/v1/notifications/read-all' \
--header 'Authorization: Bearer YOUR_TOKEN'
```

**Response:**
```json
{
  "success": true,
  "message": "5 notifications marked as read",
  "data": {
    "count": 5
  }
}
```

---

### 5. Delete Notification
Delete a specific notification. User can only delete their own notifications.

```bash
curl --location --request DELETE 'http://localhost:3001/api/v1/notifications/NOTIFICATION_ID' \
--header 'Authorization: Bearer YOUR_TOKEN'
```

**Replace `NOTIFICATION_ID` with the actual notification ID.**

**Example:**
```bash
curl --location --request DELETE 'http://localhost:3001/api/v1/notifications/60d5ec49f8d2e63a4c8e9a1b' \
--header 'Authorization: Bearer YOUR_TOKEN'
```

---

## Admin Notification APIs

### 6. Send Notification to Users (Admin Only)
Send a custom notification to multiple users. Requires admin authentication.

```bash
curl --location --request POST 'http://localhost:3001/api/v1/admin/notifications/send' \
--header 'Authorization: Bearer ADMIN_TOKEN' \
--header 'Content-Type: application/json' \
--data-raw '{
  "userIds": ["60d5ec49f8d2e63a4c8e9a1a", "60d5ec49f8d2e63a4c8e9a1b"],
  "title": "System Announcement",
  "message": "This is a test notification sent by admin"
}'
```

**Request Body:**
- `userIds` (required, array) - Array of user IDs to send notification to
- `title` (required, string) - Notification title
- `message` (required, string) - Notification message

**Example:**
```bash
curl --location --request POST 'http://localhost:3001/api/v1/admin/notifications/send' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
--header 'Content-Type: application/json' \
--data-raw '{
  "userIds": ["694fdf59eae29f2f3f427b3f"],
  "title": "Welcome to W-Invest",
  "message": "Thank you for joining our platform!"
}'
```

**Response:**
```json
{
  "success": true,
  "message": "Notifications sent successfully to 1 user(s)",
  "data": {
    "sent": 1,
    "failed": 0,
    "total": 1
  }
}
```

---

## Complete Examples with Real Tokens

### Example 1: Get all notifications for a user
```bash
# First, login to get token
curl --location --request POST 'http://localhost:3001/api/v1/user/login' \
--header 'Content-Type: application/json' \
--data-raw '{
  "email": "user@example.com",
  "password": "yourpassword"
}'

# Use the token from response
curl --location --request GET 'http://localhost:3001/api/v1/notifications/list?page=1&limit=20' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5NGZkZjU5ZWFlMjlmMmYzZjQyN2IzZiIsImVtYWlsIjoid2ludmVzdDFAdGVzdC5jb20iLCJpYXQiOjE3NjgzNzE4MjksImV4cCI6MTc2ODk3NjYyOX0.HKnt1l754dEOql6NDcPxI7BObSvpDQcOP5zukUyS5r4'
```

### Example 2: Admin sends notification to users
```bash
# First, admin login
curl --location --request POST 'http://localhost:3001/api/v1/admin/signin' \
--header 'Content-Type: application/json' \
--data-raw '{
  "email": "admin@winvest.com",
  "password": "adminpassword"
}'

# Use admin token to send notification
curl --location --request POST 'http://localhost:3001/api/v1/admin/notifications/send' \
--header 'Authorization: Bearer ADMIN_TOKEN_HERE' \
--header 'Content-Type: application/json' \
--data-raw '{
  "userIds": ["694fdf59eae29f2f3f427b3f"],
  "title": "Maintenance Notice",
  "message": "System will be under maintenance from 2 AM to 4 AM"
}'
```

---

## Notification Types

The system automatically sends notifications for the following events:

1. **DEPOSIT_SUCCESS** - When a deposit is successfully processed
2. **DEPOSIT_FAILED** - When a deposit fails
3. **WITHDRAWAL_REQUEST** - When a withdrawal is requested
4. **WITHDRAWAL_APPROVED** - When admin approves a withdrawal
5. **WITHDRAWAL_REJECTED** - When admin rejects a withdrawal
6. **GAME_WIN** - When user wins a game
7. **GAME_LOSE** - When user loses a game
8. **ROI_CREDIT** - When ROI is credited to user's wallet
9. **REFERRAL_JOINED** - When a referral joins
10. **REFERRAL_BONUS** - When user earns a referral bonus
11. **ACCOUNT_VERIFIED** - When account is verified
12. **SECURITY_ALERT** - Security-related alerts
13. **SYSTEM_ANNOUNCEMENT** - System-wide announcements

---

## Testing Notifications

### Test 1: Check if notifications are being created
```bash
# Get user notifications
curl --location --request GET 'http://localhost:3001/api/v1/notifications/list' \
--header 'Authorization: Bearer YOUR_TOKEN'
```

### Test 2: Check unread count
```bash
curl --location --request GET 'http://localhost:3001/api/v1/notifications/unread-count' \
--header 'Authorization: Bearer YOUR_TOKEN'
```

### Test 3: Mark all as read and verify
```bash
# Mark all as read
curl --location --request PATCH 'http://localhost:3001/api/v1/notifications/read-all' \
--header 'Authorization: Bearer YOUR_TOKEN'

# Verify unread count is now 0
curl --location --request GET 'http://localhost:3001/api/v1/notifications/unread-count' \
--header 'Authorization: Bearer YOUR_TOKEN'
```

---

## Notes

1. **Authentication**: All user notification endpoints require a valid JWT token in the `Authorization` header.
2. **Admin Endpoints**: Admin endpoints require admin role authentication.
3. **Rate Limiting**: All endpoints are rate-limited. Check the response headers for rate limit information.
4. **Pagination**: The `list` endpoint supports pagination with `page` and `limit` parameters.
5. **Status Filter**: Use `status=UNREAD` to get only unread notifications, `status=READ` for read ones, or `status=ALL` for all.
6. **Firebase Push Notifications**: Notifications sent via Admin SDK won't appear in Firebase Console campaigns. Check server logs for Firebase notification status.

---

## Troubleshooting

### Error: "Authentication required"
- Make sure you're including the `Authorization: Bearer TOKEN` header
- Verify your token is valid and not expired
- Login again to get a fresh token

### Error: "Invalid pagination parameters"
- `page` must be >= 1
- `limit` must be between 1 and 100

### Error: "Notification not found"
- Verify the notification ID is correct
- Make sure the notification belongs to the authenticated user

### Notifications not appearing in Firebase Console
- Programmatic notifications sent via Admin SDK don't appear in Firebase Console campaigns
- Check server logs for Firebase notification status (look for `🔥 [Firebase]` logs)
- Verify users have valid FCM tokens registered
- Check the `notifications` collection in your database for notification records
