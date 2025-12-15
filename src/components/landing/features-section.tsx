'use client';

import { Trophy, Dumbbell, Flame, Users } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface Feature {
  icon: React.ElementType;
  title: string;
  description: string;
}

// ============================================================================
// Features Data
// ============================================================================

const features: Feature[] = [
  {
    icon: Trophy,
    title: 'Compete',
    description: 'Join weekly or seasonal leagues with friends and coworkers.',
  },
  {
    icon: Dumbbell,
    title: 'Track',
    description: 'Log workouts with proof. Every rep counts toward your score.',
  },
  {
    icon: Flame,
    title: 'Stay Motivated',
    description: 'Build streaks, earn badges, and crush your fitness goals.',
  },
  {
    icon: Users,
    title: 'Connect',
    description: 'Build fitness communities and compete as a team.',
  },
];

// ============================================================================
// Features Section Component
// ============================================================================

export function FeaturesSection() {
  return (
    <section id="features" className="py-12 md:py-16 bg-muted/30">
      <div className="container max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
        {/* Section Header */}
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">
            What You Can Do
          </h2>
          <p className="text-muted-foreground">
            Everything you need to run fitness competitions.
          </p>
        </div>

        {/* Features - Horizontal layout */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="flex flex-col items-center text-center p-6 rounded-xl bg-background border hover:shadow-md transition-shadow"
            >
              <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <feature.icon className="size-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default FeaturesSection;
