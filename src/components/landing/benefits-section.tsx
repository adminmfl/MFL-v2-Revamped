'use client';

import {
  Calculator,
  CalendarCheck,
  Bell,
  Sparkles,
  Lock,
  UserPlus,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// ============================================================================
// Types
// ============================================================================

interface Benefit {
  icon: React.ElementType;
  title: string;
  description: string;
}

// ============================================================================
// Benefits Data
// ============================================================================

const benefits: Benefit[] = [
  {
    icon: Calculator,
    title: 'Clear Scoring System',
    description: 'Every workout earns points. Transparent leaderboards keep motivation high.',
  },
  {
    icon: CalendarCheck,
    title: 'Weekly Check-ins',
    description: 'Teams stay active with weekly goals and progress tracking.',
  },
  {
    icon: Bell,
    title: 'Instant Team Updates',
    description: 'See who logged workouts and how your team is ranking in real-time.',
  },
  {
    icon: Sparkles,
    title: 'Zero Admin Work',
    description: 'MFL handles scoring, proof verification, and calculations automatically.',
  },
  {
    icon: Lock,
    title: 'Private Leagues',
    description: 'Create invite-only leagues for your team, gym, or organization.',
  },
  {
    icon: UserPlus,
    title: 'Easy Onboarding',
    description: 'Share a link or code. New members join in seconds.',
  },
];

// ============================================================================
// Benefits Section Component
// ============================================================================

export function BenefitsSection() {
  return (
    <section id="benefits" className="py-20 md:py-28">
      <div className="container max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How MFL Helps You Win
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              We've thought of everything so you can focus on what matters - getting fit together.
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              {benefits.map((benefit) => (
                <Card key={benefit.title} className="border-none shadow-none bg-muted/50">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <benefit.icon className="size-4 text-primary" />
                      </div>
                      <CardTitle className="text-base">{benefit.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {benefit.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Right: App Preview Card */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-3xl blur-2xl" />
            <Card className="relative bg-gradient-to-br from-primary to-primary/80 text-primary-foreground overflow-hidden">
              <CardContent className="p-6 md:p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                  <div>
                    <div className="text-lg font-semibold">Summer Sprint</div>
                    <div className="text-sm text-white/60">Team Phoenix</div>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-white/10 text-sm">
                    Active
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="text-4xl font-bold">3,200</div>
                    <div className="text-sm text-white/60">Points</div>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-bold">#2</div>
                    <div className="text-sm text-white/60">Rank</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-4">
                  <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                    <div className="h-2 rounded-full bg-amber-400 w-3/4 animate-pulse" />
                  </div>
                  <div className="mt-2 text-sm text-white/70">
                    24 workouts logged • 8 active members
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 mt-6">
                  <button className="flex-1 px-4 py-2.5 rounded-lg bg-white text-primary font-medium hover:bg-white/90 transition-colors">
                    Log Workout
                  </button>
                  <button className="px-4 py-2.5 rounded-lg border border-white/20 text-white font-medium hover:bg-white/10 transition-colors">
                    Invite
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

export default BenefitsSection;
