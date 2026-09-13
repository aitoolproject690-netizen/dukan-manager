import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { useDatabase } from '@/context/DatabaseContext';
import { useColors } from '@/hooks/useColors';
import { formatCurrencyFull } from '@/utils/format';

interface MenuItemProps { icon: keyof typeof Ionicons.glyphMap; label: string; sub?: string; onPress: () => void; color?: string; }

function MenuItem({ icon, label, sub, onPress, color }: MenuItemProps) {
  const colors = useColors();
  return (
    <TouchableOpacity style={[styles.item, { borderBottomColor: colors.border }]} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.itemIcon, { backgroundColor: color ? `${color}20` : colors.muted }]}>
        <Ionicons name={icon} size={22} color={color ?? colors.primary} />
      </View>
      <View style={styles.itemText}>
        <Text style={[styles.itemLabel, { color: colors.foreground }]}>{label}</Text>
        {sub ? <Text style={[styles.itemSub, { color: colors.mutedForeground }]}>{sub}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.border} />
    </TouchableOpacity>
  );
}

export default function MoreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings } = useApp();
  const { expenses } = useDatabase();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 + 70 : insets.bottom + 70;

  const todayExp = expenses.filter(e => e.date >= new Date().setHours(0, 0, 0, 0)).reduce((s, e) => s + e.amount, 0);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.headerBackground, paddingTop: topPad + 10 }]}>
        <View>
          <Text style={styles.title}>More</Text>
          <Text style={styles.sub}>{settings.business_name}</Text>
        </View>
        <TouchableOpacity style={styles.settingsBtn} onPress={() => router.push('/settings')}>
          <Ionicons name="settings-outline" size={20} color="rgba(255,255,255,0.9)" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: botPad }}>
        {/* Reports & Finance */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>REPORTS & FINANCE</Text>
        <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MenuItem icon="bar-chart" label="Reports" sub="Daily, Monthly & Yearly" onPress={() => router.push('/reports')} />
          <MenuItem icon="cash-outline" label="Expense Manager" sub={todayExp > 0 ? `Today: ${formatCurrencyFull(todayExp, settings.currency_symbol)}` : 'Track business expenses'} onPress={() => router.push('/expenses')} color={colors.expense} />
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>DATA & BACKUP</Text>
        <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MenuItem icon="cloud-upload-outline" label="Backup & Restore" sub="Local backup, restore data" onPress={() => router.push('/backup')} color={colors.success} />
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>SETTINGS</Text>
        <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MenuItem icon="business-outline" label="Business Settings" sub={settings.business_name} onPress={() => router.push('/settings')} />
          <MenuItem icon="lock-closed-outline" label="App Lock" sub={settings.pin_enabled ? 'PIN enabled' : 'Not enabled'} onPress={() => router.push('/settings')} color={settings.pin_enabled ? colors.success : colors.mutedForeground} />
          <MenuItem icon="moon-outline" label="Dark Mode" sub={{ system: 'Follow system', light: 'Light', dark: 'Dark' }[settings.dark_mode]} onPress={() => router.push('/settings')} />
        </View>

        <Text style={[styles.version, { color: colors.mutedForeground }]}>Dukaan Manager v1.0.0{'\n'}Offline-first • All data stored on device</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 14, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  title: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#fff' },
  sub: { fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  settingsBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  sectionLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8, paddingHorizontal: 20, marginTop: 20, marginBottom: 6 },
  group: { marginHorizontal: 16, borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, gap: 12 },
  itemIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  itemText: { flex: 1 },
  itemLabel: { fontSize: 15, fontFamily: 'Inter_500Medium' },
  itemSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  version: { fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: 32, lineHeight: 18 },
});
