import * as admin from 'firebase-admin'
import * as path from 'path'
import * as fs from 'fs'

// Initialize Firebase Admin SDK
let firebaseApp: admin.app.App | null = null

export const initializeFirebase = (): admin.app.App => {
    if (firebaseApp) {
        return firebaseApp
    }

    try {
        // Path to the service account key file (relative to project root)
        const serviceAccountPath = path.join(process.cwd(), 'firebase/winvest-edf4a-firebase-adminsdk-fbsvc-b921e07078.json')
        
        // Check if file exists
        if (!fs.existsSync(serviceAccountPath)) {
            throw new Error(`Firebase service account file not found at: ${serviceAccountPath}`)
        }
        
        // Initialize Firebase Admin
        firebaseApp = admin.initializeApp({
            credential: admin.credential.cert(serviceAccountPath),
            projectId: 'winvest-edf4a',
        })

        console.log('✅ Firebase Admin SDK initialized successfully')
        return firebaseApp
    } catch (error: any) {
        console.error('❌ Firebase Admin SDK initialization failed:', error.message)
        throw new Error(`Firebase initialization failed: ${error.message}`)
    }
}

// Get Firebase Admin instance
export const getFirebaseAdmin = (): admin.app.App => {
    if (!firebaseApp) {
        return initializeFirebase()
    }
    return firebaseApp
}

// Send push notification to a single device
export const sendPushNotification = async (
    fcmToken: string,
    title: string,
    body: string,
    data?: { [key: string]: string }
): Promise<string> => {
    try {
        console.log('🔥 [Firebase] Sending push notification:', {
            title,
            body,
            data,
            fcmToken: fcmToken.substring(0, 20) + '...',
        })

        const messaging = getFirebaseAdmin().messaging()

        const message: admin.messaging.Message = {
            notification: {
                title,
                body,
            },
            data: data ? Object.entries(data).reduce((acc, [key, value]) => {
                acc[key] = String(value)
                return acc
            }, {} as { [key: string]: string }) : undefined,
            token: fcmToken,
            android: {
                priority: 'high' as const,
            },
            apns: {
                headers: {
                    'apns-priority': '10',
                },
            },
        }

        const response = await messaging.send(message)
        console.log(`✅ [Firebase] Push notification sent successfully`, {
            messageId: response,
            title,
            body,
            timestamp: new Date().toISOString(),
            projectId: 'winvest-edf4a',
        })
        return response
    } catch (error: any) {
        console.error('❌ [Firebase] Push notification failed:', {
            error: error.message,
            code: error.code,
            title,
            body,
            fcmToken: fcmToken.substring(0, 20) + '...',
        })
        
        // Handle invalid token errors
        if (error.code === 'messaging/invalid-registration-token' || 
            error.code === 'messaging/registration-token-not-registered') {
            throw new Error('INVALID_TOKEN')
        }
        
        throw new Error(`Push notification failed: ${error.message}`)
    }
}

// Send push notification to multiple devices
export const sendBulkPushNotification = async (
    fcmTokens: string[],
    title: string,
    body: string,
    data?: { [key: string]: string }
): Promise<{ success: number; failed: number; errors: any[] }> => {
    try {
        console.log('🔥 [Firebase] Sending bulk push notification:', {
            title,
            body,
            data,
            tokenCount: fcmTokens.length,
        })

        const messaging = getFirebaseAdmin().messaging()

        const message: admin.messaging.MulticastMessage = {
            notification: {
                title,
                body,
            },
            data: data ? Object.entries(data).reduce((acc, [key, value]) => {
                acc[key] = String(value)
                return acc
            }, {} as { [key: string]: string }) : undefined,
            tokens: fcmTokens,
            android: {
                priority: 'high' as const,
            },
            apns: {
                headers: {
                    'apns-priority': '10',
                },
            },
        }

        const response = await messaging.sendEachForMulticast(message)
        
        const result = {
            success: response.successCount,
            failed: response.failureCount,
            errors: response.responses
                .map((resp, idx) => {
                    if (!resp.success) {
                        return {
                            token: fcmTokens[idx],
                            error: resp.error?.message || 'Unknown error',
                        }
                    }
                    return null
                })
                .filter(Boolean),
        }

        console.log(`✅ [Firebase] Bulk push notification sent`, {
            success: result.success,
            failed: result.failed,
            title,
            body,
            errors: result.errors,
            timestamp: new Date().toISOString(),
            projectId: 'winvest-edf4a',
        })
        return result
    } catch (error: any) {
        console.error('❌ [Firebase] Bulk push notification failed:', {
            error: error.message,
            code: error.code,
            title,
            body,
            tokenCount: fcmTokens.length,
        })
        throw new Error(`Bulk push notification failed: ${error.message}`)
    }
}

// Initialize Firebase on module load
initializeFirebase()

