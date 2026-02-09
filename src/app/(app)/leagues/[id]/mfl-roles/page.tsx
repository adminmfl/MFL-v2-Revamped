'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, Shield, Users, User, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function MFLRolesPage() {
    return (
        <div className="flex flex-col gap-5 py-4 md:py-6">
            {/* Header */}
            <div className="px-4 lg:px-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
                    <div className="space-y-1">
                        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
                            MFL Roles – Standard Framework
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Understanding authority, responsibilities, and flow
                        </p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="px-4 lg:px-6 max-w-4xl mx-auto w-full space-y-4">
                {/* Player Role */}
                <Card className="shadow-sm">
                    <CardHeader className="pb-3">
                        <div className="flex items-start gap-3">
                            <div className="size-9 sm:size-10 rounded-lg bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center shadow-sm shrink-0">
                                <User className="size-4.5 sm:size-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                                    Player (Participant)
                                </CardTitle>
                                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                                    Participate honestly and consistently
                                </p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div>
                            <h4 className="text-sm font-semibold mb-2">Responsibilities:</h4>
                            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                                <li>Completes activities as per league rules</li>
                                <li>Logs activities accurately within deadlines</li>
                                <li>Maintains proof if required by league</li>
                                <li>Can correct entries only when rejected by Captain/Governor</li>
                                <li>Plays in the spirit of the league</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold mb-1">In-app usage:</h4>
                            <p className="text-sm text-muted-foreground">
                                Activity logging, score tracking, event participation
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Captain Role */}
                <Card className="shadow-sm">
                    <CardHeader className="pb-3">
                        <div className="flex items-start gap-3">
                            <div className="size-9 sm:size-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm shrink-0">
                                <Users className="size-4.5 sm:size-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                                    Captain (Team Leader & Motivator)
                                </CardTitle>
                                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                                    Enable participation, accuracy, and morale
                                </p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div>
                            <h4 className="text-sm font-semibold mb-2">Responsibilities:</h4>
                            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                                <li>Leads and coordinates a team</li>
                                <li>Helps players log activities correctly and on time</li>
                                <li>If a player logs incorrectly or misses a deadline: Captain can reject the entry, enabling re-submission within allowed window</li>
                                <li>Ensures team participation in events and challenges</li>
                                <li>First point of escalation before Governor involvement</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold mb-1">In-app powers:</h4>
                            <p className="text-sm text-muted-foreground">
                                Team management, review/reject team entries, coordination
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Governor Role */}
                <Card className="shadow-sm">
                    <CardHeader className="pb-3">
                        <div className="flex items-start gap-3">
                            <div className="size-9 sm:size-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm shrink-0">
                                <Shield className="size-4.5 sm:size-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                                    Governor (Fairness & Authority)
                                </CardTitle>
                                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                                    Protect integrity, fairness, and spirit of the league
                                </p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div>
                            <h4 className="text-sm font-semibold mb-2">Final authority on:</h4>
                            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                                <li>Rule interpretation</li>
                                <li>Disputes and edge cases</li>
                                <li>Exceptions and overrides</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold mb-2">Powers:</h4>
                            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                                <li>Can review all participant activity logs</li>
                                <li>Can reject incorrect entries and edit/correct logs after review</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold mb-2">Oversees:</h4>
                            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                                <li>Fair play and misuse</li>
                                <li>Medical or exceptional situations (if applicable)</li>
                                <li>Penalties or adjustments (if defined by league rules)</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold mb-1">In-app powers:</h4>
                            <p className="text-sm text-muted-foreground">
                                Global visibility, reject/edit entries, override corrections
                            </p>
                        </div>
                        <Badge variant="destructive" className="mt-2">
                            Governor decisions are final. No appeals
                        </Badge>
                    </CardContent>
                </Card>

                {/* Host Role */}
                <Card className="shadow-sm">
                    <CardHeader className="pb-3">
                        <div className="flex items-start gap-3">
                            <div className="size-9 sm:size-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-sm shrink-0">
                                <Crown className="size-4.5 sm:size-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                                    Host (League Owner)
                                </CardTitle>
                                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                                    Design, launch, and run the league
                                </p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div>
                            <h4 className="text-sm font-semibold mb-2">Responsibilities:</h4>
                            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                                <li>Creates the league, teams, events, rules, and scoring in MFL</li>
                                <li>Defines the vision and intent of the league (fitness, fun, friendship etc.)</li>
                                <li>Publishes all official announcements and timelines</li>
                                <li>Owns end-to-end execution and experience</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold mb-1">In-app powers:</h4>
                            <p className="text-sm text-muted-foreground">
                                League setup, event creation, announcements, full league visibility
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Universal Principles */}
                <Card className="border-primary/50 bg-primary/5 shadow-sm">
                    <CardHeader className="pb-3">
                        <div className="flex items-start gap-3">
                            <div className="size-9 sm:size-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-sm shrink-0">
                                <Info className="size-4.5 sm:size-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <CardTitle className="text-base sm:text-lg">Universal MFL Principles</CardTitle>
                                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                                    Applies unless explicitly overridden
                                </p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                            <li>If it's not logged correctly in the app, it doesn't count</li>
                            <li>Fair play and honesty matter more than rankings</li>
                            <li>Authority flows: Player → Captain → Governor</li>
                            <li>Governors safeguard trust so Hosts can run league</li>
                            <li>Rules are fixed once announced; changes are rare and explicit</li>
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
