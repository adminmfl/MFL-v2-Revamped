"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ThemeToggle } from "@/components/theme-toggle";

// ============================================================================
// Route Title Mapping
// ============================================================================

const routeTitles: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/users": "Users",
  "/admin/leagues": "Leagues",
  "/admin/submissions": "Submissions",
  "/admin/financial": "Financial",
  "/admin/pricing": "Pricing",
  "/admin/activities": "Activities",
  "/admin/challenges": "Challenges",
  "/admin/settings": "Settings",
  "/admin/roles": "Roles",
  "/admin/dashboard": "Dashboard",
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Gets the page title from the current pathname.
 */
function getPageTitle(pathname: string | null): string {
  if (!pathname) return "Dashboard";
  return routeTitles[pathname] || "Dashboard";
}

/**
 * Generates breadcrumb items from the pathname.
 */
function getBreadcrumbs(pathname: string | null): { label: string; href: string }[] {
  if (!pathname) return [];

  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs: { label: string; href: string }[] = [];

  let currentPath = "";
  for (const segment of segments) {
    currentPath += `/${segment}`;
    const title = routeTitles[currentPath] || segment.charAt(0).toUpperCase() + segment.slice(1);
    breadcrumbs.push({ label: title, href: currentPath });
  }

  return breadcrumbs;
}

// ============================================================================
// SiteHeader Component
// ============================================================================

/**
 * SiteHeader - Top header component for the admin dashboard.
 *
 * Features:
 * - Sidebar toggle trigger
 * - Dynamic page title based on route
 * - Breadcrumb navigation
 * - Dark/Light mode toggle
 * - Link to main dashboard
 */
export function SiteHeader() {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);
  const breadcrumbs = getBreadcrumbs(pathname);

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        {/* Sidebar Toggle */}
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />

        {/* Breadcrumb Navigation */}
        <Breadcrumb className="hidden sm:flex">
          <BreadcrumbList>
            {breadcrumbs.map((crumb, index) => (
              <BreadcrumbItem key={crumb.href}>
                {index === breadcrumbs.length - 1 ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <>
                    <BreadcrumbLink asChild>
                      <Link href={crumb.href}>{crumb.label}</Link>
                    </BreadcrumbLink>
                    <BreadcrumbSeparator />
                  </>
                )}
              </BreadcrumbItem>
            ))}
          </BreadcrumbList>
        </Breadcrumb>

        {/* Mobile Title */}
        <h1 className="text-base font-medium sm:hidden">{pageTitle}</h1>

        {/* Right Side Actions */}
        <div className="ml-auto flex items-center gap-2">
          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Main Dashboard Link */}
          <Button variant="ghost" asChild size="sm" className="hidden sm:flex">
            <Link href="/dashboard">
              <Home className="mr-1 size-4" />
              Main Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

export default SiteHeader;
