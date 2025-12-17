/**
 * Authentication Types
 *
 * Centralized type definitions for authentication flows including
 * login, signup, OTP verification, and form state management.
 */

// ============================================================================
// Auth Mode Types
// ============================================================================

/** Available authentication modes for the auth flow */
export type AuthMode = "signin" | "signup" | "verify-otp";

/** Gender options for user profile */
export type Gender = "male" | "female" | "other" | "prefer_not_to_say";

// ============================================================================
// Form State Types
// ============================================================================

/** Login form field values */
export interface LoginFormValues {
  email: string;
  password: string;
}

/** Signup form field values */
export interface SignupFormValues {
  email: string;
  username: string;
  phone: string;
  dateOfBirth: string;
  gender: Gender | "";
  password: string;
  confirmPassword: string;
}

/** OTP verification form values */
export interface OtpFormValues {
  otp: string;
}

/** Combined auth form state for multi-step flows */
export interface AuthFormState extends LoginFormValues, SignupFormValues, OtpFormValues {
  mode: AuthMode;
}

// ============================================================================
// UI State Types
// ============================================================================

/** Password visibility state */
export interface PasswordVisibility {
  password: boolean;
  confirmPassword: boolean;
}

/** Form loading and error states */
export interface FormUIState {
  isLoading: boolean;
  error: string | null;
  success: string | null;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/** Request payload for sending OTP */
export interface SendOtpRequest {
  email: string;
}

/** Response from send OTP endpoint */
export interface SendOtpResponse {
  success?: boolean;
  error?: string;
  message?: string;
}

/** Request payload for verifying OTP and creating user */
export interface VerifyOtpRequest {
  email: string;
  otp: string;
  createUser: boolean;
  password: string;
  username: string;
  phone: string | null;
  dateOfBirth: string | null;
  gender: Gender | null;
}

/** Response from verify OTP endpoint */
export interface VerifyOtpResponse {
  success?: boolean;
  error?: string;
  user?: {
    id: string;
    email: string;
  };
}

// ============================================================================
// Component Props Types
// ============================================================================

/** Props for LoginForm component */
export interface LoginFormProps {
  /** Callback URL after successful login */
  callbackUrl?: string;
  /** Custom class name for styling */
  className?: string;
  /** Callback fired on successful login */
  onSuccess?: () => void;
  /** Callback fired on error */
  onError?: (error: string) => void;
}

/** Props for SignupForm component */
export interface SignupFormProps {
  /** Callback URL after successful signup */
  callbackUrl?: string;
  /** Custom class name for styling */
  className?: string;
  /** Callback fired on successful signup */
  onSuccess?: () => void;
  /** Callback fired on error */
  onError?: (error: string) => void;
  /** Callback to switch to login mode */
  onSwitchToLogin?: () => void;
}

/** Props for OTP verification form */
export interface OtpFormProps {
  /** Email address OTP was sent to */
  email: string;
  /** Signup data to submit after verification */
  signupData: Omit<SignupFormValues, "confirmPassword">;
  /** Custom class name for styling */
  className?: string;
  /** Callback fired on successful verification */
  onSuccess?: () => void;
  /** Callback fired on error */
  onError?: (error: string) => void;
  /** Callback to go back to signup form */
  onBack?: () => void;
}

// ============================================================================
// Validation Types
// ============================================================================

/** Field validation error */
export interface FieldError {
  field: string;
  message: string;
}

/** Form validation result */
export interface ValidationResult {
  isValid: boolean;
  errors: FieldError[];
}

// ============================================================================
// Constants
// ============================================================================

/** Gender options for select dropdown */
export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

/** Minimum password length requirement */
export const MIN_PASSWORD_LENGTH = 6;

/** OTP length */
export const OTP_LENGTH = 6;
