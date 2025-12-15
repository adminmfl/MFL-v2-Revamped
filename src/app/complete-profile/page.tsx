'use client';

import * as React from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Eye,
  EyeOff,
  User,
  Lock,
  Calendar,
  Phone,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Dumbbell,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';

// ============================================================================
// Types
// ============================================================================

interface FormState {
  username: string;
  password: string;
  confirmPassword: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
}

type FormField = keyof FormState;

// ============================================================================
// Complete Profile Page
// ============================================================================

export default function CompleteProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [formData, setFormData] = React.useState<FormState>({
    username: '',
    password: '',
    confirmPassword: '',
    dateOfBirth: '',
    gender: '',
    phone: '',
  });
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  // Redirect logic
  React.useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
      return;
    }
    if (session?.user?.name && !formData.username) {
      setFormData((prev) => ({ ...prev, username: session.user?.name || '' }));
    }
    if (session && !(session as any).user?.needsProfileCompletion) {
      router.replace('/dashboard');
    }
  }, [session, status, router, formData.username]);

  // Form field updater
  const updateField = (field: FormField, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const { username, password, confirmPassword, dateOfBirth, gender, phone } = formData;

    // Validation
    if (!session?.user?.email) {
      setError('Missing session email. Please sign out and sign in again.');
      return;
    }
    if (!username.trim()) {
      setError('Username is required');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!dateOfBirth) {
      setError('Date of birth is required');
      return;
    }
    if (!gender) {
      setError('Gender is required');
      return;
    }

    setIsLoading(true);

    try {
      const resp = await fetch('/api/auth/complete-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, dateOfBirth, gender, phone }),
      });
      const body = await resp.json();

      if (!resp.ok) {
        setError(body?.error || 'Failed to update profile');
        setIsLoading(false);
        return;
      }

      // Auto sign-in with new credentials
      try {
        const { signIn } = await import('next-auth/react');
        const signRes = await signIn('credentials', {
          email: session.user.email,
          password,
          redirect: false,
        });

        if ((signRes as any)?.ok) {
          setSuccess(true);
          setTimeout(() => (window.location.href = '/dashboard'), 400);
          return;
        }
        setError(
          'Profile updated but automatic sign-in failed. Please sign in using your email and new password.'
        );
      } catch (err) {
        console.error('Automatic credentials sign-in failed:', err);
        setError(
          'Profile updated but automatic sign-in failed. Please sign in using your email and new password.'
        );
      }
    } catch (err) {
      console.error('complete-profile submit error:', err);
      setError('Server error while updating profile');
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="flex justify-center mb-6">
          <Link href="/" className="flex items-center gap-2 font-medium">
            <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
              <Dumbbell className="size-5" />
            </div>
            <span className="text-xl font-semibold">My Fitness League</span>
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <User className="size-6 text-primary" />
            </div>
            <CardTitle>Complete Your Profile</CardTitle>
            <CardDescription>
              Set a password and profile details to finish setting up your account
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email (readonly) */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={session.user?.email || ''}
                  disabled
                  className="bg-muted"
                />
              </div>

              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username">
                  Username <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => updateField('username', e.target.value)}
                    className="pl-10"
                    placeholder="Choose a username"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">
                  Password <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    className="pl-10 pr-10"
                    placeholder="At least 6 characters"
                    required
                    minLength={6}
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword((v) => !v)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4 text-muted-foreground" />
                    ) : (
                      <Eye className="size-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  Confirm Password <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => updateField('confirmPassword', e.target.value)}
                    className="pl-10 pr-10"
                    placeholder="Re-enter password"
                    required
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="size-4 text-muted-foreground" />
                    ) : (
                      <Eye className="size-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Date of Birth */}
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">
                  Date of Birth <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => updateField('dateOfBirth', e.target.value)}
                    className="pl-10"
                    max={new Date().toISOString().split('T')[0]}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Gender */}
              <div className="space-y-2">
                <Label htmlFor="gender">
                  Gender <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => updateField('gender', value)}
                  disabled={isLoading}
                >
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Phone (optional) */}
              <div className="space-y-2">
                <Label htmlFor="phone">Phone (optional)</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    className="pl-10"
                    placeholder="Your phone number"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Error Alert */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Success Alert */}
              {success && (
                <Alert className="border-green-200 bg-green-50 text-green-800">
                  <CheckCircle2 className="size-4 text-green-600" />
                  <AlertDescription>
                    Profile updated. Redirecting to dashboard...
                  </AlertDescription>
                </Alert>
              )}

              {/* Submit Button */}
              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Complete Profile'
                )}
              </Button>

              {/* Fallback sign-in link on error */}
              {error && (
                <p className="text-center text-sm text-muted-foreground">
                  <Button
                    type="button"
                    variant="link"
                    className="p-0 h-auto"
                    onClick={() => router.replace('/login')}
                  >
                    Sign in with your email instead
                  </Button>
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
