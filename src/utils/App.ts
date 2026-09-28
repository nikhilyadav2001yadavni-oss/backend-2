import { HttpStatusCategory, HttpStatusMessage } from "../enums/App";

/**
 * Get status message for a given status code
 */
export const getStatusMessage = (statusCode: number): string => {
    return HttpStatusMessage[statusCode] || 'Unknown Status';
};

/**
 * Helper function to get status code category
 */
export const getStatusCategory = (statusCode: number): HttpStatusCategory => {
    const category = Math.floor(statusCode / 100);
    return category as HttpStatusCategory;
};

/**
 * Helper function to check if status code is successful (2xx)
 */
export const isSuccessStatus = (statusCode: number): boolean => {
    return statusCode >= 200 && statusCode < 300;
};

/**
 * Helper function to check if status code is client error (4xx)
 */
export const isClientError = (statusCode: number): boolean => {
    return statusCode >= 400 && statusCode < 500;
};

/**
 * Helper function to check if status code is server error (5xx)
 */
export const isServerError = (statusCode: number): boolean => {
    return statusCode >= 500 && statusCode < 600;
};