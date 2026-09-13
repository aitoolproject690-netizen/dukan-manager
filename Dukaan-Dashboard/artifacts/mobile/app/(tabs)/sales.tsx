import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useDatabase } from '@/context/DatabaseContext';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { FAB } from '@/components/ui/FAB';
import { Sale } from '@/types';
import { formatCurrencyFull, formatDate, formatTime } from '@/utils/format';
import { startOfDay, endOfDay, startOfWeek, startOfMonth, endOfMonth } from '@/db/database';

type Period = 'today' | 'week' | 'month' | 'all';

export default function SalesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getSales, deleteSale } = useDatabase();
  const { settings } = useApp();
  const [period, setPeriod] = useState<Period>('today');
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const sym = settings.currency_symbol;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let start: number | undefined, end: number | undefined;
      const now = new Date();
      if (period === 'today') { start = startOfDay(now); end = endOfDay(now); }
      else if (period === 'week') { start = startOfWeek(now); end = endOfDay(now); }
      else if (period === 'month') { start = startOfMonth(now); end = endOfMonth(now); }
      const data = await getSales(start, end);
      setSales(data);
    } catch (e) {
      Alert.alert('Sales Error', 'Sales could not be loaded. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [getSales, period]);

  useEffect(() => { load(); }, [load]);

  const total = useMemo(() => sales.reduce((s, r) => s + r.total, 0), [sales]);
  const cashTotal = useMemo(() => sales.reduce((s, r) => s + r.cash_amount, 0), [sales]);
  const upiTotal = useMemo(() => sales.reduce((s, r) => s + r.upi_amount, 0), [sales]);
  const creditTotal = useMemo(() => sales.reduce((s, r) => s + r.credit_amount, 0), [sales]);

  const handleDelete = useCallback((id: string) => {
    if (deleting) return;
    Alert.alert('Delete Sale', 'Delete this bill? Stock will be restored and its linked khata credit will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteSale(id);
            await load();
          } catch (e) {
            Alert.alert('Delete Failed', 'The bill could not be deleted. No further changes were made by this screen.');
          } finally {
            setDeleting(false);
          }
        }
      }
    ]);
  }, [deleteSale, load, deleting]);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 + 80 : insets.bottom + 80;

  const PERIODS: { key: Period; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
    { key: 'all', label: 'All' },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.headerBackground, paddingTop: topPad + 10 }]}>
        <View style={styles.headerTitleRow}>
          <View style={[styles.headerIcon, { backgroundColor: 'rgba(255,255,255,0.14)' }]}>
            <Ionicons name="receipt-outline" size={22} color="#fff" />
          </View>
          <View>
            <Text style={styles.title}>Sales</Text>
            <Text style={styles.subtitle}>Bills & payments</Text>
          </View>
        </View>
        {sales.length > 0 && <Text style={styles.totalText}>{formatCurrencyFull(total, sym)}</Text>}
      </View>

      <View style={[styles.tabs, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {PERIODS.map(p => (
          <TouchableOpacity key={p.key} style={[styles.tab, period === p.key && { borderBottomColor: colors.accent, borderBottomWidth: 3 }]} onPress={() => setPeriod(p.key)}>
            <Text style={[styles.tabText, { color: period === p.key ? colors.accent : colors.mutedForeground }]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {sales.length > 0 && (
        <View style={[styles.pills, { backgroundColor: colors.card }]}>
          {[
            { label: 'Cash', value: cashTotal, color: colors.success },
            { label: 'UPI', value: upiTotal, color: colors.primary },
            { label: 'Credit', value: creditTotal, color: colors.credit },
          ].map(p => (
            <View key={p.label} style={styles.pill}>
              <Text style={[styles.pillLabel, { color: colors.mutedForeground }]}>{p.label}</Text>
              <Text style={[styles.pillValue, { color: p.color }]}>{formatCurrencyFull(p.value, sym)}</Text>
            </View>
          ))}
        </View>
      )}

      <FlatList
        data={sales}
        keyExtractor={s => s.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push(`/billing/${item.id}` as any)}
            onLongPress={() => handleDelete(item.id)}
            activeOpacity={0.8}
            disabled={deleting}
          >
            <View style={[styles.receiptIcon, { backgroundColor: colors.background }]}>
              <Ionicons name="receipt" size={21} color={colors.primary} />
            </View>
            <View style={styles.cardLeft}>
              <Text style={[styles.invoice, { color: colors.primary }]}>{item.invoice_number}</Text>
              {item.customer_name ? <Text style={[styles.customer, { color: colors.mutedForeground }]} numberOfLines={1}>{item.customer_name}</Text> : null}
              <Text style={[styles.dateText, { color: colors.mutedForeground }]}>{formatDate(item.date)} · {formatTime(item.date)}</Text>
            </View>
            <View style={styles.cardRight}>
              <Text style={[styles.amount, { color: colors.foreground }]}>{sym}{item.total.toFixed(0)}</Text>
              <Badge label={item.payment_method.toUpperCase()} variant={item.payment_method === 'cash' ? 'success' : item.payment_method === 'upi' ? 'primary' : 'credit'} />
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={loading ? null : (
          <EmptyState icon="receipt-outline" title="No sales" description={period === 'today' ? 'No bills created today' : 'No bills in this period'} actionLabel="Create Bill" onAction={() => router.push('/billing/new')} />
        )}
        ListHeaderComponent={sales.length > 0 ? (
          <View style={styles.hintRow}>
            <Ionicons name="information-circle-outline" size={17} color={colors.mutedForeground} />
            <Text style={[styles.hintText, { color: colors.mutedForeground }]}>Tap a bill to open it · Hold a bill to delete</Text>
          </View>
        ) : null}
        contentContainerStyle={{ padding: 16, paddingBottom: botPad }}
        showsVerticalScrollIndicator={false}
      />
      <FAB onPress={() => router.push('/billing/new')} icon="add" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 14, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#fff' },
  subtitle: { fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.72)', marginTop: 1 },
  totalText: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#fff' },
  tabs: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, paddingVertical: 13, alignItems: 'center' },
  tabText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  pills: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 11, borderBottomWidth: 1 },
  pill: { flex: 1, alignItems: 'center' },
  pillLabel: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  pillValue: { fontSize: 14, fontFamily: 'Inter_700Bold', marginTop: 3 },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 2, paddingBottom: 10 },
  hintText: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  card: { flexDirection: 'row', alignItems: 'center', minHeight: 76, padding: 12, borderRadius: 14, borderWidth: 1, marginBottom: 9, gap: 10 },
  receiptIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardLeft: { flex: 1 },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  invoice: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  customer: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  dateText: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  amount: { fontSize: 16, fontFamily: 'Inter_700Bold' },
});
