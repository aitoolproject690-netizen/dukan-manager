import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Ionicons } from '@expo/vector-icons';

interface SearchBarProps {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  onClear?: () => void;
}

export function SearchBar({ value, onChangeText, placeholder = 'Search...', onClear }: SearchBarProps) {
  const colors = useColors();
  return (
    <View style={[styles.container, { backgroundColor: colors.muted, borderColor: colors.border }]}>
      <Ionicons name="search" size={18} color={colors.mutedForeground} style={styles.icon} />
      <TextInput
        style={[styles.input, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        returnKeyType="search"
        clearButtonMode={Platform.OS === 'ios' ? 'while-editing' : 'never'}
        autoCorrect={false}
        autoCapitalize="none"
      />
      {value.length > 0 && Platform.OS !== 'ios' && (
        <TouchableOpacity onPress={() => { onChangeText(''); onClear?.(); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  icon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, height: '100%' },
});
