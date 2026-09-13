import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal,
  TextInput, Alert, Platform, KeyboardAvoidingView, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useDatabase } from '@/context/DatabaseContext';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { FAB } from '@/components/ui/FAB';
import { EXPENSE_CATEGORIES } from '@/types';
import { formatCurrencyFull, formatDate, formatTime } from '@/utils/format';
import { startOfDay, endOfDay, startOfWeek, startOfMonth, endOfMonth } from '@/db/database';

type Period = 'today' | 'week' | 'month' | 'all';

export default function ExpensesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { expenses, addExpense, deleteExpense } = useDatabase();
  const { settings } = useApp();
  const sym = settings.currency_symbol;

  const [period, setPeriod] = useState<Period>('today');
  const [showModal, setShowModal] = useState(false);
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const now = new Date();
    let start: number | undefined, end: number | undefined;
    if (period === 'today') { start = startOfDay(now); end = endOfDay(now); }
    else if (period === 'week') { start = startOfWeek(now); end = endOfDay(now); }
    else if (period === 'month') { start = startOfMonth(now); end = endOfMonth(now); }
    return expenses.filter(e => (start === undefined || e.date >= start) && (end === undefined || e.date <= end));
  }, [expenses, period]);

  const total = useMemo(() => filtered.reduce((s, e) => s + e.amount, 0), [filtered]);

  const handleAdd = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) { Alert.alert('Enter a valid amount'); return; }
    setSaving(true);
    try {
      await addExpense({ category, amount: val, note: note.trim(), date: Date.now() });
      setShowModal(false);
      setAmount('');
      setNote('');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Expense', 'Remove this expense?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteExpense(id) },
    ]);
  };

  const botPad = Platform.OS === 'web' ? 34 + 80 : insets.bottom + 80;
  const PERIODS: { key: Period; label: string }[] = [
    { key: 'today', label: 'Today' }, { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' }, { key: 'all', label: 'All' },
  ];

  // Category breakdown
  const breakdown = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return Object.entries(map).sort(([, a], [, b]) => b - a);
  }, [filtered]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Expenses" onBack={() => router.back()} />

      {/* Period Tabs */}
      <View style={[styles.tabRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {PERIODS.map(p => (
          <TouchableOpacity key={p.key} style={[styles.tab, period === p.key && { borderBottomColor: colors.expense, borderBottomWidth: 2 }]} onPress={() => setPeriod(p.key)}>
            <Text style={[styles.tabText, { color: period === p.key ? colors.expense : colors.mutedForeground }]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={e => e.id}
        ListHeaderComponent={
          <View>
            {/* Total Banner */}
            {total > 0 && (
              <View style={[styles.totalBanner, { backgroundColor: colors.expenseLight, borderColor: colors.expense }]}>
                <Text style={[styles.totalLabel, { color: colors.expense }]}>Total Expenses</Text>
                <Text style={[styles.totalAmt, { color: colors.expense }]}>{formatCurrencyFull(total, sym)}</Text>
              </View>
            )}
            {/* Breakdown */}
            {breakdown.length > 1 && (
              <View style={[styles.breakdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {breakdown.map(([cat, amt]) => (
                  <View key={cat} style={styles.breakdownRow}>
                    <Text style={[styles.catLabel, { color: colors.foreground }]}>{cat}</Text>
                    <Text style={[styles.catAmt, { color: colors.expense }]}>{formatCurrencyFull(amt, sym)}</Text>
                  </View>
                ))}
              </View>
            )}
            <Text style={[styles.listLabel, { color: colors.mutedForeground }]}>ENTRIES</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.expRow, { backgroundColor: colors.card, borderColor: colors.border }]}
            onLongPress={() => handleDelete(item.id)}
            activeOpacity={0.8}
          >
            <View style={[styles.expIcon, { backgroundColor: colors.expenseLight }]}>
              <Ionicons name="cash-outline" size={20} color={colors.expense} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.expCat, { color: colors.foreground }]}>{item.category}</Text>
              {item.note ? <Text style={[styles.expNote, { color: colors.mutedForeground }]} numberOfLines={1}>{item.note}</Text> : null}
              <Text style={[styles.expDate, { color: colors.mutedForeground }]}>{formatDate(item.date)} · {formatTime(item.date)}</Text>
            </View>
            <Text style={[styles.expAmt, { color: colors.expense }]}>{formatCurrencyFull(item.amount, sym)}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<EmptyState icon="cash-outline" title="No expenses" description={period === 'today' ? 'No expenses recorded today' : 'No expenses in this period'} actionLabel="Add Expense" onAction={() => setShowModal(true)} />}
        contentContainerStyle={{ padding: 16, paddingBottom: botPad }}
        showsVerticalScrollIndicator={false}
      />

      <FAB onPress={() => { setCategory(EXPENSE_CATEGORIES[0]); setAmount(''); setNote(''); setShowModal(true); }} icon="add" />

      {/* Add Expense Modal */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.overlay}>
            <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Add Expense</Text>

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
                  {EXPENSE_CATEGORIES.map(c => (
                    <TouchableOpacity key={c} style={[styles.catChip, { borderColor: category === c ? colors.expense : colors.border, backgroundColor: category === c ? colors.expenseLight : colors.background }]} onPress={() => setCategory(c)}>
                      <Text style={[styles.catChipText, { color: category === c ? colors.expense : colors.mutedForeground }]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Amount ({sym})</Text>
              <TextInput style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]} value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="0.00" placeholderTextColor={colors.mutedForeground} autoFocus />

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Note (optional)</Text>
              <TextInput style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]} value={note} onChangeText={setNote} placeholder="What was this for?" placeholderTextColor={colors.mutedForeground} />

              <View style={styles.modalBtns}>
                <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: colors.muted }]} onPress={() => setShowModal(false)}>
                  <Text style={[styles.cancelText, { color: colors.foreground }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.expense }]} onPress={handleAdd} disabled={saving}>
                  <Text style={styles.addBtnText}>{saving ? 'Adding...' : 'Add Expense'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  totalBanner: { borderRadius: 14, borderWidth: 1.5, padding: 16, marginBottom: 12, alignItems: 'center' },
  totalLabel: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  totalAmt: { fontSize: 28, fontFamily: 'Inter_700Bold', marginTop: 4 },
  breakdown: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 10, marginBottom: 12 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between' },
  catLabel: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  catAmt: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  listLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8, marginBottom: 8 },
  expRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  expIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  expCat: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  expNote: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  expDate: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  expAmt: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { borderRadius: 20, borderWidth: 1, padding: 20, margin: 12, marginBottom: 20 },
  sheetTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontFamily: 'Inter_500Medium', marginBottom: 6 },
  catChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  catChipText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15, fontFamily: 'Inter_400Regular', marginBottom: 12 },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  cancelText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  addBtn: { flex: 2, padding: 14, borderRadius: 12, alignItems: 'center' },
  addBtnText: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#fff' },
});
