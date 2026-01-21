"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Dumbbell } from "lucide-react";

import { LoginForm } from "@/components/auth/login-form";

// ============================================================================
// Config
// ============================================================================

export const dynamic = "force-dynamic";

// ============================================================================
// LoginPage Component
// ============================================================================

export default function LoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();

  const callbackUrl = searchParams?.get("callbackUrl") || "/dashboard";

  // Redirect authenticated users
  useEffect(() => {
    if (status === "authenticated") {
      const user = session?.user as any;
      const needsProfileCompletion = user?.needsProfileCompletion;
      const isAdmin = user?.platform_role === 'admin';

      if (needsProfileCompletion) {
        router.replace("/complete-profile");
      } else if (isAdmin && callbackUrl === "/dashboard") {
        // Redirect admins to /admin unless they have a specific callbackUrl
        router.replace("/admin");
      } else {
        // Default: try to land the user on their first league dashboard.
        (async () => {
          try {
            if (callbackUrl === "/dashboard") {
              const res = await fetch("/api/leagues");
              if (res.ok) {
                const json = await res.json();
                const leagues = Array.isArray(json?.data) ? json.data : [];
                const first = leagues[0];
                const firstId = first?.league_id || first?.id || first?.leagueId;
                if (firstId) {
                  router.replace(`/leagues/${firstId}`);
                  return;
                }
              }
            }
          } catch (err) {
            console.error("Login redirect league fetch failed:", err);
          }

          // Fallback to provided callbackUrl (or /dashboard)
          router.replace(callbackUrl);
        })();
      }
    }
  }, [status, session, router, callbackUrl]);

  if (status === "loading") {
    return (
      <div className="min-h-svh flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (status === "authenticated") {
    return null;
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Left Side - Form */}
      <div className="flex flex-col gap-4 p-6 md:p-10 bg-background">
        {/* Brand */}
        <div className="flex justify-center gap-2 md:justify-start">
          <Link href="/" className="flex items-center gap-2 font-medium">
            <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
              <Dumbbell className="size-4" />
            </div>
            My Fitness League
          </Link>
        </div>

        {/* Form Container */}
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm callbackUrl={callbackUrl} />
          </div>
        </div>
      </div>

      {/* Right Side - Image */}
      <div className="bg-muted relative hidden lg:block">
        <img
          src="/images/auth-bg.jpg"
          alt="Fitness"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
    </div>
  );
}
