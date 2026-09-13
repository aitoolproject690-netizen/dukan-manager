import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert, Platform, KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useDatabase } from '@/context/DatabaseContext';
import { useColors } from '@/hooks/useColors';
import { ScreenHeader } from '@/components/ui/ScreenHeader';

export default function AddCustomerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { customers, addCustomer, updateCustomer } = useDatabase();

  const existing = id ? customers.find(c => c.id === id) : null;
  const isEdit = !!existing;

  const [name, setName] = useState(existing?.name ?? '');
  const [mobile, setMobile] = useState(existing?.mobile ?? '');
  const [address, setAddress] = useState(existing?.address ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Name required', 'Please enter customer name'); return; }
    setSaving(true);
    try {
      if (isEdit && existing) {
        await updateCustomer({ ...existing, name: name.trim(), mobile: mobile.trim(), address: address.trim(), notes: notes.trim() });
      } else {
        await addCustomer({ name: name.trim(), mobile: mobile.trim(), address: address.trim(), notes: notes.trim() });
      }
      router.back();
    } catch (e) {
      Alert.alert('Error', 'Failed to save customer');
    } finally {
      setSaving(false);
    }
  };

  const botPad = Platform.OS === 'web' ? 34 : insets.bottom + 10;

  const fields = [
    { label: 'Customer Name *', value: name, setter: setName, placeholder: 'Full name', keyboard: 'default' as const },
    { label: 'Mobile Number', value: mobile, setter: setMobile, placeholder: '10-digit mobile', keyboard: 'phone-pad' as const },
    { label: 'Address', value: address, setter: setAddress, placeholder: 'Shop or home address', keyboard: 'default' as const },
    { label: 'Notes', value: notes, setter: setNotes, placeholder: 'Any notes', keyboard: 'default' as const },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScreenHeader title={isEdit ? 'Edit Customer' : 'Add Customer'} onBack={() => router.back()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: botPad + 20 }]} keyboardShouldPersistTaps="handled">
          {fields.map(f => (
            <View key={f.label} style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>{f.label}</Text>
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                value={f.value}
                onChangeText={f.setter}
                placeholder={f.placeholder}
                placeholderTextColor={colors.mutedForeground}
                keyboardType={f.keyboard}
                returnKeyType="next"
              />
            </View>
          ))}

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: saving ? colors.muted : colors.primary }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            <Text style={styles.saveBtnText}>{saving ? 'Saving...' : isEdit ? 'Update Customer' : 'Add Customer'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 20 },
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontFamily: 'Inter_500Medium', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 15, fontFamily: 'Inter_400Regular' },
  saveBtn: { padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 8 },
  saveBtnText: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#fff' },
});
