import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useDatabase } from '@/context/DatabaseContext';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { SearchBar } from '@/components/ui/SearchBar';
import { ProductCard } from '@/components/products/ProductCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { FAB } from '@/components/ui/FAB';

type Filter = 'all' | 'low';

export default function ProductsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { products } = useDatabase();
  const { settings } = useApp();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const sym = settings.currency_symbol;

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = q ? products.filter(p => p.name.toLowerCase().includes(q) || p.barcode.includes(q)) : products;
    if (filter === 'low') list = list.filter(p => p.stock <= p.low_stock_alert);
    return list;
  }, [products, search, filter]);

  const lowCount = useMemo(() => products.filter(p => p.stock <= p.low_stock_alert).length, [products]);
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.headerBackground, paddingTop: topPad + 10 }]}>
        <Text style={styles.title}>Products</Text>
        <Text style={styles.sub}>{products.length} items</Text>
      </View>

      {/* Filter Tabs */}
      <View style={[styles.tabRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {([{ key: 'all', label: 'All' }, { key: 'low', label: `Low Stock${lowCount > 0 ? ` (${lowCount})` : ''}` }] as { key: Filter; label: string }[]).map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.tab, filter === f.key && { borderBottomColor: f.key === 'low' ? colors.warning : colors.accent, borderBottomWidth: 2 }]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.tabText, { color: filter === f.key ? (f.key === 'low' ? colors.warning : colors.accent) : colors.mutedForeground }]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={p => p.id}
        ListHeaderComponent={<View style={{ paddingTop: 12 }}><SearchBar value={search} onChangeText={setSearch} placeholder="Search products or barcode..." /></View>}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            onPress={() => router.push(`/products/add?id=${item.id}` as any)}
            currencySymbol={sym}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="cube-outline"
            title={search || filter === 'low' ? 'No products found' : 'No products yet'}
            description={search ? 'Try different search' : filter === 'low' ? 'No low stock items' : 'Add products to start billing'}
            actionLabel={!search && filter === 'all' ? 'Add Product' : undefined}
            onAction={!search && filter === 'all' ? () => router.push('/products/add') : undefined}
          />
        }
        contentContainerStyle={[styles.list, { paddingBottom: Platform.OS === 'web' ? 34 + 80 : insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
      />
      <FAB onPress={() => router.push('/products/add')} icon="add" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 14, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  title: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#fff' },
  sub: { fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.7)' },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  list: { paddingTop: 4 },
});
