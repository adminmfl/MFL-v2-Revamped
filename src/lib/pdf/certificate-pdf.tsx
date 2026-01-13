/**
 * Certificate of Completion PDF
 * 
 * Elegant certificate design for league completion.
 * Features:
 * - Decorative corner elements
 * - User name prominently displayed
 * - League name and dates
 * - Winner badge/seal
 * - Clean, professional styling
 */

import React from 'react';
import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    Svg,
    Path,
    Circle,
    G,
    Defs,
    LinearGradient,
    Stop,
} from '@react-pdf/renderer';
import type { LeagueReportData } from '@/lib/services/league-report';

// ============================================================================
// Theme & Color Palette
// ============================================================================

const theme = {
    gold: '#C9A227',
    goldLight: '#E8D48A',
    goldDark: '#8B6914',
    navy: '#1E3A5F',
    cream: '#FDF8EC',
    white: '#FFFFFF',
    textDark: '#2C3E50',
    textMuted: '#7F8C8D',
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontFamily: 'Helvetica',
        backgroundColor: theme.cream,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
    },
    certificate: {
        width: '100%',
        height: '100%',
        backgroundColor: theme.white,
        borderWidth: 3,
        borderColor: theme.gold,
        padding: 30,
        position: 'relative',
    },
    innerBorder: {
        width: '100%',
        height: '100%',
        borderWidth: 1,
        borderColor: theme.goldLight,
        padding: 20,
        alignItems: 'center',
    },
    // Corner Decorations
    cornerTL: {
        position: 'absolute',
        top: 10,
        left: 10,
    },
    cornerTR: {
        position: 'absolute',
        top: 10,
        right: 10,
    },
    cornerBL: {
        position: 'absolute',
        bottom: 10,
        left: 10,
    },
    cornerBR: {
        position: 'absolute',
        bottom: 10,
        right: 10,
    },
    // Title
    titleContainer: {
        marginTop: 20,
        marginBottom: 30,
        alignItems: 'center',
    },
    mainTitle: {
        fontSize: 36,
        color: theme.gold,
        fontFamily: 'Times-Italic',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 12,
        color: theme.textMuted,
        marginTop: 25,
        letterSpacing: 3,
        textTransform: 'uppercase',
    },
    // Recipient
    recipientContainer: {
        marginVertical: 20,
        alignItems: 'center',
    },
    recipientName: {
        fontSize: 32,
        color: theme.navy,
        fontFamily: 'Times-Bold',
        textAlign: 'center',
        marginVertical: 10,
        marginBottom: 20,
    },
    recipientText: {
        fontSize: 14,
        color: theme.textDark,
        textAlign: 'center',
        fontFamily: 'Times-Roman',
    },
    // League Info
    leagueContainer: {
        marginVertical: 15,
        alignItems: 'center',
    },
    leagueName: {
        fontSize: 24,
        color: theme.navy,
        fontFamily: 'Helvetica-Bold',
        textAlign: 'center',
        marginBottom: 15,
    },
    leagueDates: {
        fontSize: 11,
        color: theme.textMuted,
        fontFamily: 'Times-Italic',
        textAlign: 'center',
    },
    // Badge/Seal
    sealContainer: {
        marginTop: 25,
        marginBottom: 15,
        alignItems: 'center',
    },
    sealText: {
        marginTop: 8,
        fontSize: 10,
        color: theme.gold,
        fontWeight: 'bold',
        letterSpacing: 2,
    },
    // Date
    dateContainer: {
        marginTop: 'auto',
        alignItems: 'center',
    },
    dateText: {
        fontSize: 10,
        color: theme.textMuted,
    },
    dateValue: {
        fontSize: 12,
        color: theme.textDark,
        marginTop: 4,
    },
});

// ============================================================================
// Helper Functions
// ============================================================================

function formatDate(dateString: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });
}

function formatDateShort(dateString: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    });
}

function getOrdinal(n: number): string {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
}

// ============================================================================
// SVG Components
// ============================================================================

// Corner flourish decoration
const CornerFlourish = ({ rotation = 0 }: { rotation?: number }) => (
    <Svg width={60} height={60} viewBox="0 0 60 60" style={{ transform: `rotate(${rotation}deg)` }}>
        <G>
            {/* Main curved flourish */}
            <Path
                d="M5 5 Q 30 5 55 30 Q 55 50 40 55"
                stroke={theme.gold}
                strokeWidth={2}
                fill="none"
            />
            <Path
                d="M10 5 Q 25 10 40 30"
                stroke={theme.goldLight}
                strokeWidth={1}
                fill="none"
            />
            {/* Small decorative circle */}
            <Circle cx={8} cy={8} r={3} fill={theme.gold} />
            <Circle cx={15} cy={5} r={2} fill={theme.goldLight} />
        </G>
    </Svg>
);

// Winner seal/badge
const WinnerSeal = () => (
    <Svg width={100} height={100} viewBox="0 0 100 100">
        {/* Outer decorative ring */}
        <Circle cx={50} cy={50} r={45} fill="none" stroke={theme.goldLight} strokeWidth={2} />
        {/* Main seal */}
        <Circle cx={50} cy={50} r={40} fill={theme.gold} />
        {/* Inner ring */}
        <Circle cx={50} cy={50} r={32} fill="none" stroke={theme.white} strokeWidth={2} />
        {/* Trophy icon */}
        <G>
            {/* Trophy cup */}
            <Path
                d="M35 30 L35 45 Q35 55 50 55 Q65 55 65 45 L65 30 Z"
                fill={theme.white}
            />
            {/* Trophy handles */}
            <Path
                d="M35 32 Q25 32 25 40 Q25 48 35 48"
                stroke={theme.white}
                strokeWidth={3}
                fill="none"
            />
            <Path
                d="M65 32 Q75 32 75 40 Q75 48 65 48"
                stroke={theme.white}
                strokeWidth={3}
                fill="none"
            />
            {/* Trophy base */}
            <Path
                d="M45 55 L45 62 L40 62 L40 68 L60 68 L60 62 L55 62 L55 55"
                fill={theme.white}
            />
        </G>
        {/* Stars around seal */}
        <Path d="M50 8 L52 14 L58 14 L53 18 L55 24 L50 20 L45 24 L47 18 L42 14 L48 14 Z" fill={theme.goldLight} />
    </Svg>
);

// ============================================================================
// Main Component
// ============================================================================

interface CertificatePDFProps {
    data: LeagueReportData;
}

export function CertificatePDF({ data }: CertificatePDFProps) {
    const issueDate = formatDate(data.generatedAt);
    const leagueDates = `Held from ${formatDateShort(data.league.startDate)} to ${formatDateShort(data.league.endDate)}, ${new Date(data.league.endDate).getFullYear()}`;

    return (
        <Document>
            <Page size="A4" orientation="landscape" style={styles.page}>
                <View style={styles.certificate}>
                    {/* Corner Decorations */}
                    <View style={styles.cornerTL}>
                        <CornerFlourish rotation={0} />
                    </View>
                    <View style={styles.cornerTR}>
                        <CornerFlourish rotation={90} />
                    </View>
                    <View style={styles.cornerBL}>
                        <CornerFlourish rotation={270} />
                    </View>
                    <View style={styles.cornerBR}>
                        <CornerFlourish rotation={180} />
                    </View>

                    {/* Inner Border Container */}
                    <View style={styles.innerBorder}>
                        {/* Title Section */}
                        <View style={styles.titleContainer}>
                            <Text style={styles.mainTitle}>Certificate of Completion</Text>
                            <Text style={styles.subtitle}>This is to certify that</Text>
                        </View>

                        {/* Recipient Section */}
                        <View style={styles.recipientContainer}>
                            <Text style={styles.recipientName}>{data.user.username}</Text>
                            <Text style={styles.recipientText}>has successfully completed the</Text>
                        </View>

                        {/* League Info */}
                        <View style={styles.leagueContainer}>
                            <Text style={styles.leagueName}>{data.league.name}</Text>
                            <Text style={styles.leagueDates}>{leagueDates}</Text>
                        </View>

                        {/* Winner Seal */}
                        <View style={styles.sealContainer}>
                            <WinnerSeal />
                            <Text style={styles.sealText}>
                                #{data.rankings.userRankInLeague} PLACE • {data.finalIndividualScore} POINTS
                            </Text>
                        </View>

                        {/* Issue Date */}
                        <View style={styles.dateContainer}>
                            <Text style={styles.dateText}>Issue Date</Text>
                            <Text style={styles.dateValue}>{issueDate}</Text>
                        </View>
                    </View>
                </View>
            </Page>
        </Document>
    );
}

export default CertificatePDF;
