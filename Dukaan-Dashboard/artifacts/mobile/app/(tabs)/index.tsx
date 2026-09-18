import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useDatabase } from '@/context/DatabaseContext';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { StatCard } from '@/components/ui/StatCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { EasyModeBanner } from '@/components/ui/EasyModeBanner';
import { DashboardData, Sale } from '@/types';
import { formatCurrency, formatTime, getGreeting } from '@/utils/format';

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getDashboardData, getSales, getLowStockProducts } = useDatabase();
  const { settings } = useApp();
  const [data, setData] = useState<DashboardData | null>(null);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const sym = settings.currency_symbol;

  const load = useCallback(async () => {
    const [d, sales] = await Promise.all([getDashboardData(), getSales()]);
    setData(d);
    setRecentSales(sales.slice(0, 8));
  }, [getDashboardData, getSales]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const lowStock = getLowStockProducts();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 + 90 : insets.bottom + 90;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.headerBackground, paddingTop: topPad + 10 }]}>
        <View style={styles.headerCopy}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.bizName} numberOfLines={1}>{settings.business_name}</Text>
        </View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Settings" style={styles.settingBtn} onPress={() => router.push('/settings')}>
          <Ionicons name="settings-outline" size={20} color="rgba(255,255,255,0.9)" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: botPad }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <EasyModeBanner onPress={() => router.push('/settings')} />

        <Text style={[styles.section, { color: colors.mutedForeground }]}>TODAY</Text>
        <View style={styles.row}>
          <StatCard label="बिक्री" value={formatCurrency(data?.today_sales ?? 0, sym)} icon={<Ionicons name="trending-up" size={20} color={colors.success} />} color={colors.success} bgColor={colors.successLight} />
          <View style={{ width: 10 }} />
          <StatCard label="मुनाफा" value={formatCurrency(data?.today_profit ?? 0, sym)} icon={<Ionicons name="bar-chart" size={20} color={colors.primary} />} color={colors.primary} bgColor={colors.secondary} />
        </View>
        <View style={styles.row}>
          <StatCard label="नकद" value={formatCurrency(data?.today_cash ?? 0, sym)} icon={<MaterialCommunityIcons name="cash" size={20} color={colors.warning} />} color={colors.warning} bgColor={colors.warningLight} small />
          <View style={{ width: 10 }} />
          <StatCard label="UPI" value={formatCurrency(data?.today_upi ?? 0, sym)} icon={<Ionicons name="phone-portrait" size={20} color={colors.accent} />} color={colors.accent} bgColor={colors.creditLight} small />
          <View style={{ width: 10 }} />
          <StatCard label="उधार" value={formatCurrency(data?.today_credit ?? 0, sym)} icon={<Ionicons name="person" size={18} color={colors.credit} />} color={colors.credit} bgColor={colors.creditLight} small />
        </View>

        <Text style={[styles.section, { color: colors.mutedForeground, marginTop: 4 }]}>THIS MONTH</Text>
        <View style={styles.row}>
          <StatCard label="इस महीने की बिक्री" value={formatCurrency(data?.monthly_sales ?? 0, sym)} icon={<Ionicons name="calendar" size={20} color={colors.success} />} color={colors.success} bgColor={colors.successLight} />
          <View style={{ width: 10 }} />
          <StatCard label="बाकी उधार" value={formatCurrency(data?.total_pending_credit ?? 0, sym)} icon={<Ionicons name="alert-circle" size={20} color={colors.credit} />} color={colors.credit} bgColor={colors.creditLight} onPress={() => router.push('/(tabs)/khata')} />
        </View>

        <SectionHeader title="जल्दी काम" />
        <View style={styles.actions}>
          {[
            { label: 'नई बिक्री', icon: 'add-circle' as const, color: colors.success, bg: colors.successLight, route: '/billing/new' },
            { label: 'ग्राहक जोड़ें', icon: 'person-add' as const, color: colors.primary, bg: colors.secondary, route: '/customers/add' },
            { label: 'सामान जोड़ें', icon: 'cube' as const, color: colors.accent, bg: colors.creditLight, route: '/products/add' },
            { label: 'रिपोर्ट', icon: 'bar-chart' as const, color: colors.warning, bg: colors.warningLight, route: '/reports' },
          ].map(a => (
            <TouchableOpacity key={a.label} accessibilityRole="button" style={[styles.action, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push(a.route as any)} activeOpacity={0.75}>
              <View style={[styles.actionIcon, { backgroundColor: a.bg }]}>
                <Ionicons name={a.icon} size={22} color={a.color} />
              </View>
              <Text style={[styles.actionLabel, { color: colors.foreground }]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {settings.low_stock_alerts && lowStock.length > 0 && (
          <>
            <SectionHeader title={`⚠ सामान कम है (${lowStock.length})`} action="सब देखें" onAction={() => router.push('/(tabs)/products')} />
            {lowStock.slice(0, 3).map(p => (
              <TouchableOpacity key={p.id} style={[styles.alertRow, { backgroundColor: colors.warningLight, borderColor: colors.warning }]} activeOpacity={0.8}>
                <Text style={[styles.alertName, { color: colors.warning }]} numberOfLines={1}>{p.name}</Text>
                <Text style={[styles.alertQty, { color: colors.warning }]}>{p.stock} {p.unit} left</Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        <SectionHeader title="हाल की बिक्री" action="सब देखें" onAction={() => router.push('/(tabs)/sales')} />
        {recentSales.length === 0 ? (
          <EmptyState icon="receipt-outline" title="अभी कोई बिक्री नहीं" description="नई बिक्री दबाकर पहला बिल बनाएं" actionLabel="नई बिक्री" onAction={() => router.push('/billing/new')} />
        ) : (
          recentSales.map(sale => (
            <TouchableOpacity key={sale.id} style={[styles.saleRow, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push(`/billing/${sale.id}` as any)} activeOpacity={0.8}>
              <View style={styles.saleLeft}>
                <Text style={[styles.saleNo, { color: colors.primary }]}>{sale.invoice_number}</Text>
                {sale.customer_name ? <Text style={[styles.saleCust, { color: colors.mutedForeground }]} numberOfLines={1}>{sale.customer_name}</Text> : null}
                <Text style={[styles.saleTime, { color: colors.mutedForeground }]}>{formatTime(sale.date)}</Text>
              </View>
              <View style={styles.saleRight}>
                <Text style={[styles.saleAmt, { color: colors.foreground }]}>{sym}{sale.total.toFixed(0)}</Text>
                <Badge label={sale.payment_method.toUpperCase()} variant={sale.payment_method === 'cash' ? 'success' : sale.payment_method === 'upi' ? 'primary' : 'credit'} />
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 14, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  headerCopy: { flex: 1, paddingRight: 12 },
  greeting: { fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.7)' },
  bizName: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#fff', marginTop: 2 },
  settingBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16 },
  section: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 1, marginBottom: 10, marginTop: 4 },
  row: { flexDirection: 'row', marginBottom: 10 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  action: { flex: 1, minWidth: '44%', minHeight: 112, borderRadius: 16, padding: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, gap: 8 },
  actionIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 14, fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
  alertRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 6, marginHorizontal: 16 },
  alertName: { flex: 1, fontSize: 13, fontFamily: 'Inter_500Medium' },
  alertQty: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  saleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  saleLeft: { flex: 1 },
  saleRight: { alignItems: 'flex-end', gap: 6 },
  saleNo: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  saleCust: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  saleTime: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  saleAmt: { fontSize: 16, fontFamily: 'Inter_700Bold' },
});
