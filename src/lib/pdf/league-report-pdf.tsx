/**
 * League Report PDF Template
 * 
 * Styled according to user design reference:
 * Page 1: Summary, Activity, Rest Days
 * Page 2: Challenges, Leaderboard
 * Page 3: Final Performance, Celebration
 */

import React from 'react';
import {
    Document,
    Page,
    Text,
    View,
    Image,
    StyleSheet,
    Font,
    Svg,
    Path,
    Circle,
    Polygon,
} from '@react-pdf/renderer';
import type { LeagueReportData } from '@/lib/services/league-report';

// ============================================================================
// Styles
// ============================================================================

const theme = {
    blueDark: '#1E3A8A', // Navy blue
    bluePrimary: '#2563EB',
    blueLight: '#EFF6FF',
    grayText: '#374151',
    grayLight: '#F3F4F6',
    white: '#FFFFFF',
    accent: '#F59E0B', // Gold/Amber for trophies
};

const styles = StyleSheet.create({
    page: {
        padding: 30,
        fontFamily: 'Helvetica',
        backgroundColor: theme.white,
        flexDirection: 'column',
    },
    // Header
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        borderBottomWidth: 2,
        borderBottomColor: theme.blueDark,
        paddingBottom: 10,
        height: 70, // Fixed height for alignment
    },
    headerLogoBox: {
        width: 60,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logo: {
        width: '100%',
        height: '100%',
        objectFit: 'contain',
    },
    logoPlaceholder: {
        width: 50,
        height: 50,
        backgroundColor: theme.grayLight,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoPlaceholderText: {
        fontSize: 8,
        color: theme.grayText,
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    reportTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.blueDark,
        marginBottom: 5,
        textTransform: 'uppercase',
    },
    userName: {
        fontSize: 22,
        fontWeight: 'normal',
        color: theme.bluePrimary,
    },

    // Info Block (Page 1)
    infoBlock: {
        backgroundColor: theme.blueLight,
        padding: 15,
        borderRadius: 8,
        marginBottom: 25,
        borderLeftWidth: 4,
        borderLeftColor: theme.blueDark,
    },
    infoRow: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    infoLabel: {
        width: 140,
        fontSize: 10,
        fontWeight: 'bold',
        color: theme.blueDark,
    },
    infoValue: {
        flex: 1,
        fontSize: 10,
        color: theme.grayText,
    },
    scoreRow: {
        flexDirection: 'row',
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#DBEAFE',
    },
    finalScoreLabel: {
        fontSize: 11,
        fontWeight: 'bold',
        color: theme.blueDark,
        width: 140,
    },
    finalScoreValue: {
        fontSize: 11,
        fontWeight: 'bold',
        color: theme.bluePrimary,
    },

    // Sections
    section: {
        marginBottom: 25,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: theme.blueDark,
        textTransform: 'uppercase',
        paddingHorizontal: 10,
    },
    sectionLine: {
        flex: 1,
        height: 1,
        backgroundColor: theme.blueDark,
        opacity: 0.3,
    },

    // Activity Table
    table: {
        width: '100%',
        borderRadius: 6,
        overflow: 'hidden',
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: theme.blueDark,
        paddingVertical: 8,
        paddingHorizontal: 8,
    },
    tableHeaderCell: {
        color: theme.white,
        fontSize: 9,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: theme.grayLight,
        paddingVertical: 8,
        paddingHorizontal: 8,
        backgroundColor: theme.blueLight,
    },
    tableRowAlt: {
        backgroundColor: theme.white,
        borderBottomWidth: 1,
        borderBottomColor: theme.grayLight,
        paddingVertical: 8,
        paddingHorizontal: 8,
        flexDirection: 'row',
    },
    tableCell: {
        fontSize: 9,
        color: theme.grayText,
        textAlign: 'center',
    },
    activityNameCell: {
        textAlign: 'left',
        fontWeight: 'bold',
        color: theme.blueDark,
    },

    // Rest Days
    restDayBlock: {
        padding: 15,
        borderRadius: 8,
        backgroundColor: theme.grayLight,
    },
    restDayCount: {
        fontSize: 12,
        fontWeight: 'bold',
        color: theme.blueDark,
        marginBottom: 8,
    },
    restDayList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    restDayItem: {
        fontSize: 9,
        color: theme.grayText,
        backgroundColor: theme.white,
        paddingVertical: 3,
        paddingHorizontal: 6,
        borderRadius: 4,
    },

    // Challenges (Page 2)
    challengeRow: {
        flexDirection: 'row',
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: theme.grayLight,
        alignItems: 'center',
    },
    challengeCellName: {
        flex: 3,
        fontSize: 10,
        fontWeight: 'bold',
        color: theme.blueDark,
    },
    challengeCellType: {
        flex: 1,
        fontSize: 9,
        color: theme.grayText,
    },
    challengeCellStatus: {
        flex: 1.5,
        fontSize: 9,
        textAlign: 'center',
    },
    challengeCellPoints: {
        flex: 1,
        fontSize: 10,
        fontWeight: 'bold',
        color: theme.blueDark,
        textAlign: 'right',
    },

    // Leaderboard (Page 2)
    rankingContainer: {
        marginTop: 10,
        backgroundColor: theme.blueLight,
        borderRadius: 8,
        padding: 20,
    },
    rankingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#DBEAFE',
        paddingBottom: 5,
    },
    rankingLabel: {
        fontSize: 12,
        color: theme.grayText,
    },
    rankingValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.blueDark,
    },
    ordinalSuffix: {
        fontSize: 10,
    },

    // Performance (Page 3)
    perfHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.blueDark,
        textAlign: 'center',
        marginBottom: 30,
        marginTop: 20,
        textTransform: 'uppercase',
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 30,
        gap: 2,
    },
    statBox: {
        width: 100,
        backgroundColor: theme.blueDark,
        paddingVertical: 15,
        alignItems: 'center',
    },
    statBoxMiddle: {
        width: 100,
        backgroundColor: theme.bluePrimary,
        paddingVertical: 15,
        alignItems: 'center',
    },
    statBoxLabel: {
        fontSize: 9,
        color: theme.white,
        marginBottom: 5,
        opacity: 0.9,
    },
    statBoxValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.white,
    },
    challengePointsBlock: {
        backgroundColor: theme.grayLight,
        padding: 20,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 30,
    },
    cpLabel: {
        fontSize: 12,
        color: theme.blueDark,
        marginBottom: 5,
        fontWeight: 'bold',
    },
    cpValue: {
        fontSize: 36,
        fontWeight: 'bold',
        color: theme.bluePrimary,
    },

    finalRankBlock: {
        alignItems: 'center',
        marginBottom: 20,
        paddingVertical: 15,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: theme.grayLight,
    },
    finalRankLabel: {
        fontSize: 12,
        color: theme.grayText,
        marginBottom: 5,
    },
    finalRankValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.blueDark,
    },

    finalScoresRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 20,
        marginBottom: 40,
    },
    finalScoreText: {
        fontSize: 14,
        color: theme.grayText,
    },
    finalScoreHighlight: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.blueDark,
    },

    celebration: {
        alignItems: 'center',
        marginTop: 20,
    },
    badgesRow: {
        flexDirection: 'row',
        gap: 20,
        marginBottom: 20,
    },
    badgeCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: theme.accent,
        justifyContent: 'center',
        alignItems: 'center',
    },
    celebrationText: {
        fontSize: 14,
        color: theme.blueDark,
        fontWeight: 'bold',
        fontStyle: 'italic',
    },

    footer: {
        position: 'absolute',
        bottom: 20,
        left: 30,
        right: 30,
        textAlign: 'center',
        borderTopWidth: 1,
        borderTopColor: theme.grayLight,
        paddingTop: 10,
    },
    footerText: {
        fontSize: 8,
        color: '#9CA3AF',
    }
});

// ============================================================================
// Helper Functions
// ============================================================================

function formatDate(dateString: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function formatDuration(minutes: number | null): string {
    if (!minutes) return '0 min';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
        return `${hours} hr ${mins} min`;
    }
    return `${mins} min`;
}

function getOrdinal(n: number): string {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
}

// ============================================================================
// SVG Icons
// ============================================================================

const StarIcon = ({ size = 32 }: { size?: number }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
            fill="#FFFFFF"
            d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
        />
    </Svg>
);

const TrophyIcon = ({ size = 36 }: { size?: number }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
            fill="#FFFFFF"
            d="M20.2 2H3.8c-1.1 0-2 .9-2 2v3.5c0 1.9 1.5 3.5 3.4 3.5h.3c1 2.3 3.3 3.9 6 3.9s5-1.6 6-3.9h.3c1.9 0 3.4-1.6 3.4-3.5V4c0-1.1-.9-2-2-2zM5.2 7.5V4h2.1v3.5H5.2zm13.6 0H16.7V4h2.1v3.5zM12 14c-1.8 0-3.3-1.2-3.8-2.8h7.6c-.5 1.6-2 2.8-3.8 2.8z"
        />
        <Path
            fill="#FFFFFF"
            d="M10 16h4v2h-4zM7 19h10v3H7z"
        />
    </Svg>
);

const MedalIcon = ({ size = 32 }: { size?: number }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx="12" cy="12" r="8" fill="#F59E0B" />
        <Path fill="#FFFFFF" d="M12 6l1.5 4.5h4.5L14.25 13l1.5 4.5L12 15l-3.75 2.5 1.5-4.5L6 10.5h4.5z" />
    </Svg>
);

// ============================================================================
// Individual Components
// ============================================================================

const SectionHeader = ({ title }: { title: string }) => (
    <View style={styles.sectionHeader}>
        <View style={styles.sectionLine} />
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.sectionLine} />
    </View>
);

const Logo = ({ src, placeholderText }: { src: string | null, placeholderText: string }) => (
    <View style={styles.headerLogoBox}>
        {src ? (
            <Image src={src} style={styles.logo} />
        ) : (
            <View style={styles.logoPlaceholder}>
                <Text style={styles.logoPlaceholderText}>{placeholderText}</Text>
            </View>
        )}
    </View>
);

// ============================================================================
// Main PDF Component
// ============================================================================

interface LeagueReportPDFProps {
    data: LeagueReportData;
}

export function LeagueReportPDF({ data }: LeagueReportPDFProps) {
    return (
        <Document>
            {/* PAGE 1: Summary, Activity, Rest Days */}
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.headerContainer}>
                    <Logo src={data.league.logoUrl} placeholderText="LEAGUE" />
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.reportTitle}>League Summary Report</Text>
                        <Text style={styles.userName}>{data.user.username}</Text>
                    </View>
                    <Logo src={data.team?.logoUrl || null} placeholderText="TEAM" />
                </View>

                {/* Info Block */}
                <View style={styles.infoBlock}>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>League:</Text>
                        <Text style={styles.infoValue}>{data.league.name}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Team:</Text>
                        <Text style={styles.infoValue}>{data.team?.name || 'No Team'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>League Duration:</Text>
                        <Text style={styles.infoValue}>
                            {formatDate(data.league.startDate)} — {formatDate(data.league.endDate)}
                        </Text>
                    </View>
                    <View style={styles.scoreRow}>
                        <Text style={styles.finalScoreLabel}>Final Individual Score:</Text>
                        <Text style={styles.finalScoreValue}>{data.finalIndividualScore} Points</Text>
                    </View>
                    <View style={[styles.infoRow, { marginBottom: 0 }]}>
                        <Text style={styles.finalScoreLabel}>Final Team Score:</Text>
                        <Text style={styles.finalScoreValue}>{data.finalTeamScore} Points</Text>
                    </View>
                </View>

                {/* Activity Summary */}
                <View style={styles.section}>
                    <SectionHeader title="Activity Summary" />
                    <View style={styles.table}>
                        <View style={styles.tableHeader}>
                            <Text style={[styles.tableHeaderCell, { flex: 2, textAlign: 'left' }]}>Activity</Text>
                            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Sessions</Text>
                            <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Distance/Count</Text>
                            <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Duration</Text>
                        </View>
                        {data.activities.length > 0 ? (
                            data.activities.map((activity, index) => (
                                <View key={index} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                                    <Text style={[styles.tableCell, styles.activityNameCell, { flex: 2 }]}>
                                        {activity.activityName}
                                    </Text>
                                    <Text style={[styles.tableCell, { flex: 1 }]}>
                                        {activity.sessionCount} Sessions
                                    </Text>
                                    <Text style={[styles.tableCell, { flex: 1.5 }]}>
                                        {activity.totalDistance ? `${activity.totalDistance.toFixed(1)} km` :
                                            activity.totalSteps ? `${activity.totalSteps.toLocaleString()}` :
                                                activity.totalHoles ? `${activity.totalHoles} holes` : '-'}
                                    </Text>
                                    <Text style={[styles.tableCell, { flex: 1.5 }]}>
                                        {formatDuration(activity.totalDuration)}
                                    </Text>
                                </View>
                            ))
                        ) : (
                            <View style={styles.tableRow}>
                                <Text style={[styles.tableCell, { flex: 1, padding: 20 }]}>No activities recorded.</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Rest Days */}
                <View style={styles.section}>
                    <SectionHeader title="Rest Days" />
                    <View style={styles.restDayBlock}>
                        <Text style={styles.restDayCount}>Total Rest Days: {data.restDays.total} Days</Text>
                        <View style={styles.restDayList}>
                            {data.restDays.dates.length > 0 ? (
                                <>
                                    <Text style={{ fontSize: 10, color: theme.blueDark, marginRight: 5 }}>Rest Dates:</Text>
                                    {data.restDays.dates.map((date, index) => (
                                        <Text key={index} style={styles.restDayItem}>
                                            {formatDate(date)}
                                        </Text>
                                    ))}
                                </>
                            ) : (
                                <Text style={{ fontSize: 10, color: theme.grayText }}>No rest days taken.</Text>
                            )}
                        </View>
                    </View>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Page 1 of 3 • MyFitnessLeague Report</Text>
                </View>
            </Page>

            {/* PAGE 2: Challenges & Leaderboard */}
            <Page size="A4" style={styles.page}>
                <View style={{ marginBottom: 30 }}>
                    <Text style={styles.reportTitle}>CHALLENGES SUMMARY</Text>
                    <View style={{ height: 2, backgroundColor: theme.blueDark, width: 60, marginTop: 5 }} />
                </View>

                {/* Challenges Table */}
                <View style={styles.section}>
                    <View style={[styles.tableHeader, { marginBottom: 0, borderTopLeftRadius: 6, borderTopRightRadius: 6 }]}>
                        <Text style={[styles.tableHeaderCell, { flex: 3, textAlign: 'left' }]}>Challenges Summary</Text>
                        <Text style={[styles.tableHeaderCell, { flex: 1, opacity: 0 }]}></Text>
                        <Text style={[styles.tableHeaderCell, { flex: 1.5, opacity: 0 }]}></Text>
                        <Text style={[styles.tableHeaderCell, { flex: 1, opacity: 0 }]}></Text>
                    </View>

                    {data.challenges.length > 0 ? (
                        data.challenges.map((c, i) => (
                            <View key={i} style={styles.challengeRow}>
                                <Text style={styles.challengeCellName}>{c.name}</Text>
                                <Text style={styles.challengeCellType}>{c.type === 'sub_team' ? 'Sub Team' : c.type.charAt(0).toUpperCase() + c.type.slice(1)}</Text>
                                <Text style={[styles.challengeCellStatus, {
                                    color: c.status === 'Completed' ? theme.bluePrimary : theme.grayText
                                }]}>
                                    {c.status}
                                </Text>
                                <Text style={styles.challengeCellPoints}>{c.pointsEarned} Points</Text>
                            </View>
                        ))
                    ) : (
                        <View style={[styles.challengeRow, { padding: 20, justifyContent: 'center' }]}>
                            <Text style={{ fontSize: 10, color: theme.grayText }}>No challenges participated.</Text>
                        </View>
                    )}
                </View>

                {/* Leaderboard */}
                <View style={[styles.section, { marginTop: 40 }]}>
                    <View style={[styles.tableHeader, { marginBottom: 0, borderTopLeftRadius: 6, borderTopRightRadius: 6 }]}>
                        <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'left' }]}>LEADERBOARD & RANKINGS</Text>
                    </View>
                    <View style={styles.rankingContainer}>
                        {data.team && (
                            <View style={styles.rankingRow}>
                                <Text style={styles.rankingLabel}>Your Team Rank:</Text>
                                <View style={{ flexDirection: 'row' }}>
                                    <Text style={styles.rankingValue}>{data.rankings.userRankInTeam}</Text>
                                    <Text style={[styles.rankingValue, styles.ordinalSuffix]}>{getOrdinal(data.rankings.userRankInTeam)}</Text>
                                    <Text style={styles.rankingValue}> Place</Text>
                                </View>
                            </View>
                        )}
                        <View style={styles.rankingRow}>
                            <Text style={styles.rankingLabel}>Your Individual Rank:</Text>
                            <View style={{ flexDirection: 'row' }}>
                                <Text style={styles.rankingValue}>{data.rankings.userRankInLeague}</Text>
                                <Text style={[styles.rankingValue, styles.ordinalSuffix]}>{getOrdinal(data.rankings.userRankInLeague)}</Text>
                                <Text style={styles.rankingValue}> Place</Text>
                            </View>
                        </View>
                        {data.team && (
                            <View style={[styles.rankingRow, { borderBottomWidth: 0 }]}>
                                <Text style={styles.rankingLabel}>Overall Team Rank:</Text>
                                <View style={{ flexDirection: 'row' }}>
                                    <Text style={styles.rankingValue}>{data.rankings.teamRankInLeague}</Text>
                                    <Text style={[styles.rankingValue, styles.ordinalSuffix]}>{getOrdinal(data.rankings.teamRankInLeague)}</Text>
                                    <Text style={styles.rankingValue}> Place</Text>
                                </View>
                            </View>
                        )}
                    </View>
                    <View style={{ alignItems: 'center', marginTop: 10 }}>
                        <Text style={{ fontSize: 10, color: theme.grayText }}>
                            Total Points: <Text style={{ fontFamily: 'Helvetica-Bold' }}>{data.finalIndividualScore}</Text> (Personal)
                            {data.team && (
                                <Text>, <Text style={{ fontFamily: 'Helvetica-Bold' }}>{data.finalTeamScore}</Text> (Team)</Text>
                            )}
                        </Text>
                    </View>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Page 2 of 3 • MyFitnessLeague Report</Text>
                </View>
            </Page>

            {/* PAGE 3: Performance Summary */}
            <Page size="A4" style={styles.page}>
                <Text style={styles.perfHeader}>Final Performance Summary</Text>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <View style={styles.statBox}>
                        <Text style={styles.statBoxLabel}>Total Activities</Text>
                        <Text style={styles.statBoxValue}>{data.performance.totalActivities}</Text>
                    </View>
                    <View style={styles.statBoxMiddle}>
                        <Text style={styles.statBoxLabel}>Active Days</Text>
                        <Text style={styles.statBoxValue}>{data.performance.totalActiveDays}</Text>
                    </View>
                    <View style={styles.statBoxMiddle}>
                        <Text style={styles.statBoxLabel}>Rest Days</Text>
                        <Text style={styles.statBoxValue}>{data.performance.totalRestDays}</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statBoxLabel}>Missed Days</Text>
                        <Text style={styles.statBoxValue}>{data.performance.totalMissedDays}</Text>
                    </View>
                </View>

                {/* Challenge Points */}
                <View style={styles.challengePointsBlock}>
                    <Text style={styles.cpLabel}>Challenge Points Scored</Text>
                    <Text style={styles.cpValue}>{data.performance.totalChallengePoints}</Text>
                </View>

                {/* Final Ranks & Scores */}
                <View style={styles.finalRankBlock}>
                    <Text style={styles.finalRankLabel}>Overall League Rank:</Text>
                    <View style={{ flexDirection: 'row' }}>
                        <Text style={styles.finalRankValue}>{data.rankings.userRankInLeague}</Text>
                        <Text style={[styles.finalRankValue, styles.ordinalSuffix, { fontSize: 12, marginTop: 0 }]}>{getOrdinal(data.rankings.userRankInLeague)}</Text>
                        <Text style={styles.finalRankValue}> Place</Text>
                    </View>
                </View>

                <View style={styles.finalScoresRow}>
                    <Text style={styles.finalScoreText}>
                        Total Points Scored: <Text style={styles.finalScoreHighlight}>{data.finalIndividualScore}</Text> Personal
                    </Text>
                    {data.team && (
                        <Text style={styles.finalScoreText}>
                            |   <Text style={styles.finalScoreHighlight}>{data.finalTeamScore}</Text> Team
                        </Text>
                    )}
                </View>

                {/* Celebration */}
                <View style={styles.celebration}>
                    <View style={styles.badgesRow}>
                        {/* Visual badges/icons using pure CSS shapes for now as we lack images */}
                        <View style={[styles.badgeCircle, { backgroundColor: '#FCD34D' }]}>
                            <StarIcon />
                        </View>
                        <View style={[styles.badgeCircle, { backgroundColor: '#F59E0B', width: 60, height: 60, borderRadius: 30, marginTop: -10 }]}>
                            <TrophyIcon />
                        </View>
                        <View style={[styles.badgeCircle, { backgroundColor: '#FCD34D' }]}>
                            <MedalIcon />
                        </View>
                    </View>
                    <Text style={styles.celebrationText}>Congratulations on a great season!</Text>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Page 3 of 3 • MyFitnessLeague Report</Text>
                </View>
            </Page>
        </Document>
    );
}

export default LeagueReportPDF;
