import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useDatabase } from '@/context/DatabaseContext';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { formatCurrencyFull, MONTHS } from '@/utils/format';
import { startOfDay, endOfDay, startOfWeek, startOfMonth, endOfMonth } from '@/db/database';

type Period = 'today' | 'week' | 'month' | 'year';

interface ReportData {
  total_sales: number;
  total_profit: number;
  total_expenses: number;
  net_profit: number;
  cash: number;
  upi: number;
  credit: number;
  count: number;
}

export default function ReportsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getReportData, getMonthlyBreakdown } = useDatabase();
  const { settings } = useApp();
  const sym = settings.currency_symbol;

  const [period, setPeriod] = useState<Period>('today');
  const [data, setData] = useState<ReportData | null>(null);
  const [monthly, setMonthly] = useState<{ month: number; year: number; sales: number; profit: number; expenses: number }[]>([]);

  const load = useCallback(async () => {
    const now = new Date();
    let start: number, end: number;
    if (period === 'today') { start = startOfDay(now); end = endOfDay(now); }
    else if (period === 'week') { start = startOfWeek(now); end = endOfDay(now); }
    else if (period === 'month') { start = startOfMonth(now); end = endOfMonth(now); }
    else { start = new Date(now.getFullYear(), 0, 1).getTime(); end = new Date(now.getFullYear(), 11, 31, 23, 59, 59).getTime(); }

    const report = await getReportData(start, end);
    setData(report);
    if (period === 'year') {
      const mb = await getMonthlyBreakdown(now.getFullYear());
      setMonthly(mb);
    }
  }, [period, getReportData, getMonthlyBreakdown]);

  useEffect(() => { load(); }, [load]);

  const botPad = Platform.OS === 'web' ? 34 : insets.bottom + 10;
  const PERIODS: { key: Period; label: string }[] = [
    { key: 'today', label: 'Today' }, { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' }, { key: 'year', label: 'Year' },
  ];

  const StatItem = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <View style={[styles.statItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.statValue, { color }]}>{formatCurrencyFull(value, sym)}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Reports" onBack={() => router.back()} />

      {/* Period Tabs */}
      <View style={[styles.tabRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {PERIODS.map(p => (
          <TouchableOpacity key={p.key} style={[styles.tab, period === p.key && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]} onPress={() => setPeriod(p.key)}>
            <Text style={[styles.tabText, { color: period === p.key ? colors.primary : colors.mutedForeground }]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: botPad + 20 }]}>
        {data && (
          <>
            {/* Main Stats */}
            <Text style={[styles.sec, { color: colors.mutedForeground }]}>OVERVIEW</Text>
            <View style={styles.statsGrid}>
              <StatItem label={`Sales (${data.count} bills)`} value={data.total_sales} color={colors.success} />
              <StatItem label="Gross Profit" value={data.total_profit} color={colors.primary} />
              <StatItem label="Expenses" value={data.total_expenses} color={colors.expense} />
              <StatItem label="Net Profit" value={data.net_profit} color={data.net_profit >= 0 ? colors.success : colors.expense} />
            </View>

            {/* Payment Breakdown */}
            <Text style={[styles.sec, { color: colors.mutedForeground }]}>PAYMENT BREAKDOWN</Text>
            <View style={[styles.breakCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {[
                { label: 'Cash', value: data.cash, color: colors.success, icon: 'cash-outline' },
                { label: 'UPI / Digital', value: data.upi, color: colors.primary, icon: 'phone-portrait-outline' },
                { label: 'Credit (Pending)', value: data.credit, color: colors.credit, icon: 'person-outline' },
              ].map(({ label, value, color, icon }) => (
                <View key={label} style={[styles.breakRow, { borderBottomColor: colors.border }]}>
                  <View style={[styles.breakIcon, { backgroundColor: `${color}20` }]}>
                    <Ionicons name={icon as any} size={18} color={color} />
                  </View>
                  <Text style={[styles.breakLabel, { color: colors.foreground }]}>{label}</Text>
                  <Text style={[styles.breakAmt, { color }]}>{formatCurrencyFull(value, sym)}</Text>
                </View>
              ))}
            </View>

            {/* Profit/Loss indicator */}
            <View style={[styles.plCard, { backgroundColor: data.net_profit >= 0 ? colors.successLight : colors.expenseLight, borderColor: data.net_profit >= 0 ? colors.success : colors.expense }]}>
              <Ionicons name={data.net_profit >= 0 ? 'trending-up' : 'trending-down'} size={24} color={data.net_profit >= 0 ? colors.success : colors.expense} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.plLabel, { color: data.net_profit >= 0 ? colors.success : colors.expense }]}>
                  {data.net_profit >= 0 ? 'Profit' : 'Loss'} for this period
                </Text>
                <Text style={[styles.plAmt, { color: data.net_profit >= 0 ? colors.success : colors.expense }]}>
                  {formatCurrencyFull(Math.abs(data.net_profit), sym)}
                </Text>
              </View>
            </View>

            {/* Monthly Breakdown for Year view */}
            {period === 'year' && monthly.length > 0 && (
              <>
                <Text style={[styles.sec, { color: colors.mutedForeground }]}>MONTHLY BREAKDOWN</Text>
                <View style={[styles.breakCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.monthHdr, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.monthHdrText, { color: colors.mutedForeground, flex: 2 }]}>Month</Text>
                    <Text style={[styles.monthHdrText, { color: colors.mutedForeground }]}>Sales</Text>
                    <Text style={[styles.monthHdrText, { color: colors.mutedForeground }]}>Profit</Text>
                  </View>
                  {monthly.map(m => (
                    <View key={`${m.year}-${m.month}`} style={[styles.monthRow, { borderBottomColor: colors.border }]}>
                      <Text style={[styles.monthName, { color: colors.foreground, flex: 2 }]}>{MONTHS[m.month - 1]}</Text>
                      <Text style={[styles.monthVal, { color: colors.success }]}>{formatCurrencyFull(m.sales, sym)}</Text>
                      <Text style={[styles.monthVal, { color: m.profit >= 0 ? colors.primary : colors.expense }]}>{formatCurrencyFull(m.profit, sym)}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  scroll: { padding: 16 },
  sec: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8, marginBottom: 10, marginTop: 8 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  statItem: { flex: 1, minWidth: '44%', borderRadius: 12, borderWidth: 1, padding: 16, alignItems: 'center' },
  statValue: { fontSize: 20, fontFamily: 'Inter_700Bold', marginBottom: 4 },
  statLabel: { fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  breakCard: { borderRadius: 12, borderWidth: 1, overflow: 'hidden', marginBottom: 12 },
  breakRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, gap: 12 },
  breakIcon: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  breakLabel: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular' },
  breakAmt: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  plCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 14, borderWidth: 1.5, marginBottom: 16 },
  plLabel: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  plAmt: { fontSize: 22, fontFamily: 'Inter_700Bold', marginTop: 2 },
  monthHdr: { flexDirection: 'row', padding: 10, borderBottomWidth: 1 },
  monthHdrText: { flex: 1, fontSize: 12, fontFamily: 'Inter_600SemiBold', textAlign: 'right' },
  monthRow: { flexDirection: 'row', padding: 12, borderBottomWidth: 1, alignItems: 'center' },
  monthName: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  monthVal: { flex: 1, fontSize: 13, fontFamily: 'Inter_600SemiBold', textAlign: 'right' },
});
