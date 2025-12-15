"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

// ============================================================================
// Types
// ============================================================================

interface NavItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  isActive?: boolean;
}

interface NavMainProps {
  items: NavItem[];
}

// ============================================================================
// NavMain Component
// ============================================================================

/**
 * NavMain - Main navigation component for the sidebar.
 *
 * Features:
 * - Renders navigation items with icons
 * - Supports active state highlighting
 * - Collapsible icon mode support
 * - Tooltips when collapsed
 */
export function NavMain({ items }: NavMainProps) {
  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                tooltip={item.title}
                isActive={item.isActive}
              >
                <Link href={item.url}>
                  {item.icon && <item.icon className="size-4" />}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export default NavMain;
