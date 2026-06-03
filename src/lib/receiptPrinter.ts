import type { Sale } from '../types';

export function printReceipt(sale: Sale, storeName: string, change?: number): void {
  const html = buildHTML(sale, storeName, change);
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!doc) { document.body.removeChild(iframe); return; }

  doc.open();
  doc.write(html);
  doc.close();

  iframe.contentWindow?.focus();
  iframe.contentWindow?.print();

  setTimeout(() => { try { document.body.removeChild(iframe); } catch {} }, 2000);
}

function fmt(n: number): string {
  return n.toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function buildHTML(sale: Sale, storeName: string, change?: number): string {
  const time = new Date(sale.timestamp).toLocaleString('pt', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });

  const rows = sale.items.map(i => `
    <tr>
      <td style="text-align:left">${i.name}</td>
      <td style="text-align:center">${i.quantity}</td>
      <td style="text-align:right">${fmt(i.subtotal)}</td>
    </tr>`).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Courier New',monospace;font-size:12px;width:72mm;padding:4mm}
.c{text-align:center}.b{font-weight:bold}.r{text-align:right}
.d{border-top:1px dashed #000;margin:6px 0}
table{width:100%;border-collapse:collapse}
td{padding:2px 0;vertical-align:top}
.tot{font-size:16px;font-weight:bold}
@media print{body{width:72mm}@page{size:80mm auto;margin:0}}
</style></head><body>
<div class="c b" style="font-size:16px;margin-bottom:2px">${storeName}</div>
<div class="c" style="margin-bottom:6px;font-size:10px">${time}</div>
<div class="d"></div>
<div class="b" style="margin:4px 0">Venda #${sale.number}${sale.cashierName ? ' &middot; ' + sale.cashierName : ''}</div>
<table><thead><tr><td class="b">Artigo</td><td class="b c">Qtd</td><td class="b r">Valor</td></tr></thead>
<tbody>${rows}</tbody></table>
<div class="d"></div>
<table>
<tr class="tot"><td>TOTAL</td><td class="r">${fmt(sale.total)} MT</td></tr>
</table>
<div class="d"></div>
<div>Pagamento: ${sale.paymentMethod === 'mpesa' ? 'M-Pesa' : sale.paymentMethod === 'emola' ? 'Emola' : 'Dinheiro'}</div>
${change && change > 0 ? `<div class="b">Troco: ${fmt(change)} MT</div>` : ''}
<div class="d"></div>
<div class="c" style="margin-top:8px">Obrigado pela preferência!</div>
<div class="c" style="margin-top:16px;font-size:8px">Vela POS</div>
</body></html>`;
}
