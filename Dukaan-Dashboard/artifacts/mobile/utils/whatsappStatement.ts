import { Linking } from 'react-native';
import * as SQLite from 'expo-sqlite';

function money(value: number) {
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

export async function openMonthlyWhatsAppStatement(db: SQLite.SQLiteDatabase, customerId: string, monthDate = new Date()) {
  const customer = await db.getFirstAsync<any>('SELECT * FROM customers WHERE id=?', [customerId]);
  if (!customer) throw new Error('Customer not found');

  const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).getTime();
  const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
  const sales = await db.getAllAsync<any>('SELECT * FROM sales WHERE customer_id=? AND date BETWEEN ? AND ? ORDER BY date ASC', [customerId, start, end]);
  const items = await db.getAllAsync<any>(`SELECT si.product_name, si.quantity, si.price, s.invoice_number, s.date FROM sale_items si JOIN sales s ON s.id=si.sale_id WHERE s.customer_id=? AND s.date BETWEEN ? AND ? ORDER BY s.date ASC`, [customerId, start, end]);
  const payments = await db.getAllAsync<any>(`SELECT * FROM khata_transactions WHERE customer_id=? AND type='payment' AND date BETWEEN ? AND ? ORDER BY date ASC`, [customerId, start, end]);

  const month = monthDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const lines = [`*Dukaan Manager - Monthly Statement*`, `Customer: ${customer.name}`, `Month: ${month}`, ''];
  lines.push('*Purchases:*');
  if (!items.length) lines.push('No purchases this month.');
  else items.forEach(i => lines.push(`• ${i.product_name} × ${i.quantity} = ${money(Number(i.quantity) * Number(i.price))}`));
  const billed = sales.reduce((n, s) => n + Number(s.total || 0), 0);
  const paid = payments.reduce((n, p) => n + Number(p.amount || 0), 0);
  lines.push('', `Total bills: ${money(billed)}`, `Payments this month: ${money(paid)}`, `Current Khata due: ${money(Number(customer.credit_balance || 0))}`);
  lines.push('', 'Thank you 🙏');

  const phone = String(customer.mobile || '').replace(/\D/g, '');
  const encoded = encodeURIComponent(lines.join('\n'));
  const url = phone ? `whatsapp://send?phone=${phone}&text=${encoded}` : `whatsapp://send?text=${encoded}`;
  const canOpen = await Linking.canOpenURL(url);
  if (!canOpen) throw new Error('WhatsApp is not available on this phone.');
  await Linking.openURL(url);
}
