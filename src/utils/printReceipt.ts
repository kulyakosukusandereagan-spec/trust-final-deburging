import { printDirectWebUsb } from './webUsbEscPos';
import { executePrintHtml } from './printHelper';

export interface ReceiptPrintData {
  pharmacyName?: string;
  branchName?: string;
  branchAddress?: string;
  branchPhone?: string;
  licenseNumber?: string;
  address?: string;
  phone?: string;
  invoiceNumber?: string;
  receiptNo?: string;
  timestamp?: string | number;
  paymentMethod?: string;
  customerName?: string;
  cashierName?: string;
  prescriptionId?: string;
  prescribingDoctor?: string;
  items: Array<{
    name?: string;
    brandName?: string;
    genericName?: string;
    batchNo?: string;
    quantity: number;
    price?: number;
    subtotalUSD?: number;
    totalUSD?: number;
    subtotalSSP?: number;
  }>;
  subtotal?: number;
  discount?: number;
  total?: number;
  totalUSD?: number;
  totalSSP?: number;
  exchangeRateUsed?: number;
  isOfflineMode?: boolean;
}

export async function printThermalReceipt(data: ReceiptPrintData) {
  // First attempt zero-dialog direct WebUSB ESC/POS printing
  try {
    const usbResult = await printDirectWebUsb(data);
    if (usbResult.success) {
      console.log("Printed directly to paired USB Thermal Printer!");
      return;
    }
  } catch (usbErr) {
    console.warn("Direct USB print bypassed, switching to browser iframe print:", usbErr);
  }

  // Fallback: Isolated printable iframe for 80mm thermal printers
  const pharmacyName = data.pharmacyName || "TRUST PHARMACY";
  const address = data.branchAddress || data.address || "Airport Road, Juba Town, South Sudan";
  const phone = data.branchPhone || data.phone || "+211 922 152 427";
  const licenseNumber = data.licenseNumber || "SS-MOH-TRUST-2026";

  const invoiceNo = data.invoiceNumber || data.receiptNo || `INV-POS-${Math.floor(100000 + Math.random() * 900000)}`;
  const formattedDate = data.timestamp ? new Date(data.timestamp).toLocaleString() : new Date().toLocaleString();
  const subtotalVal = data.subtotal ?? data.totalUSD ?? data.total ?? 0;
  const totalUSDVal = data.totalUSD ?? data.total ?? 0;
  const discountVal = data.discount || 0;
  const rate = data.exchangeRateUsed || 3100;
  const subtotalSSPVal = subtotalVal * rate;
  const discountSSPVal = discountVal * rate;
  const totalSSPVal = data.totalSSP || (totalUSDVal * rate);

  const itemsListHtml = (data.items || []).map(item => {
    const itemName = item.brandName || item.name || 'Pharmaceutical Item';
    const itemQty = item.quantity || 1;
    const itemPrice = item.price ?? (item.subtotalUSD ? item.subtotalUSD / itemQty : (item.totalUSD ? item.totalUSD / itemQty : 0));
    const itemTotal = item.subtotalUSD ?? (itemQty * itemPrice);
    const itemPriceSSP = itemPrice * rate;
    const itemTotalSSP = itemTotal * rate;

    return `
      <tr style="border-bottom: 1px dashed #000;">
        <td style="padding: 5px 0; font-weight: bold; width: 40%; color: #000;">
          <strong style="font-size: 10px;">${itemName}</strong>
          ${item.genericName ? `<br/><span style="font-size: 8px; color: #000; font-weight: bold;">(${item.genericName})</span>` : ''}
          ${item.batchNo ? `<br/><span style="font-size: 8px; color: #000; font-weight: bold;">Batch: ${item.batchNo}</span>` : ''}
        </td>
        <td style="padding: 5px 0; text-align: center; width: 12%; font-weight: bold; font-size: 10px; color: #000;">
          x${itemQty}
        </td>
        <td style="padding: 5px 0; text-align: right; width: 24%; font-weight: bold; font-size: 9px; color: #000;">
          $${itemPrice.toFixed(2)}<br/>
          <span style="font-size: 8px;">${Math.round(itemPriceSSP).toLocaleString()} SSP</span>
        </td>
        <td style="padding: 5px 0; text-align: right; width: 24%; font-weight: bold; font-size: 9px; color: #000;">
          $${itemTotal.toFixed(2)}<br/>
          <span style="font-size: 8px;">${Math.round(itemTotalSSP).toLocaleString()} SSP</span>
        </td>
      </tr>
    `;
  }).join('');

  const printHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Receipt ${invoiceNo}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
          }
          @media print {
            html, body {
              width: 78mm !important;
              margin: 0 auto !important;
              padding: 4px !important;
              color: #000000 !important;
              background: #ffffff !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            * {
              color: #000000 !important;
              font-weight: bold !important;
            }
          }
          body {
            width: 78mm;
            margin: 0 auto;
            padding: 6px;
            font-family: 'Courier New', Courier, monospace, sans-serif;
            font-size: 11px;
            font-weight: bold;
            color: #000000;
            background: #ffffff;
            box-sizing: border-box;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .bold { font-weight: 900; }
          .uppercase { text-transform: uppercase; }
          .dashed-line { border-bottom: 2px dashed #000000; margin: 6px 0; }
          .double-line { border-bottom: 3px double #000000; margin: 6px 0; }
          .flex-between { display: flex; justify-content: space-between; margin: 3px 0; }
          table { width: 100%; border-collapse: collapse; margin: 6px 0; }
        </style>
      </head>
      <body>
        <div class="text-center">
          <h2 style="margin: 0; font-size: 16px; font-weight: 900; color: #000;" class="uppercase">${pharmacyName}</h2>
          ${data.branchName ? `<div style="font-size: 11px; font-weight: 900; color: #000;" class="uppercase">${data.branchName}</div>` : ''}
          <div style="font-size: 10px; margin-top: 2px; font-weight: bold; color: #000;">📍 ${address}</div>
          <div style="font-size: 10px; font-weight: bold; color: #000;">📞 Tel: ${phone}</div>
          <div style="font-size: 10px; font-weight: bold; color: #000;">Lic: ${licenseNumber}</div>
        </div>

        <div class="dashed-line"></div>

        <div style="font-size: 11px; color: #000; font-weight: bold;">
          <div class="flex-between"><span>INVOICE NO:</span><span class="bold">${invoiceNo}</span></div>
          <div class="flex-between"><span>DATE/TIME:</span><span>${formattedDate}</span></div>
          <div class="flex-between"><span>PAYMENT METHOD:</span><span class="bold uppercase">${(data.paymentMethod || 'CASH').replace('_', ' ')}</span></div>
          ${data.customerName ? `<div class="flex-between"><span>CUSTOMER:</span><span class="bold">${data.customerName}</span></div>` : ''}
          ${data.prescriptionId ? `<div class="flex-between"><span>CLINICAL RX:</span><span class="bold">${data.prescriptionId}</span></div>` : ''}
          ${data.prescribingDoctor ? `<div class="flex-between"><span>DOCTOR:</span><span>${data.prescribingDoctor}</span></div>` : ''}
          ${data.cashierName ? `<div class="flex-between"><span>CASHIER:</span><span>${data.cashierName}</span></div>` : ''}
        </div>

        <div class="double-line"></div>

        <table>
          <thead>
            <tr style="border-bottom: 2px solid #000; font-size: 9px; font-weight: 900; color: #000;">
              <th style="text-align: left; padding-bottom: 3px; width: 40%;">ITEM</th>
              <th style="text-align: center; padding-bottom: 3px; width: 12%;">QTY</th>
              <th style="text-align: right; padding-bottom: 3px; width: 24%;">UNIT PRICE</th>
              <th style="text-align: right; padding-bottom: 3px; width: 24%;">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${itemsListHtml}
          </tbody>
        </table>

        <div class="dashed-line"></div>

        <div style="font-size: 10px; color: #000; font-weight: bold;">
          <div class="flex-between"><span>Subtotal (USD):</span><span>$${subtotalVal.toFixed(2)}</span></div>
          <div class="flex-between"><span>Subtotal (SSP):</span><span>${Math.round(subtotalSSPVal).toLocaleString()} SSP</span></div>
          ${discountVal > 0 ? `
            <div class="flex-between"><span>Discount (USD):</span><span>-$${discountVal.toFixed(2)}</span></div>
            <div class="flex-between"><span>Discount (SSP):</span><span>-${Math.round(discountSSPVal).toLocaleString()} SSP</span></div>
          ` : ''}
          <div class="flex-between" style="font-size: 9px; color: #000; margin-top: 2px;">
            <span>Exchange Rate Applied:</span><span>1 USD = ${rate.toLocaleString()} SSP</span>
          </div>
          
          <div class="flex-between bold" style="font-size: 13px; margin-top: 6px; border-top: 2px dashed #000; padding-top: 4px; color: #000;">
            <span>TOTAL DUE (USD):</span>
            <span>$${totalUSDVal.toFixed(2)} USD</span>
          </div>

          <div class="flex-between bold" style="font-size: 13px; border: 2px solid #000; padding: 4px; margin-top: 4px; color: #000; background-color: #f8f8f8;">
            <span>TOTAL DUE (SSP):</span>
            <span>${Math.round(totalSSPVal).toLocaleString()} SSP</span>
          </div>
        </div>

        <div class="dashed-line"></div>

        <div class="text-center" style="font-size: 10px; margin-top: 8px; color: #000; font-weight: bold;">
          <div class="bold uppercase" style="font-size: 11px;">PRESCRIBED MEDICATIONS NOT RETURNABLE</div>
          <div style="margin-top: 3px;">Thank you for letting us serve you. Stay healthy!</div>
          <div style="margin-top: 4px; font-size: 9px;" class="uppercase">
            Licensed Medical Outlet • South Sudan Healthcare Network
          </div>

          <div style="margin-top: 10px; border-top: 1px dashed #000; padding-top: 6px; font-size: 10px; font-weight: 900;">
            Managed by Junub POS Center, Juba South Sudan<br/>
            junubposcenter@gmail.com
          </div>
        </div>
      </body>
    </html>
  `;

  executePrintHtml(printHtml, `POS Receipt - ${invoiceNo}`);
}
