import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Platform, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useDatabase } from '@/context/DatabaseContext';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { SearchBar } from '@/components/ui/SearchBar';
import { CustomerCard } from '@/components/customers/CustomerCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { FAB } from '@/components/ui/FAB';
import { formatCurrencyFull } from '@/utils/format';

export default function KhataScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { customers } = useDatabase();
  const { settings } = useApp();
  const [search, setSearch] = useState('');
  const sym = settings.currency_symbol;

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const list = q
      ? customers.filter(c => c.name.toLowerCase().includes(q) || c.mobile.includes(q))
      : customers;
    return [...list].sort((a, b) => b.credit_balance - a.credit_balance || a.name.localeCompare(b.name));
  }, [customers, search]);

  const totalCredit = useMemo(() => customers.reduce((s, c) => s + c.credit_balance, 0), [customers]);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.headerBackground, paddingTop: topPad + 10 }]}>
        <View>
          <Text style={styles.title}>Digital Khata</Text>
          <Text style={styles.sub}>{customers.length} customers</Text>
        </View>
        {totalCredit > 0 && (
          <View style={[styles.creditBadge, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
            <Text style={styles.creditBadgeLabel}>Total to collect</Text>
            <Text style={styles.creditBadgeAmt}>{formatCurrencyFull(totalCredit, sym)}</Text>
          </View>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={c => c.id}
        ListHeaderComponent={
          <View style={{ paddingTop: 12 }}>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Search customers..." />
          </View>
        }
        renderItem={({ item }) => (
          <CustomerCard
            customer={item}
            onPress={() => router.push(`/customers/${item.id}` as any)}
            currencySymbol={sym}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title={search ? 'No customers found' : 'No customers yet'}
            description={search ? 'Try a different name or number' : 'Add customers to track credit'}
            actionLabel={search ? undefined : 'Add Customer'}
            onAction={search ? undefined : () => router.push('/customers/add')}
          />
        }
        contentContainerStyle={[styles.list, { paddingBottom: Platform.OS === 'web' ? 34 + 80 : insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
      />
      <FAB onPress={() => router.push('/customers/add')} icon="person-add" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 14, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  title: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#fff' },
  sub: { fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  creditBadge: { alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  creditBadgeLabel: { fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.8)' },
  creditBadgeAmt: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#fff' },
  list: { paddingTop: 4 },
});
