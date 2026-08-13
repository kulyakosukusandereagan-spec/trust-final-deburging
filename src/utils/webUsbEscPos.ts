import { ReceiptPrintData } from './printReceipt';

export interface USBEndpoint {
  endpointNumber: number;
  direction: 'in' | 'out';
  type: 'bulk' | 'interrupt' | 'isochronous';
}

export interface USBAlternateInterface {
  interfaceClass: number;
  endpoints: USBEndpoint[];
}

export interface USBInterface {
  interfaceNumber: number;
  alternates: USBAlternateInterface[];
}

export interface USBConfiguration {
  interfaces: USBInterface[];
}

export interface USBDevice {
  productName?: string;
  vendorId: number;
  productId: number;
  opened: boolean;
  configuration: USBConfiguration | null;
  open(): Promise<void>;
  selectConfiguration(configurationValue: number): Promise<void>;
  claimInterface(interfaceNumber: number): Promise<void>;
  transferOut(endpointNumber: number, data: BufferSource): Promise<any>;
}

export interface WebUsbPrinterStatus {
  isSupported: boolean;
  isConnected: boolean;
  deviceName?: string;
  vendorId?: number;
  productId?: number;
}

let activeUsbDevice: USBDevice | null = null;
let activeOutEndpoint: number | null = null;
let activeInterfaceNumber: number | null = null;

export function isWebUsbSupported(): boolean {
  return typeof window !== 'undefined' && 'usb' in navigator;
}

// Find bulk OUT endpoint for USB printer
function findPrinterEndpoint(device: USBDevice): { interfaceNumber: number; endpointNumber: number } | null {
  if (!device.configuration) return null;

  for (const iface of device.configuration.interfaces) {
    for (const alt of iface.alternates) {
      // Interface class 7 is USB Printer class, but many cheap receipt printers use vendor specific (255)
      for (const ep of alt.endpoints) {
        if (ep.direction === 'out' && ep.type === 'bulk') {
          return {
            interfaceNumber: iface.interfaceNumber,
            endpointNumber: ep.endpointNumber
          };
        }
      }
    }
  }
  return null;
}

// Connect to paired USB device
export async function connectUsbDevice(device: USBDevice): Promise<boolean> {
  try {
    await device.open();
    if (device.configuration === null) {
      await device.selectConfiguration(1);
    }

    const endpointInfo = findPrinterEndpoint(device);
    if (!endpointInfo) {
      console.warn("Could not find Bulk OUT endpoint on USB device");
      return false;
    }

    await device.claimInterface(endpointInfo.interfaceNumber);
    activeUsbDevice = device;
    activeInterfaceNumber = endpointInfo.interfaceNumber;
    activeOutEndpoint = endpointInfo.endpointNumber;

    // Save vendor/product info for auto-reconnect
    localStorage.setItem('webusb_printer_vendor_id', device.vendorId.toString());
    localStorage.setItem('webusb_printer_product_id', device.productId.toString());
    localStorage.setItem('webusb_printer_name', device.productName || 'USB Thermal Printer');

    console.log(`Connected to WebUSB ESC/POS Printer: ${device.productName}`);
    return true;
  } catch (err) {
    console.error("WebUSB connection failed:", err);
    return false;
  }
}

// Request pair new USB printer (requires direct user click gesture)
export async function requestPairUsbPrinter(): Promise<{ success: boolean; message: string; deviceName?: string }> {
  if (!isWebUsbSupported()) {
    return { success: false, message: "WebUSB is not supported in this browser. (Use Google Chrome, Microsoft Edge, or Opera)." };
  }

  try {
    // Show native USB selector dialog
    const device = await (navigator as any).usb.requestDevice({ filters: [] });
    if (!device) {
      return { success: false, message: "No USB printer was selected." };
    }

    const connected = await connectUsbDevice(device);
    if (connected) {
      return {
        success: true,
        message: `Successfully paired with ${device.productName || 'USB Thermal Printer'}! Raw ESC/POS commands will now send directly with zero print dialogs.`,
        deviceName: device.productName || 'USB Thermal Printer'
      };
    } else {
      return { success: false, message: "Failed to claim USB interface on selected device. Ensure printer is turned on and not locked by another application." };
    }
  } catch (err: any) {
    if (err.name === 'NotFoundError') {
      return { success: false, message: "Printer pairing canceled by user." };
    }
    return { success: false, message: `USB pairing error: ${err.message || err}` };
  }
}

// Auto reconnect to previously paired device if available
export async function autoConnectUsbPrinter(): Promise<boolean> {
  if (!isWebUsbSupported()) return false;
  if (activeUsbDevice && activeUsbDevice.opened) return true;

  try {
    const devices: USBDevice[] = await (navigator as any).usb.getDevices();
    const savedVendorId = localStorage.getItem('webusb_printer_vendor_id');
    const savedProductId = localStorage.getItem('webusb_printer_product_id');

    let targetDevice: USBDevice | undefined;
    if (savedVendorId && savedProductId) {
      targetDevice = devices.find(d => d.vendorId === parseInt(savedVendorId) && d.productId === parseInt(savedProductId));
    }

    if (!targetDevice && devices.length > 0) {
      targetDevice = devices[0];
    }

    if (targetDevice) {
      return await connectUsbDevice(targetDevice);
    }
  } catch (err) {
    console.warn("Auto reconnect WebUSB failed:", err);
  }
  return false;
}

export function getUsbPrinterStatus(): WebUsbPrinterStatus {
  const isSupported = isWebUsbSupported();
  const isConnected = !!(activeUsbDevice && activeUsbDevice.opened);
  const deviceName = activeUsbDevice?.productName || localStorage.getItem('webusb_printer_name') || undefined;
  
  return {
    isSupported,
    isConnected,
    deviceName,
    vendorId: activeUsbDevice?.vendorId,
    productId: activeUsbDevice?.productId
  };
}

// Helper to format string into Uint8Array with CP437 or ASCII byte encoding
function textToBytes(str: string): Uint8Array {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    bytes[i] = charCode < 128 ? charCode : 63; // Fallback '?' for out-of-range ASCII
  }
  return bytes;
}

// Build ESC/POS raw bytes array for 80mm / 58mm thermal printer
export function buildEscPosCommands(data: ReceiptPrintData): Uint8Array {
  const chunks: number[] = [];

  const pushBytes = (...args: number[]) => chunks.push(...args);
  const pushText = (text: string) => {
    const b = textToBytes(text);
    for (let i = 0; i < b.length; i++) chunks.push(b[i]);
  };

  let pharmacyName = data.pharmacyName || "Royal Trust Pharmacy";
  let address = data.branchAddress || data.address || "Airport Road, Juba Town, South Sudan";
  let phone = data.branchPhone || data.phone || "+211 922 152 427";
  let licenseNumber = data.licenseNumber || "SS-MOH-TRUST-2026";

  const savedContact = localStorage.getItem('trust_pharmacy_contact');
  if (savedContact) {
    try {
      const parsed = JSON.parse(savedContact);
      if (parsed.name) pharmacyName = parsed.name;
      if (parsed.address && !data.branchAddress) address = parsed.address;
      if (parsed.phone && !data.branchPhone) phone = parsed.phone;
      if (parsed.license) licenseNumber = parsed.license;
    } catch (e) {}
  }

  const invoiceNo = data.invoiceNumber || data.receiptNo || `INV-POS-${Math.floor(100000 + Math.random() * 900000)}`;
  const formattedDate = data.timestamp ? new Date(data.timestamp).toLocaleString() : new Date().toLocaleString();
  const subtotalVal = data.subtotal ?? data.totalUSD ?? data.total ?? 0;
  const totalUSDVal = data.totalUSD ?? data.total ?? 0;
  const discountVal = data.discount || 0;

  // 1. ESC @ : Initialize printer
  pushBytes(0x1B, 0x40);

  // 2. Open Cash Drawer (Pulse command on ESC/POS: ESC p 0 25 250)
  pushBytes(0x1B, 0x70, 0x00, 0x19, 0xFA);

  // 3. Align Center (ESC a 1)
  pushBytes(0x1B, 0x61, 0x01);

  // Bold Double Height Header Title
  pushBytes(0x1B, 0x45, 0x01); // Bold ON
  pushBytes(0x1D, 0x21, 0x11); // Double width & height
  pushText(`${pharmacyName.toUpperCase()}\n`);

  // Normal text size
  pushBytes(0x1D, 0x21, 0x00);
  if (data.branchName) {
    pushText(`${data.branchName.toUpperCase()}\n`);
  }
  pushBytes(0x1B, 0x45, 0x00); // Bold OFF

  pushText(`📍 ${address}\n`);
  pushText(`📞 Tel: ${phone}\n`);
  pushText(`Lic: ${licenseNumber}\n`);
  pushText(`------------------------------------------------\n`);

  // 4. Align Left (ESC a 0)
  pushBytes(0x1B, 0x61, 0x00);
  pushText(`INVOICE NO:  ${invoiceNo}\n`);
  pushText(`DATE/TIME:   ${formattedDate}\n`);
  pushText(`PAYMENT:     ${(data.paymentMethod || 'CASH').replace('_', ' ').toUpperCase()}\n`);
  if (data.customerName) pushText(`CUSTOMER:    ${data.customerName}\n`);
  if (data.prescriptionId) pushText(`CLINICAL RX: ${data.prescriptionId}\n`);
  if (data.prescribingDoctor) pushText(`DOCTOR:      ${data.prescribingDoctor}\n`);
  if (data.cashierName) pushText(`CASHIER:     ${data.cashierName}\n`);

  const rate = data.exchangeRateUsed || 3100;
  const subtotalSSPVal = subtotalVal * rate;
  const discountSSPVal = discountVal * rate;
  const totalSSPVal = data.totalSSP || (totalUSDVal * rate);

  pushText(`================================================\n`);
  pushText(`ITEM DESCRIPTION      QTY   UNIT PRICE    TOTAL\n`);
  pushText(`------------------------------------------------\n`);

  // 5. Items List
  (data.items || []).forEach(item => {
    const itemName = item.brandName || item.name || 'Pharmaceutical Item';
    const itemQty = item.quantity || 1;
    const itemPrice = item.price ?? (item.subtotalUSD ? item.subtotalUSD / itemQty : (item.totalUSD ? item.totalUSD / itemQty : 0));
    const itemTotal = item.subtotalUSD ?? (itemQty * itemPrice);
    const itemPriceSSP = itemPrice * rate;
    const itemTotalSSP = itemTotal * rate;

    // Format fixed columns (48 char width for 80mm thermal)
    let truncatedName = itemName.substring(0, 18).padEnd(18, ' ');
    let qtyStr = `x${itemQty}`.padStart(5, ' ');
    let unitStr = `$${itemPrice.toFixed(2)}`.padStart(11, ' ');
    let priceStr = `$${itemTotal.toFixed(2)}`.padStart(12, ' ');

    pushBytes(0x1B, 0x45, 0x01); // Bold item line
    pushText(`${truncatedName}${qtyStr}${unitStr}${priceStr}\n`);
    pushBytes(0x1B, 0x45, 0x00); // Bold OFF

    pushText(`  [≈ ${Math.round(itemPriceSSP).toLocaleString()} SSP/unit | Total: ${Math.round(itemTotalSSP).toLocaleString()} SSP]\n`);

    if (item.genericName) {
      pushText(`  (${item.genericName})\n`);
    }
    if (item.batchNo) {
      pushText(`  Batch: ${item.batchNo}\n`);
    }
  });

  pushText(`------------------------------------------------\n`);

  // 6. Totals
  pushText(`Subtotal (USD):                 $${subtotalVal.toFixed(2)}\n`);
  pushText(`Subtotal (SSP):                 ${Math.round(subtotalSSPVal).toLocaleString()} SSP\n`);
  if (discountVal > 0) {
    pushText(`Discount (USD):                -$${discountVal.toFixed(2)}\n`);
    pushText(`Discount (SSP):                -${Math.round(discountSSPVal).toLocaleString()} SSP\n`);
  }
  pushText(`Exchange Rate:                  1 USD = ${rate.toLocaleString()} SSP\n`);

  pushText(`------------------------------------------------\n`);
  pushBytes(0x1B, 0x45, 0x01); // Bold ON
  pushBytes(0x1D, 0x21, 0x01); // Double height for total
  pushText(`TOTAL DUE (USD):                 $${totalUSDVal.toFixed(2)} USD\n`);
  pushText(`TOTAL DUE (SSP):                 ${Math.round(totalSSPVal).toLocaleString()} SSP\n`);
  pushBytes(0x1D, 0x21, 0x00); // Normal size
  pushBytes(0x1B, 0x45, 0x00); // Bold OFF

  pushText(`================================================\n`);

  // 7. Footer - Align Center (ESC a 1)
  pushBytes(0x1B, 0x61, 0x01);
  pushBytes(0x1B, 0x45, 0x01);
  pushText(`PRESCRIBED MEDICATIONS NOT RETURNABLE\n`);
  pushBytes(0x1B, 0x45, 0x00);
  pushText(`Thank you for letting us serve you. Stay healthy!\n`);
  pushText(`Licensed Medical Outlet - South Sudan Healthcare Network\n`);
  pushText(`------------------------------------------------\n`);
  pushBytes(0x1B, 0x45, 0x01); // Bold ON
  pushText(`Managed by Junub POS Center, Juba South Sudan\n`);
  pushText(`junubposcenter@gmail.com\n\n`);
  pushBytes(0x1B, 0x45, 0x00); // Bold OFF

  // 8. Feed paper & Cut
  pushBytes(0x1B, 0x64, 0x05); // Feed 5 lines (ESC d 5)
  pushBytes(0x1D, 0x56, 0x42, 0x00); // Partial cut paper (GS V 66 0)

  return new Uint8Array(chunks);
}

// Print direct to WebUSB if available, else return false to allow fallback
export async function printDirectWebUsb(data: ReceiptPrintData): Promise<{ success: boolean; isWebUsb: boolean; error?: string }> {
  if (!isWebUsbSupported()) {
    return { success: false, isWebUsb: false, error: "WebUSB not supported in browser" };
  }

  // Attempt auto reconnect if active device is not open
  if (!activeUsbDevice || !activeUsbDevice.opened) {
    const reconnected = await autoConnectUsbPrinter();
    if (!reconnected) {
      return { success: false, isWebUsb: false, error: "No paired USB thermal printer found" };
    }
  }

  if (!activeUsbDevice || activeOutEndpoint === null) {
    return { success: false, isWebUsb: false, error: "USB printer device lost connection" };
  }

  try {
    const rawEscPosBytes = buildEscPosCommands(data);
    await activeUsbDevice.transferOut(activeOutEndpoint, rawEscPosBytes);
    console.log("Direct USB Thermal Print Job Sent Successfully (Zero Print Dialogs)!");
    return { success: true, isWebUsb: true };
  } catch (err: any) {
    console.error("WebUSB ESC/POS transfer error:", err);
    return { success: false, isWebUsb: true, error: err.message || "Failed to transmit raw ESC/POS bytes over USB" };
  }
}
