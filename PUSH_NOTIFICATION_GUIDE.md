# Push Notification API Guide

This guide explains how to integrate and use push notifications in the W-Invest platform using Firebase Cloud Messaging (FCM).

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Step 1: Register FCM Token](#step-1-register-fcm-token)
4. [Step 2: Send Push Notifications](#step-2-send-push-notifications)
5. [Step 3: What Users Will See](#step-3-what-users-will-see)
6. [Frontend Integration](#frontend-integration)
7. [API Examples](#api-examples)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The push notification system allows you to send real-time notifications to users' mobile devices. The system uses Firebase Cloud Messaging (FCM) to deliver notifications.

### How It Works
1. **User registers FCM token** - When user logs in, their device gets an FCM token from Firebase
2. **Token is stored** - Frontend sends token to backend via API
3. **Notifications are sent** - Backend uses the stored token to send push notifications
4. **User receives notification** - Notification appears on user's device

---

## Prerequisites

### Backend Setup
✅ Firebase Admin SDK is already configured
✅ Service account JSON file is in place
✅ Notification service is ready

### Frontend Requirements
- Firebase SDK installed in your mobile app
- User must be logged in (authenticated)
- Device must have internet connection

---

## Step 1: Register FCM Token

Before sending push notifications, you need to register the user's FCM token.

### API Endpoint
```
POST /api/v1/user/update-fcm-token
```

### Authentication
- **Required**: Yes (Bearer Token)
- **Header**: `Authorization: Bearer <access_token>`

### Request Body
```json
{
  "fcmToken": "dKx8Yz9vWqR:APA91bH...your-fcm-token-here"
}
```

### cURL Example
```bash
curl -X POST http://localhost:3001/api/v1/user/update-fcm-token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "fcmToken": "dKx8Yz9vWqR:APA91bH...your-fcm-token-here"
  }'
```

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "FCM token updated successfully",
  "data": null
}
```

### Error Responses

**Missing Token (400 Bad Request)**
```json
{
  "success": false,
  "message": "FCM token is required and must be a string",
  "data": null
}
```

**Unauthorized (401 Unauthorized)**
```json
{
  "success": false,
  "message": "Authentication required",
  "data": null
}
```

### When to Call This API
- ✅ After user login
- ✅ When FCM token is refreshed (Firebase SDK handles this)
- ✅ When app starts and user is already logged in
- ✅ After app reinstall

---

## Step 2: Send Push Notifications

Push notifications are automatically sent when you use the `NotificationService.sendNotification()` function in your backend code.

### Available Notification Types

The system supports the following notification types:

1. **DEPOSIT_SUCCESS** - When deposit is successful
2. **DEPOSIT_FAILED** - When deposit fails
3. **WITHDRAWAL_REQUEST** - When withdrawal is requested
4. **WITHDRAWAL_APPROVED** - When withdrawal is approved
5. **WITHDRAWAL_REJECTED** - When withdrawal is rejected
6. **GAME_WIN** - When user wins a game
7. **GAME_LOSE** - When user loses a game
8. **ROI_CREDIT** - When ROI is credited
9. **REFERRAL_JOINED** - When a referral joins
10. **REFERRAL_BONUS** - When referral bonus is credited
11. **ACCOUNT_VERIFIED** - When account is verified
12. **SECURITY_ALERT** - Security-related alerts
13. **SYSTEM_ANNOUNCEMENT** - System-wide announcements

### How to Send Notifications (Backend Code)

#### Example 1: Send Deposit Success Notification
```typescript
import NotificationService from './services/NotificationService'
import { NotificationType } from './models/NotificationModel'

// After successful deposit
await NotificationService.sendNotification({
  userId: user._id,
  type: NotificationType.DEPOSIT_SUCCESS,
  data: {
    userName: user.name,
    amount: 100,
    currency: 'TRX',
    transactionId: 'TXN20251228143025457',
    mainWalletAmount: 50,
    gamingWalletAmount: 50
  }
})
```

#### Example 2: Send Withdrawal Approved Notification
```typescript
await NotificationService.sendNotification({
  userId: user._id,
  type: NotificationType.WITHDRAWAL_APPROVED,
  data: {
    userName: user.name,
    amount: 200,
    currency: 'TRX',
    transactionId: 'TXN20251228143025458',
    transactionHash: '0xabc123...'
  }
})
```

#### Example 3: Send Game Win Notification
```typescript
await NotificationService.sendNotification({
  userId: user._id,
  type: NotificationType.GAME_WIN,
  data: {
    userName: user.name,
    gameName: 'Lucky Spin',
    winAmount: 50,
    currency: 'TRX'
  }
})
```

#### Example 4: Send Custom Notification
```typescript
await NotificationService.sendNotification({
  userId: user._id,
  type: NotificationType.SYSTEM_ANNOUNCEMENT,
  customTitle: 'New Feature Available!',
  customMessage: 'Check out our new investment plans',
  data: {
    link: '/investments',
    actionUrl: 'https://app.winvest.com/investments'
  },
  priority: NotificationPriority.HIGH
})
```

### Notification Channels

You can specify which channels to use (default is based on notification type):

```typescript
await NotificationService.sendNotification({
  userId: user._id,
  type: NotificationType.DEPOSIT_SUCCESS,
  channels: [
    NotificationChannel.EMAIL,
    NotificationChannel.PUSH,
    NotificationChannel.IN_APP
  ],
  data: { /* ... */ }
})
```

---

## Step 3: What Users Will See

### On Mobile Device

When a push notification is sent, users will see:

#### Android
```
┌─────────────────────────────┐
│  🔔 W-Invest                │
│  Deposit Successful         │
│  Your deposit of 100 TRX    │
│  has been processed         │
│  [Tap to view]              │
└─────────────────────────────┘
```

#### iOS
```
┌─────────────────────────────┐
│  🔔 W-Invest                │
│  Deposit Successful         │
│  Your deposit of 100 TRX    │
│  has been processed         │
└─────────────────────────────┘
```

### Notification Details

**Title**: Based on notification type (e.g., "Deposit Successful", "Withdrawal Approved")

**Message**: Dynamic message with user-specific data (e.g., "Your deposit of 100 TRX has been processed successfully")

**Data Payload**: Additional data sent with notification (accessible when user taps notification):
```json
{
  "transactionId": "TXN20251228143025457",
  "amount": "100",
  "currency": "TRX",
  "mainWalletAmount": "50",
  "gamingWalletAmount": "50"
}
```

### User Actions

1. **Tap Notification**: Opens the app (or brings it to foreground)
2. **Swipe Away**: Dismisses notification
3. **Long Press** (Android): Shows notification actions

---

## Frontend Integration

### React Native Example

#### 1. Install Firebase SDK
```bash
npm install @react-native-firebase/app @react-native-firebase/messaging
```

#### 2. Get FCM Token
```typescript
import messaging from '@react-native-firebase/messaging';

// Request permission (iOS)
const requestUserPermission = async () => {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (enabled) {
    console.log('Authorization status:', authStatus);
  }
};

// Get FCM token
const getFCMToken = async () => {
  try {
    const token = await messaging().getToken();
    console.log('FCM Token:', token);
    
    // Send token to backend
    await updateFCMToken(token);
    return token;
  } catch (error) {
    console.error('Error getting FCM token:', error);
  }
};

// Update token on backend
const updateFCMToken = async (token: string) => {
  try {
    const response = await fetch('http://your-api.com/api/v1/user/update-fcm-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userAccessToken}`
      },
      body: JSON.stringify({ fcmToken: token })
    });
    
    const data = await response.json();
    console.log('FCM token updated:', data);
  } catch (error) {
    console.error('Error updating FCM token:', error);
  }
};
```

#### 3. Handle Foreground Notifications
```typescript
// Handle notifications when app is in foreground
messaging().onMessage(async remoteMessage => {
  console.log('Notification received in foreground:', remoteMessage);
  
  // Show local notification
  Alert.alert(
    remoteMessage.notification?.title || 'Notification',
    remoteMessage.notification?.body || 'You have a new notification'
  );
});
```

#### 4. Handle Background/Quit State Notifications
```typescript
// Handle notifications when app is in background or quit
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Notification received in background:', remoteMessage);
});
```

#### 5. Handle Notification Tap
```typescript
// Handle notification tap
messaging().onNotificationOpenedApp(remoteMessage => {
  console.log('Notification opened app:', remoteMessage);
  
  // Navigate to specific screen based on notification data
  if (remoteMessage.data?.transactionId) {
    navigation.navigate('TransactionDetails', {
      transactionId: remoteMessage.data.transactionId
    });
  }
});

// Check if app was opened from quit state
messaging()
  .getInitialNotification()
  .then(remoteMessage => {
    if (remoteMessage) {
      console.log('Notification opened app from quit state:', remoteMessage);
      // Handle navigation
    }
  });
```

#### 6. Token Refresh Handler
```typescript
// Handle token refresh
messaging().onTokenRefresh(async token => {
  console.log('FCM token refreshed:', token);
  await updateFCMToken(token);
});
```

### Flutter Example

#### 1. Install Firebase SDK
```yaml
dependencies:
  firebase_core: ^2.24.2
  firebase_messaging: ^14.7.9
```

#### 2. Get FCM Token
```dart
import 'package:firebase_messaging/firebase_messaging.dart';

Future<void> setupFCM() async {
  // Request permission
  NotificationSettings settings = await FirebaseMessaging.instance.requestPermission(
    alert: true,
    badge: true,
    sound: true,
  );

  if (settings.authorizationStatus == AuthorizationStatus.authorized) {
    // Get FCM token
    String? token = await FirebaseMessaging.instance.getToken();
    print('FCM Token: $token');
    
    // Send token to backend
    if (token != null) {
      await updateFCMToken(token);
    }
    
    // Listen for token refresh
    FirebaseMessaging.instance.onTokenRefresh.listen((newToken) {
      updateFCMToken(newToken);
    });
  }
}

Future<void> updateFCMToken(String token) async {
  // Call your API to update FCM token
  // Implementation depends on your HTTP client
}
```

#### 3. Handle Notifications
```dart
// Foreground handler
FirebaseMessaging.onMessage.listen((RemoteMessage message) {
  print('Notification received: ${message.notification?.title}');
  // Show local notification
});

// Background handler (must be top-level function)
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  print('Background notification: ${message.messageId}');
}

// Initialize background handler
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
  runApp(MyApp());
}
```

---

## API Examples

### Complete Flow Example

#### 1. User Login
```bash
curl -X POST http://localhost:3001/api/v1/user/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "User logged in successfully",
  "data": {
    "_id": "60d5ec49f8d2e63a4c8e9a1a",
    "name": "John Doe",
    "email": "user@example.com",
    "token": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

#### 2. Register FCM Token
```bash
curl -X POST http://localhost:3001/api/v1/user/update-fcm-token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "fcmToken": "dKx8Yz9vWqR:APA91bH..."
  }'
```

#### 3. Trigger Notification (Backend Code)
```typescript
// This happens automatically when deposit is successful
// In WalletService.deposit() or similar
await NotificationService.sendNotification({
  userId: user._id,
  type: NotificationType.DEPOSIT_SUCCESS,
  data: {
    amount: 100,
    currency: 'TRX',
    transactionId: 'TXN20251228143025457'
  }
})
```

#### 4. User Receives Notification
- Notification appears on device
- User taps notification
- App opens to relevant screen

---

## Troubleshooting

### Common Issues

#### 1. Token Not Registered
**Problem**: Notifications not received
**Solution**: 
- Ensure FCM token is registered after login
- Check token is valid (not expired)
- Verify user is authenticated

#### 2. Invalid Token Error
**Problem**: `INVALID_TOKEN` error in logs
**Solution**:
- Token is automatically removed from database
- User needs to re-register token
- Check if app was reinstalled (new token needed)

#### 3. Notifications Not Appearing
**Problem**: No notification on device
**Solution**:
- Check notification permissions are granted
- Verify FCM token is correct
- Check device internet connection
- Verify Firebase project configuration

#### 4. Background Notifications Not Working
**Problem**: Notifications only work when app is open
**Solution**:
- Ensure background handler is properly set up
- Check app notification settings
- Verify Firebase configuration

### Testing Checklist

- [ ] FCM token is registered successfully
- [ ] Token is stored in database
- [ ] Notification service is called correctly
- [ ] Firebase Admin SDK is initialized
- [ ] Service account JSON file is accessible
- [ ] Device has internet connection
- [ ] App has notification permissions
- [ ] Firebase project is configured correctly

### Debug Logs

Check backend logs for:
```
✅ Firebase Admin SDK initialized successfully
✅ Push notification sent successfully: <message-id>
⚠️ User <userId> does not have an FCM token registered
❌ Push notification failed: <error-message>
🗑️ Removed invalid FCM token for user <userId>
```

---

## Notification Templates

The system uses pre-defined templates for different notification types. Here are some examples:

### Deposit Success
- **Title**: "Deposit Successful"
- **Message**: "Your deposit of {amount} {currency} has been processed successfully. {mainWalletAmount} {currency} credited to Main Wallet and {gamingWalletAmount} {currency} credited to Gaming Wallet."

### Withdrawal Approved
- **Title**: "Withdrawal Approved"
- **Message**: "Your withdrawal request of {amount} {currency} has been approved. Transaction ID: {transactionId}"

### Game Win
- **Title**: "Congratulations! You Won!"
- **Message**: "You won {winAmount} {currency} in {gameName}. Amount has been credited to your gaming wallet."

---

## Best Practices

1. **Register Token Early**: Register FCM token immediately after login
2. **Handle Token Refresh**: Listen for token refresh events and update backend
3. **Error Handling**: Handle cases where token is invalid or expired
4. **User Permissions**: Always request notification permissions before getting token
5. **Testing**: Test on both Android and iOS devices
6. **Logging**: Log notification sends for debugging
7. **Rate Limiting**: Don't spam users with too many notifications

---

## Support

For issues or questions:
- Check backend logs for error messages
- Verify Firebase configuration
- Ensure service account file is correct
- Test with Firebase Console to verify token works

---

**Last Updated**: December 2024
**Version**: 1.0.0

