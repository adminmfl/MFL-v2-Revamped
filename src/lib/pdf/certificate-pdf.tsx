/**
 * Certificate of Completion PDF
 * FINAL – single page, no overlap, react-pdf safe
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
} from '@react-pdf/renderer';
import type { LeagueReportData } from '@/lib/services/league-report';

// ============================================================================
// Theme
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
// Styles (STRICTLY react-pdf SAFE)
// ============================================================================

const styles = StyleSheet.create({
    page: {
        padding: 28,
        backgroundColor: theme.cream,
        fontFamily: 'Helvetica',
        justifyContent: 'center',
    },

    certificate: {
        backgroundColor: theme.white,
        borderWidth: 3,
        borderColor: theme.gold,
        padding: 20,
        position: 'relative',
    },

    innerBorder: {
        borderWidth: 1,
        borderColor: theme.goldLight,
        padding: 18,
        alignItems: 'center',
    },

    /* Corners */
    cornerTL: { position: 'absolute', top: 8, left: 8 },
    cornerTR: { position: 'absolute', top: 8, right: 8 },
    cornerBL: { position: 'absolute', bottom: 8, left: 8 },
    cornerBR: { position: 'absolute', bottom: 8, right: 8 },

    /* Title */
    titleContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },

    brandText: {
        fontSize: 13,
        fontFamily: 'Helvetica-Bold',
        color: theme.goldDark,
        marginBottom: 6,
    },

    brandDivider: {
        width: 90,
        height: 2,
        backgroundColor: theme.goldLight,
        marginBottom: 14,
    },

    mainTitle: {
        fontSize: 32,
        fontFamily: 'Times-Italic',
        color: theme.gold,
        marginBottom: 6,
        textAlign: 'center',
    },

    subtitle: {
        fontSize: 11,
        color: theme.textMuted,
    },

    /* Recipient */
    recipientContainer: {
        alignItems: 'center',
        marginVertical: 18,
    },

    recipientName: {
        fontSize: 30,
        fontFamily: 'Times-Bold',
        color: theme.navy,
        marginBottom: 10,
    },

    recipientText: {
        fontSize: 13,
        fontFamily: 'Times-Roman',
        color: theme.textDark,
    },

    /* League */
    leagueContainer: {
        alignItems: 'center',
        marginVertical: 14,
    },

    leagueName: {
        fontSize: 22,
        fontFamily: 'Helvetica-Bold',
        color: theme.navy,
        marginBottom: 6,
    },

    leagueDates: {
        fontSize: 11,
        fontFamily: 'Times-Italic',
        color: theme.textMuted,
    },

    /* Winner */
    sealContainer: {
        alignItems: 'center',
        marginTop: 18,
        marginBottom: 18,
    },

    winnerBadge: {
        marginTop: 8,
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: theme.goldLight,
    },

    sealText: {
        fontSize: 10,
        fontFamily: 'Helvetica-Bold',
        color: theme.goldDark,
    },

    /* Footer */
    dateContainer: {
        alignItems: 'center',
        marginTop: 12,
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
// Helpers
// ============================================================================

const formatDate = (date?: string) =>
    date
        ? new Date(date).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
          })
        : '-';

const formatDateShort = (date?: string) =>
    date
        ? new Date(date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
          })
        : '-';

// ============================================================================
// SVG Components
// ============================================================================

const CornerFlourish = ({ rotation = 0 }: { rotation?: number }) => (
    <Svg width={56} height={56} viewBox="0 0 60 60" style={{ transform: `rotate(${rotation}deg)` }}>
        <G>
            <Path
                d="M5 5 Q 30 5 55 30 Q 55 50 40 55"
                stroke={theme.gold}
                strokeWidth={2}
                fill="none"
            />
            <Circle cx={8} cy={8} r={3} fill={theme.gold} />
        </G>
    </Svg>
);

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
// MAIN COMPONENT (NAMED EXPORT – REQUIRED)
// ============================================================================

interface CertificatePDFProps {
    data: LeagueReportData;
}

export function CertificatePDF({ data }: CertificatePDFProps) {
    const issueDate = formatDate(data.generatedAt);
    const leagueDates = `Held from ${formatDateShort(
        data.league.startDate
    )} to ${formatDateShort(data.league.endDate)}, ${new Date(
        data.league.endDate
    ).getFullYear()}`;

    return (
        <Document>
            <Page
                size="A4"
                orientation="landscape"
                style={styles.page}
                wrap={false}
            >
                <View style={styles.certificate} wrap={false}>

                    {/* Corners */}
                    <View style={styles.cornerTL}><CornerFlourish /></View>
                    <View style={styles.cornerTR}><CornerFlourish rotation={90} /></View>
                    <View style={styles.cornerBL}><CornerFlourish rotation={270} /></View>
                    <View style={styles.cornerBR}><CornerFlourish rotation={180} /></View>

                    <View style={styles.innerBorder} wrap={false}>

                        {/* Title */}
                        <View style={styles.titleContainer}>
                            <Text style={styles.brandText}>MY FITNESS LEAGUE</Text>
                            <View style={styles.brandDivider} />
                            <Text style={styles.mainTitle}>Certificate of Completion</Text>
                            <Text style={styles.subtitle}>This is to certify that</Text>
                        </View>

                        {/* Recipient */}
                        <View style={styles.recipientContainer}>
                            <Text style={styles.recipientName}>
                                {data.user.username}
                            </Text>
                            <Text style={styles.recipientText}>
                                has successfully completed the
                            </Text>
                        </View>

                        {/* League */}
                        <View style={styles.leagueContainer}>
                            <Text style={styles.leagueName}>
                                {data.league.name}
                            </Text>
                            <Text style={styles.leagueDates}>
                                {leagueDates}
                            </Text>
                        </View>

                        {/* Winner */}
                        <View style={styles.sealContainer}>
                            <WinnerSeal />
                            <View style={styles.winnerBadge}>
                                <Text style={styles.sealText}>
                                    #{data.rankings.userRankInLeague} PLACE • {data.finalIndividualScore} POINTS
                                </Text>
                            </View>
                        </View>

                        {/* Date */}
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
