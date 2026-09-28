import mongoose from 'mongoose';

// Role hierarchy:
//   superadmin  – full access (approve/reject withdrawals, manage admins)
//   subadmin    – limited access based on permissions[]
// Backward compat: existing docs with role='admin' are treated as superadmin in guards.
export const ADMIN_ROLES = ['superadmin', 'subadmin', 'admin'] as const;
export type AdminRole = typeof ADMIN_ROLES[number];

// All available permission keys
export const ADMIN_PERMISSIONS = [
    'dashboard',
    'users',
    'deposits',
    'withdrawals',     // can verify withdrawals
    'transactions',
    'wallets',
    'investments',
    'mlm',
    'currencies',
    'admin_users',
    'settings',
    'support_tickets',
] as const;
export type AdminPermission = typeof ADMIN_PERMISSIONS[number];

const adminSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ADMIN_ROLES,
        required: true,
        default: 'subadmin',
    },
    permissions: {
        type: [String],
        default: [],
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true });

const Admin = mongoose.model('Admin', adminSchema);

export default Admin;
