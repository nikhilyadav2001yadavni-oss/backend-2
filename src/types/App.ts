import { ValidationError } from "joi";

export interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
    error?: string;
    errors?: ValidationError[];
    pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}