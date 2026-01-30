'use client';

import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Crown,
  Lightbulb,
  Sliders,
  ArrowRight,
  Check,
  AlertCircle,
} from 'lucide-react';

export default function HostSupportPage() {
  return (
    <div className="flex flex-col gap-6 py-4 md:py-6">
      {/* Header */}
      <div className="flex flex-col gap-1 px-4 lg:px-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Crown className="size-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Host Support</h1>
            <p className="text-muted-foreground">League Kickoff Checklist</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 lg:px-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Section A */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div className="size-8 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center flex-shrink-0 mt-1">
                  <Lightbulb className="size-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">A) League Concept</CardTitle>
                  <CardDescription>What you're creating</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <p className="text-sm leading-relaxed">
                  A fitness league is a time-bound competition where members compete individually and/or in teams. Members log activities, submit challenges, and earn points based on their performance. You define the rules, duration, and how points are awarded.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-3">
                    <Check className="size-4 text-blue-600 mt-1 flex-shrink-0" />
                    <span className="text-sm">Members log fitness activities (workouts, rest days, challenges)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="size-4 text-blue-600 mt-1 flex-shrink-0" />
                    <span className="text-sm">You approve/reject submissions and award points</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="size-4 text-blue-600 mt-1 flex-shrink-0" />
                    <span className="text-sm">Leaderboards automatically rank members by points</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="size-4 text-blue-600 mt-1 flex-shrink-0" />
                    <span className="text-sm">League runs for a fixed duration (days you set)</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Section B */}
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div className="size-8 rounded-full bg-purple-100 dark:bg-purple-950 flex items-center justify-center flex-shrink-0 mt-1">
                  <Sliders className="size-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">B) MFL Settings Checklist</CardTitle>
                  <CardDescription>Configure before launch</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { title: 'Choose a Tier', desc: 'Select Basic, Medium, or Pro based on participant count and duration needs' },
                  { title: 'Set Start & End Dates', desc: 'Define the exact days the league runs (includes start and end day)' },
                  { title: 'Configure Teams', desc: 'Set number of teams and max participants per team' },
                  { title: 'Set Rest Days', desc: 'Define how many rest days members get during the league' },
                  { title: 'Enable Auto Rest Day', desc: 'Optional: Automatically give rest days on specific days (e.g., Sundays)' },
                  { title: 'Pick Activities', desc: 'Choose which activities count (running, gym, yoga, steps, etc.)' },
                  { title: 'Set Activity Minimums', desc: 'Define minimum duration/distance/steps per activity' },
                  { title: 'League Visibility', desc: 'Choose public (discoverable) or private (invite-only)' },
                  { title: 'Generate Invite Code', desc: 'Create and share unique code for members to join' },
                  { title: 'Upload Rules & Docs', desc: 'Add any league-specific rules or documentation' },
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-3 pb-3 border-b last:border-b-0 last:pb-0">
                    <div className="size-5 rounded-full bg-purple-100 dark:bg-purple-950 flex items-center justify-center flex-shrink-0 text-xs font-semibold text-purple-600 dark:text-purple-400">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="size-5" />
                Ready to Create?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Once you've reviewed both the concept and settings checklist, you're ready to launch your league!
              </p>
              <Button asChild className="w-full">
                <Link href="/leagues/create">
                  Create a League
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
