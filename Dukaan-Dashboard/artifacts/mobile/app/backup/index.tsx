import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useDatabase } from '@/context/DatabaseContext';
import { useColors } from '@/hooks/useColors';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { exportDatabaseJSON, importDatabaseJSON } from '@/db/database';

export default function BackupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { reloadAll } = useDatabase();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);

  const handleExport = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not available', 'File export is not supported on web');
      return;
    }
    setExporting(true);
    try {
      const json = await exportDatabaseJSON();
      const FileSystem = await import('expo-file-system');
      const Sharing = await import('expo-sharing');
      const date = new Date().toISOString().slice(0, 10);
      const path = `${FileSystem.documentDirectory}dukaan-backup-${date}.json`;
      await FileSystem.writeAsStringAsync(path, json, { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, { mimeType: 'application/json', dialogTitle: 'Save Backup File' });
        setLastBackup(new Date().toLocaleString());
      } else {
        Alert.alert('Success', `Backup saved to: ${path}`);
        setLastBackup(new Date().toLocaleString());
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to export backup');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not available', 'File import is not supported on web');
      return;
    }
    Alert.alert(
      'Restore Backup',
      'This will replace ALL existing data with the backup file. This cannot be undone. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: async () => {
            setImporting(true);
            try {
              const DocPicker = await import('expo-document-picker');
              const result = await DocPicker.getDocumentAsync({
                type: 'application/json',
                copyToCacheDirectory: true,
              });
              if (result.canceled) { setImporting(false); return; }
              const FileSystem = await import('expo-file-system');
              const json = await FileSystem.readAsStringAsync(result.assets[0].uri);
              await importDatabaseJSON(json);
              await reloadAll();
              Alert.alert('Success', 'Data restored successfully!');
            } catch (e: any) {
              Alert.alert('Error', e.message ?? 'Failed to restore backup. Make sure the file is a valid Dukaan backup.');
            } finally {
              setImporting(false);
            }
          },
        },
      ]
    );
  };

  const botPad = Platform.OS === 'web' ? 34 : insets.bottom + 10;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Backup & Restore" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: botPad + 20 }]}>

        {/* Info */}
        <View style={[styles.infoBox, { backgroundColor: colors.secondary, borderColor: colors.primary }]}>
          <Ionicons name="information-circle" size={20} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.primary }]}>
            All data is stored offline on your device. Regular backups are recommended to prevent data loss.
          </Text>
        </View>

        {lastBackup && (
          <View style={[styles.lastBackup, { backgroundColor: colors.successLight, borderColor: colors.success }]}>
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            <Text style={[styles.lastBackupText, { color: colors.success }]}>Last backup: {lastBackup}</Text>
          </View>
        )}

        {/* Export */}
        <Text style={[styles.sec, { color: colors.mutedForeground }]}>BACKUP</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBox, { backgroundColor: colors.successLight }]}>
              <Ionicons name="cloud-upload-outline" size={24} color={colors.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Export Backup</Text>
              <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>Save all data as a JSON file</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.success }]}
            onPress={handleExport}
            disabled={exporting}
            activeOpacity={0.85}
          >
            <Ionicons name="download-outline" size={20} color="#fff" />
            <Text style={styles.btnText}>{exporting ? 'Exporting...' : 'Export Now'}</Text>
          </TouchableOpacity>
        </View>

        {/* Import */}
        <Text style={[styles.sec, { color: colors.mutedForeground }]}>RESTORE</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBox, { backgroundColor: colors.warningLight }]}>
              <Ionicons name="cloud-download-outline" size={24} color={colors.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Restore Backup</Text>
              <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>Replace all data from a backup file</Text>
            </View>
          </View>
          <View style={[styles.warningNote, { backgroundColor: colors.warningLight }]}>
            <Ionicons name="warning-outline" size={16} color={colors.warning} />
            <Text style={[styles.warningText, { color: colors.warning }]}>⚠ This will replace ALL existing data and cannot be undone.</Text>
          </View>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.warning }]}
            onPress={handleImport}
            disabled={importing}
            activeOpacity={0.85}
          >
            <Ionicons name="folder-open-outline" size={20} color="#fff" />
            <Text style={styles.btnText}>{importing ? 'Restoring...' : 'Choose Backup File'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.footer, { color: colors.mutedForeground }]}>
          Backup files are stored in JSON format and can be transferred between devices.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 16 },
  infoBox: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  infoText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  lastBackup: { flexDirection: 'row', gap: 8, alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 12 },
  lastBackupText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  sec: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8, marginBottom: 8, marginTop: 8 },
  card: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 16, gap: 14 },
  cardHeader: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold', marginBottom: 2 },
  cardSub: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  warningNote: { flexDirection: 'row', gap: 8, alignItems: 'center', padding: 10, borderRadius: 8 },
  warningText: { flex: 1, fontSize: 12, fontFamily: 'Inter_500Medium' },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12 },
  btnText: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#fff' },
  footer: { fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: 8, lineHeight: 18 },
});
