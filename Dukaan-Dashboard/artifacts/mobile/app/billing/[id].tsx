import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useDatabase } from '@/context/DatabaseContext';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Badge } from '@/components/ui/Badge';
import { Sale, SaleItem } from '@/types';
import { formatCurrencyFull, formatDate, formatTime } from '@/utils/format';

export default function InvoiceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getSaleWithItems } = useDatabase();
  const { settings } = useApp();
  const sym = settings.currency_symbol;
  const [sale, setSale] = useState<Sale | null>(null);
  const [items, setItems] = useState<SaleItem[]>([]);

  useEffect(() => {
    if (!id) return;
    getSaleWithItems(id).then((value) => {
      setSale(value);
      setItems(value?.items ?? []);
    }).catch(() => setSale(null));
  }, [id, getSaleWithItems]);

  const generateHtml = useCallback(() => {
    if (!sale) return '';
    const rows = items.map(i => `<tr><td>${i.product_name}</td><td>${i.quantity} ${i.unit ?? ''}</td><td>${sym}${i.price.toFixed(2)}</td><td>${sym}${(i.price * i.quantity).toFixed(2)}</td></tr>`).join('');
    return `<!DOCTYPE html><html><body><h1>${settings.business_name}</h1><p>${settings.business_address || ''}<br>${settings.business_phone || ''}</p><h3>Invoice ${sale.invoice_number}</h3><p>${formatDate(sale.date)} ${formatTime(sale.date)}</p><table border="1" cellspacing="0" cellpadding="8" width="100%"><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Total</th></tr>${rows}</table><h2>Total: ${formatCurrencyFull(sale.total, sym)}</h2><p>Cash: ${formatCurrencyFull(sale.cash_amount, sym)} | UPI: ${formatCurrencyFull(sale.upi_amount, sym)} | Credit: ${formatCurrencyFull(sale.credit_amount, sym)}</p></body></html>`;
  }, [sale, items, settings, sym]);

  const sharePdf = async () => {
    if (!sale || Platform.OS === 'web') return;
    try {
      const Print = await import('expo-print');
      const Sharing = await import('expo-sharing');
      const { uri } = await Print.printToFileAsync({ html: generateHtml() });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      else Alert.alert('Sharing not available');
    } catch (e: any) { Alert.alert('Error', e?.message ?? 'Could not create PDF'); }
  };

  const print = async () => {
    if (!sale || Platform.OS === 'web') return;
    try { const Print = await import('expo-print'); await Print.printAsync({ html: generateHtml() }); }
    catch (e: any) { Alert.alert('Error', e?.message ?? 'Could not print invoice'); }
  };

  if (!sale) return <View style={[styles.root, { backgroundColor: colors.background }]}><ScreenHeader title="Invoice" onBack={() => router.back()} /><View style={styles.center}><Text style={{ color: colors.mutedForeground }}>Invoice not found</Text></View></View>;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScreenHeader title={sale.invoice_number} onBack={() => router.back()} rightIcon="share-outline" onRight={sharePdf} />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}>
        <View style={[styles.biz, { backgroundColor: colors.headerBackground }]}>
          <Text style={styles.bizName}>{settings.business_name}</Text>
          {!!settings.business_address && <Text style={styles.bizSub}>{settings.business_address}</Text>}
          {!!settings.business_phone && <Text style={styles.bizSub}>📞 {settings.business_phone}</Text>}
        </View>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Row label="Invoice #" value={sale.invoice_number} color={colors.primary} colors={colors} />
          <Row label="Date" value={formatDate(sale.date)} color={colors.foreground} colors={colors} />
          <Row label="Time" value={formatTime(sale.date)} color={colors.foreground} colors={colors} />
          {!!sale.customer_name && <Row label="Customer" value={sale.customer_name} color={colors.foreground} colors={colors} />}
          <View style={styles.row}><Text style={[styles.label, { color: colors.mutedForeground }]}>Payment</Text><Badge label={sale.payment_method.toUpperCase()} variant={sale.payment_method === 'cash' ? 'success' : sale.payment_method === 'upi' ? 'primary' : 'credit'} /></View>
        </View>
        <Text style={[styles.section, { color: colors.mutedForeground }]}>ITEMS</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, padding: 0, overflow: 'hidden' }]}>
          <View style={[styles.tableRow, { backgroundColor: colors.secondary }]}><Text style={[styles.item, styles.bold, { color: colors.primary }]}>Item</Text><Text style={[styles.qty, styles.bold, { color: colors.primary }]}>Qty</Text><Text style={[styles.amount, styles.bold, { color: colors.primary }]}>Rate</Text><Text style={[styles.amount, styles.bold, { color: colors.primary }]}>Total</Text></View>
          {items.map((item, index) => <View key={item.id ?? index} style={[styles.tableRow, { borderTopColor: colors.border, borderTopWidth: index ? 1 : 0 }]}><Text style={[styles.item, { color: colors.foreground }]}>{item.product_name}</Text><Text style={[styles.qty, { color: colors.mutedForeground }]}>{item.quantity}{item.unit ? ` ${item.unit}` : ''}</Text><Text style={[styles.amount, { color: colors.mutedForeground }]}>{sym}{item.price.toFixed(2)}</Text><Text style={[styles.amount, { color: colors.foreground }]}>{sym}{(item.price * item.quantity).toFixed(2)}</Text></View>)}
        </View>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {sale.discount > 0 && <><Row label="Subtotal" value={formatCurrencyFull(sale.subtotal, sym)} color={colors.foreground} colors={colors} /><Row label="Discount" value={`- ${formatCurrencyFull(sale.discount, sym)}`} color={colors.expense} colors={colors} /></>}
          {sale.cash_amount > 0 && <Row label="Cash" value={formatCurrencyFull(sale.cash_amount, sym)} color={colors.success} colors={colors} />}
          {sale.upi_amount > 0 && <Row label="UPI" value={formatCurrencyFull(sale.upi_amount, sym)} color={colors.primary} colors={colors} />}
          {sale.credit_amount > 0 && <Row label="Credit" value={formatCurrencyFull(sale.credit_amount, sym)} color={colors.credit} colors={colors} />}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Row label="TOTAL" value={formatCurrencyFull(sale.total, sym)} color={colors.primary} colors={colors} large />
        </View>
        {!!settings.upi_id && <View style={[styles.upi, { backgroundColor: colors.successLight, borderColor: colors.success }]}><Ionicons name="phone-portrait-outline" size={18} color={colors.success} /><Text style={{ color: colors.success }}>Pay via UPI: <Text style={styles.bold}>{settings.upi_id}</Text></Text></View>}
        {Platform.OS !== 'web' && <View style={styles.actions}><TouchableOpacity onPress={sharePdf} style={[styles.action, { borderColor: colors.primary, backgroundColor: colors.secondary }]}><Ionicons name="share-outline" size={20} color={colors.primary}/><Text style={{color:colors.primary}}>Share PDF</Text></TouchableOpacity><TouchableOpacity onPress={print} style={[styles.action, { borderColor: colors.border, backgroundColor: colors.muted }]}><Ionicons name="print-outline" size={20} color={colors.foreground}/><Text style={{color:colors.foreground}}>Print</Text></TouchableOpacity></View>}
      </ScrollView>
    </View>
  );
}

function Row({ label, value, color, colors, large }: { label: string; value: string; color: string; colors: any; large?: boolean }) { return <View style={styles.row}><Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text><Text style={[large ? styles.large : styles.value, { color }]}>{value}</Text></View>; }

const styles = StyleSheet.create({ root:{flex:1}, center:{flex:1,alignItems:'center',justifyContent:'center'}, scroll:{padding:16,gap:12}, biz:{borderRadius:14,padding:16,alignItems:'center'}, bizName:{fontSize:20,fontFamily:'Inter_700Bold',color:'#fff'}, bizSub:{fontSize:13,fontFamily:'Inter_400Regular',color:'rgba(255,255,255,0.82)',marginTop:4}, card:{borderRadius:14,borderWidth:1,padding:14,gap:10}, row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12}, label:{fontSize:13,fontFamily:'Inter_400Regular'}, value:{fontSize:14,fontFamily:'Inter_600SemiBold'}, large:{fontSize:20,fontFamily:'Inter_700Bold'}, section:{fontSize:11,fontFamily:'Inter_600SemiBold',letterSpacing:.8}, tableRow:{flexDirection:'row',padding:11,gap:5}, item:{flex:3,fontSize:13,fontFamily:'Inter_400Regular'}, qty:{flex:1,fontSize:13,textAlign:'center',fontFamily:'Inter_400Regular'}, amount:{flex:1.5,fontSize:13,textAlign:'right',fontFamily:'Inter_400Regular'}, bold:{fontFamily:'Inter_700Bold'}, divider:{height:1,marginVertical:2}, upi:{flexDirection:'row',alignItems:'center',gap:8,padding:12,borderRadius:12,borderWidth:1}, actions:{flexDirection:'row',gap:10}, action:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,padding:13,borderRadius:12,borderWidth:1}
});
