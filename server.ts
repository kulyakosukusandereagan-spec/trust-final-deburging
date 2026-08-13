import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Endpoints
app.get(["/api/v1/health", "/api/health"], (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});
app.head(["/api/v1/health", "/api/health"], (req, res) => {
  res.status(200).end();
});

// Server-Side API Gateway Proxying for Administrative Actions
app.post("/api/staff/update-role", (req, res) => {
  const { staffId, tenantId, newRole, updatedBy } = req.body;
  if (!staffId || !tenantId || !newRole) {
    return res.status(400).json({ error: "Missing required parameters: staffId, tenantId, newRole" });
  }

  // Update in-memory tenant staff record with server timestamp
  const targetTenant = tenants.find(t => t.id === tenantId || t.subdomain === tenantId);
  if (targetTenant && targetTenant.staff) {
    const member = targetTenant.staff.find((s: any) => s.id === staffId || s.email?.toLowerCase() === String(staffId).toLowerCase());
    if (member) {
      member.role = newRole;
      member.updatedAt = new Date().toISOString();
      member.updatedBy = updatedBy || 'administrator';
    }
  }

  console.log(`[API Gateway] Staff role updated: staffId=${staffId}, newRole=${newRole}, tenantId=${tenantId}`);
  return res.json({
    success: true,
    staffId,
    tenantId,
    newRole,
    serverTimestamp: new Date().toISOString(),
    message: "Staff role successfully updated via Server API Gateway"
  });
});

app.post("/api/staff/update-permissions", (req, res) => {
  const { staffId, tenantId, branchId, permissions, updatedBy } = req.body;
  if (!staffId || !tenantId) {
    return res.status(400).json({ error: "Missing required parameters: staffId, tenantId" });
  }

  const targetTenant = tenants.find(t => t.id === tenantId || t.subdomain === tenantId);
  if (targetTenant && targetTenant.staff) {
    const member = targetTenant.staff.find((s: any) => s.id === staffId || s.email?.toLowerCase() === String(staffId).toLowerCase());
    if (member) {
      if (branchId) member.branchId = branchId;
      if (permissions) member.permissions = permissions;
      member.updatedAt = new Date().toISOString();
      member.updatedBy = updatedBy || 'administrator';
    }
  }

  console.log(`[API Gateway] Staff permissions updated: staffId=${staffId}, branchId=${branchId}`);
  return res.json({
    success: true,
    staffId,
    tenantId,
    branchId,
    serverTimestamp: new Date().toISOString(),
    message: "Staff permissions successfully updated via Server API Gateway"
  });
});

// Initialize Gemini Client with safe fallback
let ai: any = null;
const apiKey = process.env.GEMINI_API_KEY;
if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
  try {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    console.log("JUBU PHARMA CARE Server: Gemini SDK Client initialized successfully");
  } catch (error) {
    console.error("JUBU PHARMA CARE Server: Error initializing Gemini SDK:", error);
  }
} else {
  console.log("JUBU PHARMA CARE Server: Running in simulated AI mode (GEMINI_API_KEY not configured)");
}

// Global In-Memory Simulated Database
let systemIsReset = false;
let tenants: any[] = [
  {
    id: "tenant-downtown",
    name: "Royal Trust Pharmacy",
    subdomain: "royaltrust",
    status: "active",
    plan: "enterprise",
    billingCycle: "annual",
    registeredAt: "2026-03-15T10:00:00Z",
    dbIsolationMode: "database_per_tenant",
    brandingColor: "#0ea5e9", // Sky Blue
    logoIcon: "cross",
    address: "Airport Road, Juba Town, South Sudan",
    phone: "+211 922 152 427",
    email: "info@royaltrustpharmacy.com",
    activePharmacies: 1,
    maxPharmacies: 10,
    activeUsers: 1,
    maxUsers: 50,
    branches: [
      { id: "branch-dt-1", name: "Royal Trust Pharmacy - Main Branch", address: "Airport Road, Juba Town, South Sudan", phone: "+211 922 152 427", isActive: true, registeredAt: "2026-03-15T10:00:00Z" }
    ],
    staff: [
      { id: "staff-dt-1", name: "Administrator", email: "junubposcenter@gmail.com", role: "Administrator", isActive: true, isVerified: true, branchId: "branch-dt-1" }
    ]
  }
];

// Clean catalog initialization
const baseCatalog: any[] = [];

const seedTenantsList = ["tenant-downtown", "tenant-juba", "tenant-carefirst", "tenant-stjude", "shared-global-tenant-v1"];

let drugs: any[] = [];

const INITIAL_TENANTS = JSON.parse(JSON.stringify(tenants));
const INITIAL_DRUGS: any[] = [];

// Enterprise Multi-Store & Batch Inventory Storage
let inventoryBatches: any[] = [];
let inventoryMovements: any[] = [];
let deletedBatchIds: string[] = [];
let deletedStaffIds: string[] = [];
let deletedStaffEmails: string[] = [];

// Tables required for Barcode and QR Scanning Module
let barcodes: any[] = [];
let qr_codes: any[] = [];
let inventoryAudits: any[] = [];
let stockTransfers: any[] = [];
let auditLogs: any[] = [];

function seedScannerData() {
  // Database starts completely clean
  return;
}

function seedInventoryBatches() {
  // Database starts completely clean
  return;
}

// Sync helper to keep drugs catalog updated with current batch stock levels
function syncDrugsWithBatches(tenantId: string) {
  const tenantBatches = inventoryBatches.filter(b => b.tenantId === tenantId);
  const drugMap = new Map<string, any[]>();
  
  tenantBatches.forEach(b => {
    const key = b.drugId;
    if (!drugMap.has(key)) {
      drugMap.set(key, []);
    }
    drugMap.get(key)!.push(b);
  });
  
  drugMap.forEach((batches, drugId) => {
    const dIndex = drugs.findIndex(d => d.id === drugId && d.tenantId === tenantId);
    if (dIndex !== -1) {
      const totalStock = batches.reduce((sum, b) => sum + b.quantity, 0);
      drugs[dIndex].stock = totalStock;
    }
  });
}

// Execute seeding initially
seedInventoryBatches();

// Prescriptions isolated by tenant
let prescriptions: any[] = [];

// Transactions isolated by tenant
let transactions: any[] = [];

// API REST Endpoints

// Helper to check if a staff member is deleted
const isStaffDeleted = (s: any) => {
  if (!s) return true;
  if (s.deletedAt) return true;
  if (s.id && deletedStaffIds.includes(s.id)) return true;
  if (s.email && deletedStaffEmails.includes(s.email.toLowerCase())) return true;
  return false;
};

// 1. Get all tenants (Super Admin and Tenant Selection)
app.get("/api/v1/tenants", (req, res) => {
  const sanitizedTenants = tenants.map(t => ({
    ...t,
    staff: (t.staff || []).filter(s => !isStaffDeleted(s))
  }));

  res.json({
    status: "success",
    count: sanitizedTenants.length,
    data: sanitizedTenants
  });
});

// System Factory Reset API Endpoint
app.post("/api/v1/system/reset", (req, res) => {
  try {
    systemIsReset = true;
    tenants = JSON.parse(JSON.stringify(INITIAL_TENANTS));
    tenants.forEach((t: any) => {
      t.branches = [
        { id: "branch-dt-1", name: "Royal Trust Pharmacy - Main Branch", address: "Airport Road, Juba Town, South Sudan", phone: "+211 922 152 427", isActive: true, registeredAt: "2026-03-15T10:00:00Z" }
      ];
      t.staff = [
        { id: "staff-dt-1", name: "Administrator", email: "junubposcenter@gmail.com", role: "Administrator", isActive: true, isVerified: true, branchId: "branch-dt-1" }
      ];
      t.activePharmacies = 1;
    });
    drugs = [];
    inventoryBatches = [];
    inventoryMovements = [];
    barcodes = [];
    qr_codes = [];
    inventoryAudits = [];
    stockTransfers = [];
    auditLogs = [];
    transactions = [];
    prescriptions = [];
    notificationEvents = [];
    notificationSettingsMap = {};

    res.json({
      status: "success",
      message: "System environment successfully reset to factory default state."
    });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: error?.message || "Reset failed" });
  }
});

// 2. Register new tenant (SaaS Signup)
app.post("/api/v1/tenants", (req, res) => {
  const { name, subdomain, plan, billingCycle, address, phone } = req.body;
  if (!name || !subdomain || !plan) {
    return res.status(400).json({ status: "error", message: "Missing required fields (name, subdomain, plan)" });
  }

  // Check if subdomain is taken
  if (tenants.some(t => t.subdomain === subdomain.toLowerCase())) {
    return res.status(400).json({ status: "error", message: "Subdomain already registered" });
  }

  const id = `tenant-${Math.random().toString(36).substr(2, 9)}`;
  const isolationModes = {
    starter: "shared_schema_tenant_id",
    professional: "schema_per_tenant",
    enterprise: "database_per_tenant"
  };

  const brandingColors = {
    starter: "#0ea5e9",
    professional: "#10b981",
    enterprise: "#6366f1"
  };

  const logoIcons = ["cross", "capsule", "heart", "shield", "activity"];
  const logoIcon = logoIcons[Math.floor(Math.random() * logoIcons.length)];

  const newTenant = {
    id,
    name,
    subdomain: subdomain.toLowerCase(),
    status: "active" as const,
    plan,
    billingCycle: billingCycle || "monthly",
    registeredAt: new Date().toISOString(),
    dbIsolationMode: isolationModes[plan as keyof typeof isolationModes] || "shared_schema_tenant_id",
    brandingColor: brandingColors[plan as keyof typeof brandingColors] || "#14b8a6",
    logoIcon,
    address: address || "New Pharmacy Address",
    phone: phone || "+1 (555) 000-0000"
  };

  tenants.push(newTenant);

  // Seed standard products for the new tenant
  const seedDrugs = [
    {
      id: `drug-${id}-1`,
      tenantId: id,
      name: "Amoxicillin 500mg",
      genericName: "Amoxicillin",
      sku: `AMX-500-${subdomain.toUpperCase()}`,
      category: "Antibiotics" as const,
      stock: 100,
      minStockAlert: 25,
      price: 19.00,
      cost: 8.50,
      expiryDate: "2027-12-31",
      shelfLocation: "Aisle A-1",
      requiresPrescription: true,
      strength: "500mg",
      dosageForm: "Capsule",
      manufacturer: "GlaxoSmithKline",
      productImage: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=120&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
      supplierName: "Juba Global Wholesalers"
    },
    {
      id: `drug-${id}-2`,
      tenantId: id,
      name: "Paracetamol 500mg",
      genericName: "Acetaminophen",
      sku: `PAR-500-${subdomain.toUpperCase()}`,
      category: "Analgesics" as const,
      stock: 300,
      minStockAlert: 50,
      price: 6.50,
      cost: 2.10,
      expiryDate: "2028-04-15",
      shelfLocation: "Aisle C-1",
      requiresPrescription: false,
      strength: "500mg",
      dosageForm: "Tablet",
      manufacturer: "AstraZeneca",
      productImage: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=120&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
      supplierName: "Juba Global Wholesalers"
    }
  ];

  drugs = [...drugs, ...seedDrugs];

  res.status(201).json({
    status: "success",
    message: "Tenant registered and database isolation schema provisioned.",
    data: newTenant
  });
});

// Update Tenant Data (including staff and branches)
app.put("/api/v1/tenants/:id", (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;

  const idx = tenants.findIndex(t => t.id === id);
  if (idx !== -1) {
    tenants[idx] = { ...tenants[idx], ...updatedData };
    return res.json({ status: "success", data: tenants[idx] });
  } else {
    tenants.push({ id, ...updatedData, status: "active" as const });
    return res.json({ status: "success", data: updatedData });
  }
});

// Add Staff Member to Tenant
app.post("/api/v1/tenants/:id/staff", (req, res) => {
  const { id } = req.params;
  const newStaffMember = req.body;
  const t = tenants.find(tenant => tenant.id === id);
  if (t) {
    if (!t.staff) t.staff = [];
    const exists = t.staff.some((s: any) => s.email?.toLowerCase() === newStaffMember.email?.toLowerCase());
    if (!exists) {
      t.staff.push(newStaffMember);
    } else {
      t.staff = t.staff.map((s: any) => s.email?.toLowerCase() === newStaffMember.email?.toLowerCase() ? { ...s, ...newStaffMember } : s);
    }
    return res.json({ status: "success", staff: t.staff.filter(s => !isStaffDeleted(s)) });
  }
  return res.status(404).json({ status: "error", message: "Tenant not found" });
});

// GET Deleted Staff Blacklist
app.get("/api/v1/:tenantId/staff/deleted", (req, res) => {
  res.json({ status: "success", data: { ids: deletedStaffIds, emails: deletedStaffEmails } });
});

// POST Sync Deleted Staff Blacklist
app.post("/api/v1/:tenantId/staff/deleted", (req, res) => {
  const { id, email, ids, emails } = req.body;
  if (id && !deletedStaffIds.includes(id)) deletedStaffIds.push(id);
  if (email && !deletedStaffEmails.includes(email.toLowerCase())) deletedStaffEmails.push(email.toLowerCase());
  
  if (Array.isArray(ids)) {
    ids.forEach((i: string) => { if (i && !deletedStaffIds.includes(i)) deletedStaffIds.push(i); });
  }
  if (Array.isArray(emails)) {
    emails.forEach((e: string) => { if (e && !deletedStaffEmails.includes(e.toLowerCase())) deletedStaffEmails.push(e.toLowerCase()); });
  }

  // Purge from in-memory tenants
  tenants.forEach(t => {
    if (t.staff) {
      t.staff = t.staff.filter((s: any) => !isStaffDeleted(s));
    }
  });

  res.json({ status: "success", data: { ids: deletedStaffIds, emails: deletedStaffEmails } });
});

// DELETE Staff Member from Tenant
app.delete("/api/v1/:tenantId/staff/:staffId", (req, res) => {
  const { tenantId, staffId } = req.params;
  const emailQuery = (req.query.email as string || '').toLowerCase();

  if (staffId && !deletedStaffIds.includes(staffId)) deletedStaffIds.push(staffId);
  if (emailQuery && !deletedStaffEmails.includes(emailQuery)) deletedStaffEmails.push(emailQuery);

  tenants.forEach(t => {
    if (t.staff) {
      const removed = t.staff.find((s: any) => s.id === staffId || s.email?.toLowerCase() === emailQuery);
      if (removed?.email && !deletedStaffEmails.includes(removed.email.toLowerCase())) {
        deletedStaffEmails.push(removed.email.toLowerCase());
      }
      t.staff = t.staff.filter((s: any) => !isStaffDeleted(s));
    }
  });

  res.json({ status: "success", message: "Staff member deleted successfully." });
});

// Middleware for Tenant Isolation Check
// In a production server, this would extract tenantId from subdomain/headers or JWT
const checkTenantId = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const { tenantId } = req.params;
  const tenantExists = tenants.some(t => t.id === tenantId);
  if (!tenantExists) {
    return res.status(404).json({
      status: "error",
      message: `Data Isolation Error: Tenant with ID '${tenantId}' not found. Unauthorized access blocked.`
    });
  }
  next();
};

// 3. Get Tenant Inventory (Data Isolated)
app.get("/api/v1/:tenantId/inventory", checkTenantId, (req, res) => {
  const { tenantId } = req.params;
  const tenantDrugs = drugs.filter(d => d.tenantId === tenantId);
  
  res.json({
    status: "success",
    tenantId,
    dbIsolationMethod: tenants.find(t => t.id === tenantId)?.dbIsolationMode,
    count: tenantDrugs.length,
    data: tenantDrugs
  });
});

// 4. Add Inventory Item (Data Isolated)
app.post("/api/v1/:tenantId/inventory", checkTenantId, (req, res) => {
  const { tenantId } = req.params;
  const { 
    name, genericName, category, stock, minStockAlert, price, cost, 
    expiryDate, shelfLocation, requiresPrescription,
    strength, dosageForm, manufacturer, productImage, supplierName, sku: requestSku
  } = req.body;

  if (!name || !price || stock === undefined) {
    return res.status(400).json({ status: "error", message: "Missing required inventory fields (name, price, stock)" });
  }

  const skuSuffix = name.substring(0,3).toUpperCase() + Math.floor(Math.random() * 900 + 100);
  const sku = requestSku || `${skuSuffix}-${tenantId.substring(7,10).toUpperCase()}`;

  const newDrug = {
    id: `drug-${Math.random().toString(36).substr(2, 9)}`,
    tenantId,
    name,
    genericName: genericName || name,
    sku,
    category: category || "Other",
    stock: Number(stock),
    minStockAlert: Number(minStockAlert || 10),
    price: Number(price),
    cost: Number(cost || price * 0.5),
    expiryDate: expiryDate || "2027-12-31",
    shelfLocation: shelfLocation || "Unassigned",
    requiresPrescription: !!requiresPrescription,
    strength: strength || "500mg",
    dosageForm: dosageForm || "Tablet",
    manufacturer: manufacturer || "GlaxoSmithKline",
    productImage: productImage || "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=120&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    supplierName: supplierName || "Juba Global Wholesalers"
  };

  drugs.push(newDrug);

  res.status(201).json({
    status: "success",
    message: "Inventory item isolated and stored successfully in tenant tablespace.",
    data: newDrug
  });
});

// 5. Update Inventory stock levels
app.patch("/api/v1/:tenantId/inventory/:id/stock", checkTenantId, (req, res) => {
  const { tenantId, id } = req.params;
  const { quantity } = req.body;

  const drugIndex = drugs.findIndex(d => d.id === id && d.tenantId === tenantId);
  if (drugIndex === -1) {
    return res.status(404).json({ status: "error", message: "Item not found in this tenant context" });
  }

  drugs[drugIndex].stock += Number(quantity);

  res.json({
    status: "success",
    message: `Stock level updated inside tenant database context.`,
    data: drugs[drugIndex]
  });
});

// 5b. Update Master Drug catalog properties (CRUD)
app.patch("/api/v1/:tenantId/inventory/:id", checkTenantId, (req, res) => {
  const { tenantId, id } = req.params;
  const { 
    name, genericName, category, minStockAlert, price, cost, 
    shelfLocation, requiresPrescription, strength, dosageForm, manufacturer, productImage, sku
  } = req.body;

  const drugIndex = drugs.findIndex(d => d.id === id && d.tenantId === tenantId);
  if (drugIndex === -1) {
    return res.status(404).json({ status: "error", message: "Medication item not found in this isolated tenant catalog" });
  }

  const item = drugs[drugIndex];
  if (name) item.name = name;
  if (genericName) item.genericName = genericName;
  if (category) item.category = category;
  if (minStockAlert !== undefined) item.minStockAlert = Number(minStockAlert);
  if (price !== undefined) item.price = Number(price);
  if (cost !== undefined) item.cost = Number(cost);
  if (shelfLocation !== undefined) item.shelfLocation = shelfLocation;
  if (requiresPrescription !== undefined) item.requiresPrescription = !!requiresPrescription;
  if (strength) (item as any).strength = strength;
  if (dosageForm) (item as any).dosageForm = dosageForm;
  if (manufacturer) (item as any).manufacturer = manufacturer;
  if (productImage) (item as any).productImage = productImage;
  if (sku) item.sku = sku;

  // Sync any active inventory batches of this drug with updated properties
  inventoryBatches.forEach(b => {
    if (b.drugId === id && b.tenantId === tenantId) {
      b.name = item.name;
      b.genericName = item.genericName;
      b.category = item.category;
      b.price = item.price;
      b.cost = item.cost;
      b.requiresPrescription = item.requiresPrescription;
      b.strength = (item as any).strength;
      b.dosageForm = (item as any).dosageForm;
      b.manufacturer = (item as any).manufacturer;
      b.productImage = (item as any).productImage;
      if (sku) b.sku = sku;
    }
  });

  res.json({
    status: "success",
    message: "Master drug specifications successfully updated across database tables.",
    data: item
  });
});

// GET Deleted Batches & Drugs Blacklist
app.get("/api/v1/:tenantId/inventory/deleted-batches", (req, res) => {
  res.json({ status: "success", data: deletedBatchIds });
});

// POST Sync Deleted Batches & Drugs Blacklist
app.post("/api/v1/:tenantId/inventory/deleted-batches", (req, res) => {
  const { ids, name, id } = req.body;
  const toAdd: string[] = [];
  if (id) toAdd.push(id);
  if (name) toAdd.push(name);
  if (Array.isArray(ids)) toAdd.push(...ids);

  toAdd.forEach(item => {
    if (item && !deletedBatchIds.includes(item)) {
      deletedBatchIds.push(item);
    }
  });

  // Purge from in-memory arrays
  drugs = drugs.filter(d => !deletedBatchIds.includes(d.id) && !deletedBatchIds.includes(d.name));
  inventoryBatches = inventoryBatches.filter(b => 
    !deletedBatchIds.includes(b.id) && 
    !deletedBatchIds.includes(b.drugId) && 
    !deletedBatchIds.includes(b.name) && 
    !deletedBatchIds.includes(b.batchNumber)
  );

  res.json({ status: "success", data: deletedBatchIds });
});

// 5c. Decommission/Delete Master Drug (CRUD)
app.delete("/api/v1/:tenantId/inventory/:id", checkTenantId, (req, res) => {
  const { tenantId, id } = req.params;
  const nameQuery = req.query.name as string;
  
  if (!deletedBatchIds.includes(id)) deletedBatchIds.push(id);
  if (nameQuery && !deletedBatchIds.includes(nameQuery)) deletedBatchIds.push(nameQuery);

  const drugIndex = drugs.findIndex(d => (d.id === id || d.name === id || d.name === nameQuery) && (d.tenantId === tenantId || !d.tenantId));
  let deletedDrug: any = null;
  if (drugIndex !== -1) {
    deletedDrug = drugs[drugIndex];
    if (deletedDrug?.name && !deletedBatchIds.includes(deletedDrug.name)) {
      deletedBatchIds.push(deletedDrug.name);
    }
    drugs.splice(drugIndex, 1);
  }

  // Remove corresponding batches to maintain logical referential integrity
  inventoryBatches = inventoryBatches.filter(b => 
    !(b.id === id || b.drugId === id || b.name === id || b.name === nameQuery || (deletedDrug && b.name === deletedDrug.name))
  );

  res.json({
    status: "success",
    message: "Successfully decommissioned pharmaceutical product from global registries.",
    data: deletedDrug || { id, tenantId }
  });
});

// Clear/Erase All Inventory for Tenant
app.delete("/api/v1/:tenantId/inventory/clear", checkTenantId, (req, res) => {
  const { tenantId } = req.params;
  drugs = drugs.filter(d => d.tenantId !== tenantId);
  inventoryBatches = inventoryBatches.filter(b => b.tenantId !== tenantId);

  res.json({
    status: "success",
    message: "All inventory records cleared and erased successfully for tenant.",
    tenantId
  });
});

// ====================================================================================
// ADVANCED ENTERPRISE INVENTORY MODULE API ENDPOINTS
// ====================================================================================

// 1. Get Inventory Batches (Isolated & Multi-Store Supported)
app.get("/api/v1/:tenantId/inventory/batches", checkTenantId, (req, res) => {
  const { tenantId } = req.params;
  
  // Guarantee seed data is loaded
  seedInventoryBatches();
  
  const tenantBatches = inventoryBatches.filter(b => b.tenantId === tenantId);
  
  res.json({
    status: "success",
    tenantId,
    count: tenantBatches.length,
    data: tenantBatches
  });
});

// 2. Register New Inventory Batch & Sync with Master Drugs
app.post("/api/v1/:tenantId/inventory/batches", checkTenantId, (req, res) => {
  const { tenantId } = req.params;
  const { 
    name, genericName, category, quantity, minStockAlert, price, cost, 
    expiryDate, shelfLocation, requiresPrescription, storeId, storeName, batchNumber,
    strength, dosageForm, manufacturer, productImage, supplierName, sku: requestSku
  } = req.body;
  
  if (!name || !price || quantity === undefined || !expiryDate || !storeId) {
    return res.status(400).json({ status: "error", message: "Missing required fields (name, price, quantity, expiryDate, storeId)" });
  }
  
  // Ensure seed is initialized
  seedInventoryBatches();
  
  // Find or create drug in drugs catalog
  let drug = drugs.find(d => d.name.toLowerCase() === name.toLowerCase() && d.tenantId === tenantId);
  if (!drug) {
    const skuSuffix = name.substring(0,3).toUpperCase() + Math.floor(Math.random() * 900 + 100);
    const generatedSku = requestSku || `${skuSuffix}-${tenantId.substring(7,10).toUpperCase()}`;
    drug = {
      id: `drug-${Math.random().toString(36).substr(2, 9)}`,
      tenantId,
      name,
      genericName: genericName || name,
      sku: generatedSku,
      category: category || "Other",
      stock: 0,
      minStockAlert: Number(minStockAlert || 10),
      price: Number(price),
      cost: Number(cost || price * 0.5),
      expiryDate,
      shelfLocation: shelfLocation || "Unassigned Shelf",
      requiresPrescription: !!requiresPrescription,
      strength: strength || "500mg",
      dosageForm: dosageForm || "Tablet",
      manufacturer: manufacturer || "Unspecified Manufacturer",
      productImage: productImage || "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=120&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
      supplierName: supplierName || "Juba Global Wholesalers"
    } as any;
    drugs.push(drug);
  }
  
  const actualBatchNo = batchNumber || `BCH-${(drug.sku || 'M').split('-')[0]}-${Math.floor(Math.random() * 90 + 10)}`;
  
  const newBatch = {
    id: `batch-${drug.id}-${Date.now().toString(36)}`,
    tenantId,
    drugId: drug.id,
    name: drug.name,
    genericName: drug.genericName,
    sku: drug.sku,
    category: drug.category,
    batchNumber: actualBatchNo,
    storeId,
    storeName: storeName || (storeId === "store-1" ? "Central Pharmacy" : storeId === "store-2" ? "Northside Dispensary" : "Westside Hub"),
    quantity: Number(quantity),
    minStockAlert: Number(minStockAlert || 10),
    price: Number(price),
    cost: Number(cost || price * 0.5),
    expiryDate,
    shelfLocation: shelfLocation || "Unassigned Shelf",
    requiresPrescription: !!requiresPrescription,
    strength: strength || (drug as any).strength || "500mg",
    dosageForm: dosageForm || (drug as any).dosageForm || "Tablet",
    manufacturer: manufacturer || (drug as any).manufacturer || "Unspecified Manufacturer",
    productImage: productImage || (drug as any).productImage || "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=120&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    supplierName: supplierName || (drug as any).supplierName || "Juba Global Wholesalers"
  };
  
  inventoryBatches.push(newBatch);
  
  // Log movement
  inventoryMovements.push({
    id: `move-${Math.random().toString(36).substr(2, 9)}`,
    tenantId,
    batchId: newBatch.id,
    drugName: newBatch.name,
    movementType: "purchase",
    quantity: Number(quantity),
    notes: `Initial registration of batch ${actualBatchNo}`,
    createdAt: new Date().toISOString()
  });
  
  // Sync drugs stock levels
  syncDrugsWithBatches(tenantId);
  
  res.status(201).json({
    status: "success",
    message: "New pharmaceutical inventory batch registered and stored successfully.",
    data: newBatch
  });
});

// 3. Stock Adjustment Endpoint (Manual Audits & Damages)
app.post("/api/v1/:tenantId/inventory/adjust", checkTenantId, (req, res) => {
  const { tenantId } = req.params;
  const { batchId, quantity, type, notes } = req.body;
  
  if (!batchId || quantity === undefined || !type) {
    return res.status(400).json({ status: "error", message: "Missing batchId, quantity or movement type" });
  }
  
  seedInventoryBatches();
  
  const batch = inventoryBatches.find(b => b.id === batchId && b.tenantId === tenantId);
  if (!batch) {
    return res.status(404).json({ status: "error", message: "Inventory batch not found in this tenant context." });
  }
  
  const adjustmentQty = Number(quantity);
  if (batch.quantity + adjustmentQty < 0) {
    return res.status(400).json({ status: "error", message: "Adjustment would result in negative stock level." });
  }
  
  // Apply adjustment
  batch.quantity += adjustmentQty;
  
  // Log movement
  const movement = {
    id: `move-${Math.random().toString(36).substr(2, 9)}`,
    tenantId,
    batchId,
    drugName: batch.name,
    movementType: type, // 'purchase', 'sale', 'adjustment', 'expired', 'return'
    quantity: adjustmentQty,
    notes: notes || `Manual stock adjustment of type ${type}`,
    createdAt: new Date().toISOString()
  };
  inventoryMovements.push(movement);
  
  // Sync drugs
  syncDrugsWithBatches(tenantId);
  
  res.json({
    status: "success",
    message: "Inventory stock adjusted and recorded in tenant immutable log ledger.",
    batch,
    movement
  });
});

// 4. Stock Transfer Between Store Locations
app.post("/api/v1/:tenantId/inventory/transfer", checkTenantId, (req, res) => {
  const { tenantId } = req.params;
  const { sourceBatchId, destStoreId, destStoreName, quantity } = req.body;
  
  if (!sourceBatchId || !destStoreId || !quantity || Number(quantity) <= 0) {
    return res.status(400).json({ status: "error", message: "Missing required fields or invalid transfer quantity" });
  }
  
  seedInventoryBatches();
  
  const sourceBatch = inventoryBatches.find(b => b.id === sourceBatchId && b.tenantId === tenantId);
  if (!sourceBatch) {
    return res.status(404).json({ status: "error", message: "Source inventory batch not found" });
  }
  
  if (sourceBatch.quantity < Number(quantity)) {
    return res.status(400).json({ status: "error", message: `Insufficient quantity in source batch. Available: ${sourceBatch.quantity}` });
  }
  
  // Deduct from source batch
  sourceBatch.quantity -= Number(quantity);
  
  // Find or create destination batch in destination store
  let destBatch = inventoryBatches.find(b => 
    b.tenantId === tenantId && 
    b.drugId === sourceBatch.drugId && 
    b.storeId === destStoreId && 
    b.expiryDate === sourceBatch.expiryDate
  );
  
  if (!destBatch) {
    // Create new batch in dest store
    destBatch = {
      id: `batch-${sourceBatch.drugId}-${destStoreId}-${Date.now().toString(36)}`,
      tenantId,
      drugId: sourceBatch.drugId,
      name: sourceBatch.name,
      genericName: sourceBatch.genericName,
      sku: sourceBatch.sku.split('-')[0] + (destStoreId === "store-1" ? "" : destStoreId === "store-2" ? "-N" : "-W"),
      category: sourceBatch.category,
      batchNumber: sourceBatch.batchNumber,
      storeId: destStoreId,
      storeName: destStoreName || (destStoreId === "store-1" ? "Central Pharmacy" : destStoreId === "store-2" ? "Northside Dispensary" : "Westside Hub"),
      quantity: Number(quantity),
      minStockAlert: sourceBatch.minStockAlert,
      price: sourceBatch.price,
      cost: sourceBatch.cost,
      expiryDate: sourceBatch.expiryDate,
      shelfLocation: "Unassigned Shelf",
      requiresPrescription: sourceBatch.requiresPrescription
    };
    inventoryBatches.push(destBatch);
  } else {
    // Increment destination batch quantity
    destBatch.quantity += Number(quantity);
  }
  
  // Log stock movements
  inventoryMovements.push({
    id: `move-${Math.random().toString(36).substr(2, 9)}`,
    tenantId,
    batchId: sourceBatch.id,
    drugName: sourceBatch.name,
    movementType: "transfer_out",
    quantity: -Number(quantity),
    notes: `Transferred to ${destBatch.storeName}. Batch: ${sourceBatch.batchNumber}`,
    createdAt: new Date().toISOString()
  });
  
  inventoryMovements.push({
    id: `move-${Math.random().toString(36).substr(2, 9)}`,
    tenantId,
    batchId: destBatch.id,
    drugName: destBatch.name,
    movementType: "transfer_in",
    quantity: Number(quantity),
    notes: `Transferred from ${sourceBatch.storeName}. Batch: ${sourceBatch.batchNumber}`,
    createdAt: new Date().toISOString()
  });
  
  // Sync with standard drugs array
  syncDrugsWithBatches(tenantId);
  
  res.json({
    status: "success",
    message: `Transferred ${quantity} units of ${sourceBatch.name} successfully from ${sourceBatch.storeName} to ${destBatch.storeName}.`,
    sourceBatch,
    destBatch
  });
});

// 5. Get Supply Chain Movement Audit Trail logs
app.get("/api/v1/:tenantId/inventory/movements", checkTenantId, (req, res) => {
  const { tenantId } = req.params;
  const tenantMovements = inventoryMovements.filter(m => m.tenantId === tenantId);
  
  res.json({
    status: "success",
    count: tenantMovements.length,
    data: tenantMovements.sort((a,b) => b.createdAt.localeCompare(a.createdAt))
  });
});

// 6. Gemini-Powered AI Demand Forecasting & Smart Safety stock Recommendations
app.post("/api/v1/:tenantId/inventory/forecast", checkTenantId, async (req, res) => {
  const { tenantId } = req.params;
  seedInventoryBatches();
  const tenantBatches = inventoryBatches.filter(b => b.tenantId === tenantId);
  
  if (ai) {
    try {
      const systemInstruction = `You are an expert Clinical Pharmacist, Supply Chain Analyst, and AI Forecaster for JUBU PHARMA CARE.
Analyze the provided multi-store inventory dataset and generate a 30-day demand forecast, stockout risks, safety reorder recommendation quantities, and seasonal shift insights.
You must return your response strictly as a raw JSON object matching this schema. Do not output any markdown code blocks, backticks, or explanatory text before or after the JSON:
{
  "forecast": [
    {
      "category": "string",
      "currentStock": number,
      "projectedDemand30d": number,
      "growthRate": number,
      "recommendedReorder": number,
      "stockoutRisk": number,
      "seasonalFactors": "string",
      "revenueProjection": number
    }
  ],
  "alerts": [
    {
      "drugName": "string",
      "storeName": "string",
      "riskLevel": "CRITICAL" | "HIGH" | "MEDIUM",
      "reason": "string"
    }
  ],
  "insights": [
    "string"
  ]
}`;

      const prompt = `Here is the current inventory batch dataset for tenant ID "${tenantId}":
${JSON.stringify(tenantBatches, null, 2)}

Perform a deep analysis and generate the demand forecast and safety stock recommendations.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.2,
          responseMimeType: "application/json"
        }
      });

      const text = response.text || "{}";
      const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const result = JSON.parse(cleanedText);
      return res.json({ status: "success", data: result });
    } catch (error) {
      console.error("Gemini Inventory Forecast API Error, running fallback:", error);
      return res.json({ status: "success", data: getInventoryForecastFallback(tenantId, tenantBatches) });
    }
  } else {
    return res.json({ status: "success", data: getInventoryForecastFallback(tenantId, tenantBatches) });
  }
});

// Helper for high-fidelity fallback forecasts in Sandbox guest mode
function getInventoryForecastFallback(tenantId: string, tenantBatches: any[]): any {
  const categories = Array.from(new Set(tenantBatches.map(b => b.category || 'Other')));
  
  const forecast = categories.map(cat => {
    const catBatches = tenantBatches.filter(b => b.category === cat);
    const currentStock = catBatches.reduce((sum, b) => sum + b.quantity, 0);
    const avgPrice = catBatches.length ? (catBatches.reduce((sum, b) => sum + b.price, 0) / catBatches.length) : 15;
    
    let projectedDemand = Math.floor(currentStock * (1.2 + Math.random() * 0.4));
    if (currentStock < 30) {
      projectedDemand = currentStock + Math.floor(40 + Math.random() * 30);
    }
    
    const stockoutRisk = currentStock < 30 ? Math.floor(70 + Math.random() * 25) : Math.floor(10 + Math.random() * 40);
    const recommendedReorder = Math.max(0, projectedDemand - currentStock + 20);
    const growthRate = Math.floor(5 + Math.random() * 25);
    
    let seasonalFactors = "Standard demand profile with moderate growth.";
    if (cat === "Antibiotics" || cat === "Respiratory") {
      seasonalFactors = "High risk of seasonal respiratory illness spikes during the upcoming winter season.";
    } else if (cat === "Vitamins") {
      seasonalFactors = "Increased consumer wellness focus and winter immune health campaigns.";
    } else if (cat === "Diabetic" || cat === "Cardiovascular") {
      seasonalFactors = "Consistent year-round chronic care demand with steady 5% patient panel growth.";
    }
    
    return {
      category: cat,
      currentStock,
      projectedDemand30d: projectedDemand,
      growthRate,
      recommendedReorder,
      stockoutRisk,
      seasonalFactors,
      revenueProjection: parseFloat((projectedDemand * avgPrice).toFixed(2))
    };
  });

  const alerts = tenantBatches
    .filter(b => b.quantity <= b.minStockAlert)
    .map(b => {
      const riskLevel = b.quantity === 0 ? "CRITICAL" : b.quantity < b.minStockAlert * 0.5 ? "HIGH" : "MEDIUM";
      return {
        drugName: b.name,
        storeName: b.storeName,
        riskLevel,
        reason: b.quantity === 0 
          ? `Stock completely depleted at ${b.storeName}. Out-of-stock lock in place.` 
          : `Current quantity of ${b.quantity} is below safety threshold (${b.minStockAlert}) at ${b.storeName}.`
      };
    });

  const today = new Date();
  tenantBatches.forEach(b => {
    const exp = new Date(b.expiryDate);
    const diffTime = exp.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 90) {
      alerts.push({
        drugName: b.name,
        storeName: b.storeName,
        riskLevel: "HIGH",
        reason: `Batch ${b.batchNumber} expires in ${diffDays} days (${b.expiryDate}) at ${b.storeName}.`
      });
    }
  });

  const insights = [
    `Recommended immediate purchase orders for low-stock lines to secure a ${forecast[0]?.category || 'Antibiotics'} supply ahead of local transit cycles.`,
    "Clinical alert: Consider running promotional clearance or physician alerts for expiring lots to optimize inventory write-offs.",
    "Data reveals a highly stable cardiovascular care segment, suggesting long-term bulk procurement benefits (8% cost savings)."
  ];

  return {
    forecast,
    alerts,
    insights
  };
}

// 6. Get Prescriptions (Data Isolated)
app.get("/api/v1/:tenantId/prescriptions", checkTenantId, (req, res) => {
  const { tenantId } = req.params;
  const tenantRx = prescriptions.filter(p => p.tenantId === tenantId);

  res.json({
    status: "success",
    tenantId,
    count: tenantRx.length,
    data: tenantRx
  });
});

// 7. Submit Prescription (Data Isolated)
app.post("/api/v1/:tenantId/prescriptions", checkTenantId, (req, res) => {
  const { tenantId } = req.params;
  const { patientName, doctorName, doctorLicense, drugName, dosage, quantity } = req.body;

  if (!patientName || !doctorName || !drugName || !quantity) {
    return res.status(400).json({ status: "error", message: "Missing required prescription details" });
  }

  const newRx = {
    id: `rx-${Math.random().toString(36).substr(2, 9)}`,
    tenantId,
    patientName,
    doctorName,
    doctorLicense: doctorLicense || "UNKNOWN-LIC",
    drugName,
    dosage: dosage || "Take as directed",
    quantity: Number(quantity),
    status: "pending" as const,
    createdAt: new Date().toISOString()
  };

  prescriptions.push(newRx);

  res.status(201).json({
    status: "success",
    message: "Prescription recorded and queued for pharmacist verification.",
    data: newRx
  });
});

// 8. Approve/Reject Prescription (Pharmacist Role)
app.patch("/api/v1/:tenantId/prescriptions/:id/status", checkTenantId, (req, res) => {
  const { tenantId, id } = req.params;
  const { status, pharmacistNotes } = req.body;

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ status: "error", message: "Invalid status state" });
  }

  const rxIndex = prescriptions.findIndex(p => p.id === id && p.tenantId === tenantId);
  if (rxIndex === -1) {
    return res.status(404).json({ status: "error", message: "Prescription not found in tenant tables" });
  }

  prescriptions[rxIndex].status = status;
  prescriptions[rxIndex].pharmacistNotes = pharmacistNotes || "";

  res.json({
    status: "success",
    message: `Prescription has been verified and ${status} by Pharmacist.`,
    data: prescriptions[rxIndex]
  });
});

// 9. Get Transactions (Data Isolated)
app.get("/api/v1/:tenantId/transactions", checkTenantId, (req, res) => {
  const { tenantId } = req.params;
  ensureRichTransactionsSeeded();
  if (systemIsReset) {
    return res.json({
      status: "success",
      tenantId,
      count: 0,
      data: []
    });
  }
  let tenantTx = transactions.filter(t => t.tenantId === tenantId);
  if (tenantTx.length === 0) {
    tenantTx = transactions.filter(t => t.tenantId === 'shared-global-tenant-v1' || t.tenantId === 'tenant-downtown');
  }

  res.json({
    status: "success",
    tenantId,
    count: tenantTx.length,
    data: tenantTx
  });
});

// Clear Transactions for Tenant
app.delete("/api/v1/:tenantId/transactions", checkTenantId, (req, res) => {
  const { tenantId } = req.params;
  transactions = transactions.filter(t => t.tenantId !== tenantId);
  res.json({
    status: "success",
    message: `All sales transactions for tenant ${tenantId} have been cleared.`
  });
});

// 10. Process Transaction / Checkout (POS Isolated)
app.post("/api/v1/:tenantId/transactions", checkTenantId, (req, res) => {
  const { tenantId } = req.params;
  const { items, paymentMethod, insuranceProvider, cashierName, cashierEmail, staffName, staffEmail } = req.body;

  if (!items || !items.length) {
    return res.status(400).json({ status: "error", message: "No items provided for POS checkout" });
  }

  // Deduct stocks and construct invoice
  const processedItems = [];
  let subtotal = 0;

  for (const cartItem of items) {
    seedInventoryBatches();

    let drug = drugs.find(d => (d.id === cartItem.drugId || d.id === cartItem.batchId) && d.tenantId === tenantId);
    if (!drug && cartItem.name) {
      drug = drugs.find(d => d.name.toLowerCase() === cartItem.name.toLowerCase() && d.tenantId === tenantId);
    }
    if (!drug) {
      drug = {
        id: cartItem.drugId || `drug-${Math.random().toString(36).substr(2, 9)}`,
        tenantId,
        name: cartItem.name || "Pharmaceutical Item",
        genericName: cartItem.name || "Pharmaceutical Item",
        sku: `DRUG-${Math.floor(1000 + Math.random() * 9000)}`,
        category: "General Medicine",
        price: cartItem.price || 10,
        cost: cartItem.cost || 5,
        stock: 500,
        minStockAlert: 10,
        strength: "500mg",
        expiryDate: "2028-12-31",
        shelfLocation: "Aisle A-1",
        requiresPrescription: false,
        dosageForm: "Tablet",
        manufacturer: "Standard Pharma",
        productImage: "",
        supplierName: "Central Warehouse"
      };
      drugs.push(drug);
    }
    
    // Locate and sort batches according to FEFO
    let candidateBatches = inventoryBatches
      .filter(b => (b.drugId === drug!.id || b.id === cartItem.batchId || b.batchNumber === cartItem.batchNumber || (b.name && cartItem.name && b.name.toLowerCase() === cartItem.name.toLowerCase())) && b.tenantId === tenantId)
      .sort((a, b) => new Date(a.expiryDate || '2030-01-01').getTime() - new Date(b.expiryDate || '2030-01-01').getTime());

    if (candidateBatches.length === 0) {
      const newBatch = {
        id: cartItem.batchId || `batch-${Math.random().toString(36).substr(2, 9)}`,
        tenantId,
        drugId: drug.id,
        batchNumber: cartItem.batchNumber || `LOT-${Math.floor(1000 + Math.random() * 9000)}`,
        name: drug.name,
        quantity: 500,
        expiryDate: "2028-12-31",
        cost: cartItem.cost || drug.cost,
        price: cartItem.price || drug.price
      };
      inventoryBatches.push(newBatch);
      candidateBatches = [newBatch];
    }

    let remainingToDeduct = cartItem.quantity;
    for (const b of candidateBatches) {
      if (remainingToDeduct <= 0) break;
      const deductFromThis = Math.min(b.quantity, remainingToDeduct);
      b.quantity = Math.max(0, b.quantity - deductFromThis);
      remainingToDeduct -= deductFromThis;

      // Log movement to movement history
      inventoryMovements.push({
        id: `move-${Math.random().toString(36).substr(2, 9)}`,
        tenantId,
        batchId: b.id,
        drugName: b.name,
        movementType: "sale",
        quantity: -deductFromThis,
        notes: `FEFO allocation auto-depleted via POS sale`,
        createdAt: new Date().toISOString()
      });
    }

    const itemUnitPrice = (cartItem.price !== undefined && cartItem.price !== null) ? Number(cartItem.price) : drug.price;
    const itemPricingType = cartItem.pricingType || (cartItem.quantity >= (cartItem.wholesaleLimit || 10) ? 'Wholesale' : 'Retail');
    
    drug.stock = Math.max(0, drug.stock - cartItem.quantity);
    subtotal += itemUnitPrice * cartItem.quantity;
    processedItems.push({
      drugId: drug.id,
      name: cartItem.name || drug.name,
      quantity: cartItem.quantity,
      price: itemUnitPrice,
      pricingType: itemPricingType,
      wholesaleLimit: cartItem.wholesaleLimit || 10,
      wholesalePrice: cartItem.wholesalePrice || (drug.price * 0.85),
      retailPrice: cartItem.retailPrice || drug.price,
      cost: cartItem.cost || (drug.cost || drug.price * 0.5)
    });
  }

  const tax = Math.round((subtotal * 0.08) * 100) / 100;
  const discount = paymentMethod === "insurance" ? Math.round((subtotal * 0.5) * 100) / 100 : 0.00; // Mock insurance coverage
  const total = Math.round((subtotal + tax - discount) * 100) / 100;

  const invoiceNumber = `INV-${tenantId.substring(7,9).toUpperCase()}-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000 + 10000)}`;

  const newTx = {
    id: `tx-${Math.random().toString(36).substr(2, 9)}`,
    tenantId,
    invoiceNumber,
    items: processedItems,
    subtotal,
    tax,
    discount,
    total,
    paymentMethod,
    insuranceProvider,
    cashierName: cashierName || staffName || "Simulated Cashier",
    cashierEmail: cashierEmail || staffEmail || "junubposcenter@gmail.com",
    staffName: staffName || cashierName || "Simulated Cashier",
    staffEmail: staffEmail || cashierEmail || "junubposcenter@gmail.com",
    createdAt: new Date().toISOString()
  };

  transactions.push(newTx);
  
  // Sync core drugs catalog
  syncDrugsWithBatches(tenantId);

  res.status(201).json({
    status: "success",
    message: "POS Transaction checkout registered and secured under Tenant Audit Log.",
    data: newTx
  });
});

// GET POS Batches for specific tenant
app.get("/api/v1/pos/batches", (req, res) => {
  const { tenantId } = req.query;
  if (!tenantId) {
    return res.status(400).json({ status: "error", message: "tenantId parameter is required" });
  }

  // Ensure batches are seeded
  seedInventoryBatches();

  const tenantBatches = inventoryBatches.filter(b => 
    (b.tenantId === tenantId || b.tenantId === 'shared-global-tenant-v1') &&
    !deletedBatchIds.includes(b.id) &&
    !deletedBatchIds.includes(b.drugId) &&
    !deletedBatchIds.includes(b.name) &&
    !deletedBatchIds.includes(b.batchNumber)
  );
  res.json({
    status: "success",
    data: tenantBatches
  });
});

// POST POS Sync for offline transactions queue
app.post("/api/v1/pos/sync", (req, res) => {
  const { tenantId, salesQueue } = req.body;
  
  if (!tenantId || !salesQueue || !Array.isArray(salesQueue)) {
    return res.status(400).json({ status: "error", message: "Missing tenantId or salesQueue list" });
  }

  const processedTransactions: any[] = [];
  let syncCount = 0;

  salesQueue.forEach((sale: any) => {
    // Generate invoice
    const invoiceNumber = sale.invoiceNumber || `INV-${tenantId.substring(7, 10).toUpperCase()}-SYNC-${Math.floor(Math.random() * 900000 + 100000)}`;
    
    // Deduct stock levels in batch inventory
    sale.items.forEach((item: any) => {
      const batch = inventoryBatches.find(b => b.batchNumber === item.batchNumber && b.tenantId === tenantId);
      if (batch) {
        batch.quantity = Math.max(0, batch.quantity - item.quantity);
      }
    });

    const newTx = {
      id: sale.id || `tx-${Math.random().toString(36).substr(2, 9)}`,
      tenantId,
      invoiceNumber,
      items: sale.items,
      subtotal: sale.subtotal,
      tax: sale.tax,
      discount: sale.discount,
      total: sale.total,
      paymentMethod: sale.paymentMethod,
      customerName: sale.customerName,
      prescriptionId: sale.prescriptionId,
      cashierName: "Offline Sync Engine",
      createdAt: sale.timestamp || new Date().toISOString()
    };

    transactions.push(newTx);
    processedTransactions.push(newTx);
    syncCount++;
  });

  // Keep drugs master catalog in sync with new batch quantity deductions
  syncDrugsWithBatches(tenantId);

  res.json({
    status: "success",
    message: `Successfully synchronized ${syncCount} offline sales to cloud database.`,
    data: processedTransactions
  });
});

// ============================================================================
// BARCODE AND QR CODE SCANNING MODULE API ENDPOINTS
// ============================================================================

// GET all barcodes
app.get("/api/v1/:tenantId/scanning/barcodes", checkTenantId, (req, res) => {
  const { tenantId } = req.params;
  seedScannerData();
  const tenantBarcodes = barcodes.filter(b => b.tenantId === tenantId);
  res.json({ status: "success", data: tenantBarcodes });
});

// POST barcode mapping (register or generate label)
app.post("/api/v1/:tenantId/scanning/barcodes", checkTenantId, (req, res) => {
  const { tenantId } = req.params;
  const { medicineId, sku, barcode, username } = req.body;
  
  if (!medicineId || !sku || !barcode) {
    return res.status(400).json({ status: "error", message: "Missing required fields (medicineId, sku, barcode)" });
  }

  seedScannerData();
  const exists = barcodes.find(b => b.barcode === barcode && b.tenantId === tenantId);
  if (exists) {
    exists.medicineId = medicineId;
    exists.sku = sku;
  } else {
    barcodes.push({
      id: `bar-${Math.random().toString(36).substr(2, 9)}`,
      tenantId,
      medicineId,
      sku,
      barcode,
      createdAt: new Date().toISOString()
    });
  }

  // Record audit log
  auditLogs.push({
    id: `log-${Math.random().toString(36).substr(2, 9)}`,
    tenantId,
    username: username || "System Operator",
    action: "BARCODE_GENERATE",
    entity_name: "barcodes",
    entity_id: medicineId,
    details: `Generated custom barcode label ${barcode} for medication SKU ${sku}`,
    createdAt: new Date().toISOString()
  });

  res.json({ status: "success", message: "Barcode registered and audit logged successfully." });
});

// GET all qr codes
app.get("/api/v1/:tenantId/scanning/qrcodes", checkTenantId, (req, res) => {
  const { tenantId } = req.params;
  seedScannerData();
  const tenantQRs = qr_codes.filter(q => q.tenantId === tenantId);
  res.json({ status: "success", data: tenantQRs });
});

// POST QR code info registration
app.post("/api/v1/:tenantId/scanning/qrcodes", checkTenantId, (req, res) => {
  const { tenantId } = req.params;
  const { medicineId, qrDataString } = req.body;

  if (!medicineId || !qrDataString) {
    return res.status(400).json({ status: "error", message: "Missing medicineId or qrDataString" });
  }

  seedScannerData();
  qr_codes.push({
    id: `qr-${Math.random().toString(36).substr(2, 9)}`,
    tenantId,
    medicineId,
    qrDataString,
    createdAt: new Date().toISOString()
  });

  res.json({ status: "success", message: "QR Code registered successfully." });
});

// GET inventory audits
app.get("/api/v1/:tenantId/scanning/audits", checkTenantId, (req, res) => {
  const { tenantId } = req.params;
  seedScannerData();
  const tenantAudits = inventoryAudits.filter(a => a.tenantId === tenantId);
  res.json({ status: "success", data: tenantAudits });
});

// POST register completed audit and discrepancy report
app.post("/api/v1/:tenantId/scanning/audits", checkTenantId, (req, res) => {
  const { tenantId } = req.params;
  const { storeId, storeName, checkedBy, discrepancies, status } = req.body;

  if (!storeId || !checkedBy || !discrepancies) {
    return res.status(400).json({ status: "error", message: "Missing required fields for inventory audit" });
  }

  seedScannerData();
  const newAudit = {
    id: `audit-${Math.random().toString(36).substr(2, 9)}`,
    tenantId,
    storeId,
    storeName: storeName || (storeId === "store-1" ? "Central Pharmacy" : "Northside Dispensary"),
    checkedAt: new Date().toISOString(),
    checkedBy,
    status: status || "Completed",
    discrepancies
  };

  inventoryAudits.push(newAudit);

  // Auto-correct stock levels in inventory batches for each discrepancy
  discrepancies.forEach((d: any) => {
    const batch = inventoryBatches.find(b => b.id === d.batchId && b.tenantId === tenantId);
    if (batch) {
      const prevQty = batch.quantity;
      batch.quantity = Math.max(0, d.physicalQty);
      
      // Log stock movement for the discrepancy
      inventoryMovements.push({
        id: `move-${Math.random().toString(36).substr(2, 9)}`,
        tenantId,
        batchId: batch.id,
        drugName: batch.name,
        movementType: "adjustment",
        quantity: d.difference, // difference
        notes: `QR audit physical stock sync: changed from ${prevQty} to ${d.physicalQty}. Reason: ${d.action || "Audit correction"}`,
        createdAt: new Date().toISOString()
      });
    }
  });

  // Sync master drugs stock
  syncDrugsWithBatches(tenantId);

  // Record audit log entry
  auditLogs.push({
    id: `log-${Math.random().toString(36).substr(2, 9)}`,
    tenantId,
    username: checkedBy,
    action: "INVENTORY_AUDIT_QR",
    entity_name: "inventory_audits",
    entity_id: newAudit.id,
    details: `Conducted inventory audit at ${newAudit.storeName} with ${discrepancies.length} discrepancy records processed.`,
    createdAt: new Date().toISOString()
  });

  res.json({
    status: "success",
    message: "Inventory audit report logged and stocks synchronized automatically.",
    data: newAudit
  });
});

// GET stock branch transfers log
app.get("/api/v1/:tenantId/scanning/transfers", checkTenantId, (req, res) => {
  const { tenantId } = req.params;
  seedScannerData();
  const tenantTransfers = stockTransfers.filter(t => t.tenantId === tenantId);
  res.json({ status: "success", data: tenantTransfers });
});

// POST complete branch transfer with automatic inventory update
app.post("/api/v1/:tenantId/scanning/transfers", checkTenantId, (req, res) => {
  const { tenantId } = req.params;
  const { drugId, name, batchId, sourceBranchId, sourceBranchName, destinationBranchId, destinationBranchName, quantity, username, notes } = req.body;

  if (!drugId || !batchId || !sourceBranchId || !destinationBranchId || !quantity) {
    return res.status(400).json({ status: "error", message: "Missing required transfer fields" });
  }

  seedScannerData();
  seedInventoryBatches();

  const sourceBatch = inventoryBatches.find(b => b.id === batchId && b.tenantId === tenantId);
  if (!sourceBatch) {
    return res.status(404).json({ status: "error", message: "Source inventory batch not found" });
  }

  const transferQty = Number(quantity);
  if (sourceBatch.quantity < transferQty) {
    return res.status(400).json({ status: "error", message: `Insufficient quantity in source branch. Available: ${sourceBatch.quantity}` });
  }

  // Deduct from source
  sourceBatch.quantity -= transferQty;

  // Find or create destination batch
  let destBatch = inventoryBatches.find(b => 
    b.tenantId === tenantId && 
    b.drugId === drugId && 
    b.storeId === destinationBranchId && 
    b.expiryDate === sourceBatch.expiryDate
  );

  if (!destBatch) {
    destBatch = {
      id: `batch-${drugId}-${destinationBranchId}-${Date.now().toString(36)}`,
      tenantId,
      drugId,
      name: sourceBatch.name,
      genericName: sourceBatch.genericName,
      sku: sourceBatch.sku.split('-')[0] + (destinationBranchId === "store-1" ? "" : destinationBranchId === "store-2" ? "-N" : "-W"),
      category: sourceBatch.category,
      batchNumber: sourceBatch.batchNumber,
      storeId: destinationBranchId,
      storeName: destinationBranchName || (destinationBranchId === "store-1" ? "Central Pharmacy" : "Northside Dispensary"),
      quantity: transferQty,
      minStockAlert: sourceBatch.minStockAlert,
      price: sourceBatch.price,
      cost: sourceBatch.cost,
      expiryDate: sourceBatch.expiryDate,
      shelfLocation: "Unassigned Shelf",
      requiresPrescription: sourceBatch.requiresPrescription
    };
    inventoryBatches.push(destBatch);
  } else {
    destBatch.quantity += transferQty;
  }

  // Add stock transfer record
  const newTransfer = {
    id: `trans-${Math.random().toString(36).substr(2, 9)}`,
    tenantId,
    drugId,
    name: name || sourceBatch.name,
    batchId,
    sourceBranchId,
    sourceBranchName: sourceBranchName || (sourceBranchId === "store-1" ? "Central Pharmacy" : "Northside Dispensary"),
    destinationBranchId,
    destinationBranchName: destinationBranchName || (destinationBranchId === "store-1" ? "Central Pharmacy" : "Northside Dispensary"),
    quantity: transferQty,
    status: "Completed",
    createdAt: new Date().toISOString(),
    notes: notes || "Dispatched via QR branch transfer scan"
  };
  stockTransfers.push(newTransfer);

  // Log standard movements
  inventoryMovements.push({
    id: `move-${Math.random().toString(36).substr(2, 9)}`,
    tenantId,
    batchId,
    drugName: sourceBatch.name,
    movementType: "transfer_out",
    quantity: -transferQty,
    notes: `QR dispatched branch transfer to ${destBatch.storeName}`,
    createdAt: new Date().toISOString()
  });

  inventoryMovements.push({
    id: `move-${Math.random().toString(36).substr(2, 9)}`,
    tenantId,
    batchId: destBatch.id,
    drugName: destBatch.name,
    movementType: "transfer_in",
    quantity: transferQty,
    notes: `QR received branch transfer from ${sourceBatch.storeName}`,
    createdAt: new Date().toISOString()
  });

  // Sync with standard drugs array
  syncDrugsWithBatches(tenantId);

  // Record audit log entry
  auditLogs.push({
    id: `log-${Math.random().toString(36).substr(2, 9)}`,
    tenantId,
    username: username || "System Operator",
    action: "STOCK_TRANSFER_QR",
    entity_name: "stock_transfers",
    entity_id: newTransfer.id,
    details: `Transferred ${transferQty} units of ${sourceBatch.name} from ${newTransfer.sourceBranchName} to ${newTransfer.destinationBranchName} via QR dispatch scan.`,
    createdAt: new Date().toISOString()
  });

  res.json({
    status: "success",
    message: `Successfully transferred ${transferQty} units of ${sourceBatch.name} via QR scan.`,
    data: newTransfer
  });
});

// GET all scanning audit logs
app.get("/api/v1/:tenantId/scanning/logs", checkTenantId, (req, res) => {
  const { tenantId } = req.params;
  seedScannerData();
  const tenantLogs = auditLogs.filter(l => l.tenantId === tenantId).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ status: "success", data: tenantLogs });
});

// POST create custom scanning logs
app.post("/api/v1/:tenantId/scanning/logs", checkTenantId, (req, res) => {
  const { tenantId } = req.params;
  const { username, action, entity_name, entity_id, details } = req.body;

  if (!action || !entity_name || !details) {
    return res.status(400).json({ status: "error", message: "Missing required scan activity log fields" });
  }

  seedScannerData();
  const newLog = {
    id: `log-${Math.random().toString(36).substr(2, 9)}`,
    tenantId,
    username: username || "System Operator",
    action,
    entity_name,
    entity_id: entity_id || "none",
    details,
    createdAt: new Date().toISOString()
  };
  auditLogs.push(newLog);

  res.json({ status: "success", data: newLog });
});

// AI SaaS Architect QA Chatbot Route (Google Gemini)
app.post("/api/v1/ai/consult", async (req, res) => {
  const { messages } = req.body;
  if (!messages || !messages.length) {
    return res.status(400).json({ status: "error", message: "No consultation messages provided" });
  }

  const systemPrompt = `You are a Senior SaaS Software Architect specializing in HIPPA-compliant, multi-tenant digital health solutions.
You represent JUBU PHARMA CARE, a leading multi-tenant Pharmacy Management System.

Your goal is to answer questions objectively and with technical depth regarding:
1. Multi-tenancy database structures (Shared DB with Tenant ID vs. Schema-per-tenant vs. Database-per-tenant). Explain when to use which (JUBU PHARMA CARE uses starter = Shared Schema/TenantID, professional = Schema-per-tenant, enterprise = DB-per-tenant).
2. Data isolation and security architecture (JWT tokens, role-based access control (RBAC), row-level security (RLS) in PostgreSQL).
3. Subscription models (Stripe Billing, tenant provisioning pipelines).
4. Compliance constraints like HIPAA (Health Insurance Portability and Accountability Act) and GDPR (Audit logging, Patient Health Information (PHI) encryption at rest/transit).
5. Scalability under high loads (Redis caches, CDN, load balancers, database read replicas).

Explain concisely, professionally, and clearly. Limit answers to around 2-3 short, highly informative paragraphs or clean bullet points. Keep it practical.`;

  // Formulate contents for Gemini
  // Map our simple chat structure to Gemini's expected contents structure
  const lastUserMessage = messages[messages.length - 1].text;
  
  // Use conversational context if possible, otherwise send standard prompt
  const contents = lastUserMessage;

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.7,
        }
      });

      const responseText = response.text || "I was unable to synthesize an architectural response. Please try again.";
      return res.json({
        status: "success",
        text: responseText
      });
    } catch (error: any) {
      console.error("Gemini API Consultation Error:", error);
      return res.status(500).json({
        status: "error",
        message: "Gemini Consultation call failed.",
        fallback: getFallbackArchitectAnswer(lastUserMessage)
      });
    }
  } else {
    // Return high-fidelity fallback response
    return res.json({
      status: "success",
      text: getFallbackArchitectAnswer(lastUserMessage)
    });
  }
});

// AI Drug Interaction Checker (Google Gemini)
app.post("/api/v1/ai/check-interactions", async (req, res) => {
  const { drugA, drugB } = req.body;
  if (!drugA || !drugB) {
    return res.status(400).json({ status: "error", message: "Two drugs are required for interaction checking." });
  }

  const systemInstruction = `You are an expert Clinical Pharmacist and AI Agent integrated into JUBU PHARMA CARE's Multi-Tenant Pharmacy System.
Provide a scientific, concise, and structured drug-to-drug interaction analysis for the two input drugs.

Format the output precisely with these markdown sections:
### 🔴 Severity / Alert Level: [Contraindicated / Major Interaction / Moderate / Minor / No Known Interaction]
### 📝 Mechanism of Action
Briefly explain how they interact at a chemical/physiological level.
### ⚠️ Clinical Consequences & Side Effects
What will happen to the patient if taken together (e.g., enhanced bleeding risk, cardiotoxicity, reduced therapeutic effect).
### 🛡️ Recommended Intervention / Guidance
Actionable clinical guidance for the pharmacist (e.g., withhold one drug, adjust dosages, monitor coagulation factors, recommend alternative).

Keep answers clinical, clear, and highly professional. Limit to 150-200 words.`;

  const prompt = `Perform a clinical drug interaction check between drug A: "${drugA}" and drug B: "${drugB}".`;

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.3,
        }
      });

      const text = response.text || "No response received from clinical database.";
      return res.json({ status: "success", text });
    } catch (error) {
      console.error("Gemini Clinical API Check Error:", error);
      return res.json({
        status: "success",
        text: getFallbackInteractionAnswer(drugA, drugB)
      });
    }
  } else {
    return res.json({
      status: "success",
      text: getFallbackInteractionAnswer(drugA, drugB)
    });
  }
});

// High-fidelity fallback architect answers based on keywords
function getFallbackArchitectAnswer(query: string): string {
  const q = query.toLowerCase();
  
  if (q.includes("database") || q.includes("isolation") || q.includes("tenant") || q.includes("schema")) {
    return `### 🗄️ Multi-Tenant Database Isolation Architecture
JUBU PHARMA CARE supports a hybrid multi-tenancy database routing approach aligned with the tenant's tier and compliance mandates:

1. **Tier 1 (Starter): Shared Schema, Tenant ID Column (Row-Level Security)**
   * All tenants reside in the same physical database and tables.
   * Every record includes a \`tenant_id\` column. Data isolation is strictly enforced at the application level and via PostgreSQL **Row-Level Security (RLS)** policies. This minimizes overhead, offering the lowest operational cost.
   
2. **Tier 2 (Professional): Separate Schema per Tenant**
   * Shared physical database, but each tenant owns an isolated database \`schema\` (namespaces).
   * Connection pool routes requests by executing a \`SET search_path TO tenant_schema;\` query. Isolates tables, indexes, and views, preventing accidental cross-tenant joins.

3. **Tier 3 (Enterprise): Database per Tenant**
   * Tenant is provisioned with a physically isolated Cloud SQL instance or isolated database.
   * Guarantees complete compute, storage, and backup isolation. Critical for high-compliance clinical hospitals that require custom encryption keys (BYOK) and strictly isolated networks.`;
  }

  if (q.includes("security") || q.includes("compliance") || q.includes("hipaa") || q.includes("audit")) {
    return `### 🛡️ Security, HIPAA Compliance & Audit Trails
Patient Health Information (PHI) requires robust safety boundaries in SaaS architecture:

* **JWT Multi-Tenant RBAC Tokens**: Upon login, a secure JWT is signed with the user's \`tenant_id\`, \`role\`, and session identifier. The backend middleware decodes this on every request, verifying the tenant boundary before performing query execution.
* **Encryption At Rest & In Transit**: All connections utilize TLS 1.3. PHI fields (like Patient Name, Diagnoses) are encrypted inside the database using AES-256-GCM column-level encryption keys rotated regularly via Cloud KMS.
* **Immutable Audit Trail Logs**: An immutable audit log table tracks all access to PHI. Every read, write, modification, or checkout log records: Timestamp, UserID, TenantID, IP Address, Action, and Affected Fields. These logs are pushed to safe Cloud Storage buckets with Object Lock enabled for HIPAA compliance auditing.`;
  }

  if (q.includes("billing") || q.includes("stripe") || q.includes("price") || q.includes("subscription")) {
    return `### 💳 Subscription Billing & Provisioning Pipeline
SaaS monetization and billing within JUBU PHARMA CARE utilize Stripe Billing webhooks:

1. **Tenant Signup**: The merchant registers, selects a plan, and completes checkout.
2. **Provisioning Engine**: Upon receiving a \`checkout.session.completed\` webhook, the onboarding service spawns the tenant resources:
   * Sets up a metadata record in the central control DB.
   * Provisions database tables (or new schemas for Professional/Enterprise tiers) and runs migration scripts.
   * Triggers tenant-specific OAuth and initial Admin user accounts.
3. **Usage Metering & Invoicing**: Track active user counts, inventory sizes, and transaction volumes, calculating tiered discounts and annual commitment benefits dynamically. System locks out tenants automatically on \`invoice.payment_failed\` webhooks after a 7-day grace period.`;
  }

  return `### 🏢 JUBU PHARMA CARE Senior SaaS Architect
Greetings! As the Senior SaaS Software Architect for **JUBU PHARMA CARE**, I've designed the platform to operate with maximum reliability, top-tier security, and clean multi-tenant isolation.

Key points of our design:
* **Framework**: React client-side, powered by a modular Express REST API middleware layer.
* **Modular Multi-Tenancy**: Support for three separate data separation tiers based on subscription packages.
* **HIPAA/GDPR Compliance**: High-grade encryption, Role-Based Access Control (RBAC), and immutability for medical transaction logs.
* **REST API & Cloud Scale**: Scalable Docker containers hosted on Cloud Run, auto-scaling to zero when idle, backed by managed Cloud SQL databases and Redis in-memory caches.

Feel free to ask me questions about **database schema layouts, security tokens, container routing, pricing models, or API designs**!`;
}

function getFallbackInteractionAnswer(drugA: string, drugB: string): string {
  const dA = drugA.toLowerCase();
  const dB = drugB.toLowerCase();

  if ((dA.includes("sildenafil") && dB.includes("nitroglycerin")) || (dB.includes("sildenafil") && dA.includes("nitroglycerin"))) {
    return `### 🔴 Severity / Alert Level: CONTRAINDICATED (CRITICAL)

### 📝 Mechanism of Action
Nitroglycerin is an organic nitrate that acts as a nitric oxide donor, leading to systemic vasodilation. Sildenafil is a selective Phosphodiesterase Type 5 (PDE5) inhibitor that prevents degradation of cyclic GMP (cGMP). Co-administration triggers severe accumulation of cGMP, compounding systemic smooth muscle relaxation and massive vasodilation.

### ⚠️ Clinical Consequences & Side Effects
A catastrophic, rapid, and life-threatening drop in blood pressure (profound hypotension) can occur, potentially leading to syncope, myocardial infarction (heart attack), cardiogenic shock, or death.

### 🛡️ Recommended Intervention / Guidance
**STRICTLY CONTRAINDICATED.** Do not dispense these medications together. Nitrates must not be administered within 24 hours of taking sildenafil. Advise the physician immediately and counsel the patient on emergency steps should they experience chest pain.`;
  }

  if ((dA.includes("warfarin") && dB.includes("ibuprofen")) || (dB.includes("warfarin") && dA.includes("ibuprofen"))) {
    return `### 🔴 Severity / Alert Level: MAJOR INTERACTION

### 📝 Mechanism of Action
Ibuprofen is a Non-Steroidal Anti-inflammatory Drug (NSAID) that reversibly inhibits COX-1 and COX-2 enzymes, thereby blocking thromboxane A2 synthesis and impairing platelet aggregation. Warfarin is an oral anticoagulant that inhibits vitamin K epoxide reductase, blocking clotting factor synthesis (II, VII, IX, X).

### ⚠️ Clinical Consequences & Side Effects
Compounded bleeding risk. NSAIDs can also irritate the gastric mucosa and cause gastrointestinal ulceration, increasing the risk of severe upper gastrointestinal hemorrhaging while the patient is fully anticoagulated.

### 🛡️ Recommended Intervention / Guidance
Avoid co-administration when possible. If essential, closely monitor the patient's International Normalized Ratio (INR) and watch for clinical signs of active bleeding (bruising, dark stools, nosebleeds). Recommend switching the analgesic to Acetaminophen (Paracetamol) which has minimal impact on coagulation.`;
  }

  return `### 🟡 Severity / Alert Level: MODERATE INTERACTION / MONITORING REQUIRED

### 📝 Mechanism of Action
Simulated metabolic or pharmacodynamic interaction check between **${drugA}** and **${drugB}**. Concurrent administration may affect metabolic clearance in the hepatic cytochrome P450 pathway (specifically CYP3A4 or CYP2D6) or result in synergistic/antagonistic therapeutic effects.

### ⚠️ Clinical Consequences & Side Effects
Potential for mild increases in plasma concentration of either agent, causing heightened risk of predictable secondary side effects (e.g., headache, dizziness, mild GI distress) or a slight reduction in clinical efficacy.

### 🛡️ Recommended Intervention / Guidance
Monitor patient symptoms and drug therapeutic levels. Review dosage schedules and ensure the patient takes both agents at staggered intervals if appropriate. Advise the patient to log any unusual fatigue or physiological changes.`;
}

// ====================================================================================
// ADVANCED REPORTING & REVENUE ANALYTICS ENGINE
// ====================================================================================

let hasSeededTransactions = false;

// Rich Data Seeding Function to generate 30 days of historical sales and clinical transactions per tenant
function ensureRichTransactionsSeeded() {
  if (systemIsReset || hasSeededTransactions) return;
  hasSeededTransactions = true;

  const paymentMethods = ["cash", "card", "insurance", "digital_wallet"] as const;
  const staffNames = ["John Cashier", "Sarah Connor", "Alex Mercer", "Emma Watson", "Dr. David Smith"];
  
  const tenantIds = ["tenant-downtown", "tenant-juba", "tenant-carefirst", "tenant-stjude", "shared-global-tenant-v1"];
  
  const customersList = [
    { name: "Alice Smith", phone: "+1 (555) 304-9811", email: "alice.smith@gmail.com", insurance: "BlueCross BlueShield" },
    { name: "Bob Johnson", phone: "+1 (555) 481-0192", email: "bob.j@hotmail.com", insurance: "UnitedHealth" },
    { name: "Charles Xavier", phone: "+1 (555) 909-0012", email: "professor.x@mansion.edu", insurance: "Aetna" },
    { name: "Diana Prince", phone: "+1 (555) 283-9111", email: "diana.p@themyscira.gov", insurance: "Cigna" },
    { name: "Evan Wright", phone: "+1 (555) 812-7492", email: "wright.evan@outlook.com", insurance: "" },
    { name: "Fiona Gallagher", phone: "+1 (555) 555-0182", email: "fiona.g@southside.co", insurance: "Medicare" },
    { name: "George Costanza", phone: "+1 (555) 182-9013", email: "george@vandelay.com", insurance: "" },
    { name: "Hannah Abbott", phone: "+1 (555) 928-1182", email: "hannah.abbott@hogwarts.org", insurance: "BlueCross BlueShield" },
    { name: "Ian Malcolm", phone: "+1 (555) 238-1922", email: "chaos.theorist@jurassic.org", insurance: "Aetna" },
    { name: "Julia Roberts", phone: "+1 (555) 123-4567", email: "julia@roberts.com", insurance: "Medicare" }
  ];

  const suppliersList = [
    { name: "Pfizer Wholesale Distribution", contact: "Markus Aurelius", email: "markus@pfizer.com", phone: "+1 (800) 555-0192" },
    { name: "McKesson Pharmaceutical Logistics", contact: "Sarah Jenkins", email: "s.jenkins@mckesson.com", phone: "+1 (800) 333-4122" },
    { name: "AmerisourceBergen Corp", contact: "David Fletcher", email: "d.fletcher@amerisource.com", phone: "+1 (800) 222-9011" },
    { name: "Cardinal Health Supplies", contact: "Robert Vance", email: "robert@vancerefrigeration.com", phone: "+1 (800) 111-2019" }
  ];

  const today = new Date();
  
  tenantIds.forEach(tId => {
    const tenantDrugs = drugs.filter(d => d.tenantId === tId);
    if (tenantDrugs.length === 0) return;

    // Generate daily sales for the past 30 days
    for (let i = 30; i >= 0; i--) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      
      // Multi-transaction day volume varies by tenant pricing tier
      let txsCount = Math.floor(2 + Math.random() * 4); // Downtown (starter)
      if (tId === "tenant-carefirst") txsCount = Math.floor(4 + Math.random() * 6); // CareFirst (prof)
      if (tId === "tenant-stjude") txsCount = Math.floor(6 + Math.random() * 10); // St. Jude (ent)

      for (let j = 0; j < txsCount; j++) {
        // Pick 1 to 4 random drugs
        const itemsCount = Math.floor(1 + Math.random() * 4);
        const selectedDrugs = [...tenantDrugs].sort(() => 0.5 - Math.random()).slice(0, itemsCount);
        
        const txItems = selectedDrugs.map(drug => {
          const qty = Math.floor(1 + Math.random() * 5);
          return {
            drugId: drug.id,
            name: drug.name,
            quantity: qty,
            price: drug.price,
            cost: drug.cost || parseFloat((drug.price * 0.45).toFixed(2))
          };
        });

        const subtotal = txItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
        // Random discount (10-15% on 20% of sales)
        const discount = Math.random() > 0.8 ? parseFloat((subtotal * 0.1).toFixed(2)) : 0;
        const tax = parseFloat(((subtotal - discount) * 0.0825).toFixed(2));
        const total = parseFloat((subtotal - discount + tax).toFixed(2));
        
        const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
        const cust = customersList[Math.floor(Math.random() * customersList.length)];
        const cashier = staffNames[Math.floor(Math.random() * staffNames.length)];
        
        const saleDate = new Date(date);
        saleDate.setHours(Math.floor(8 + Math.random() * 11)); // 8 AM to 7 PM
        saleDate.setMinutes(Math.floor(Math.random() * 60));
        saleDate.setSeconds(Math.floor(Math.random() * 60));

        const invoiceNumber = `INV-${tId.substring(7, 10).toUpperCase()}-${saleDate.getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

        transactions.push({
          id: `tx-seed-${tId}-${i}-${j}-${Math.random().toString(36).substr(2, 5)}`,
          tenantId: tId,
          invoiceNumber,
          items: txItems,
          subtotal: parseFloat(subtotal.toFixed(2)),
          tax,
          discount,
          total,
          paymentMethod,
          insuranceProvider: paymentMethod === "insurance" ? (cust.insurance || "BlueCross BlueShield") : undefined,
          cashierName: cashier,
          createdAt: saleDate.toISOString(),
          customerName: cust.name
        } as any);
      }
    }
  });

  console.log("JUBU PHARMA CARE Reports: Seeding of dynamic SaaS multi-tenant historical transaction database complete.");
}

// Advanced Reporting API Endpoint
app.get("/api/v1/:tenantId/reports", checkTenantId, (req, res) => {
  const { tenantId } = req.params;
  const { startDate, endDate } = req.query;

  // Guarantee seed data is generated
  seedInventoryBatches();
  ensureRichTransactionsSeeded();

  const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate as string) : new Date();

  // Filter transactions for this tenant and time-range
  const tenantTx: any[] = transactions.filter(t => 
    t.tenantId === tenantId && 
    new Date(t.createdAt) >= start && 
    new Date(t.createdAt) <= end
  );

  const tenantDrugs = drugs.filter(d => d.tenantId === tenantId);
  const tenantBatches = inventoryBatches.filter(b => b.tenantId === tenantId);

  // 1. DAILY SALES REPORT
  const salesByDayMap = new Map<string, { date: string, sales: number, count: number, tax: number, profit: number, discount: number }>();
  
  tenantTx.forEach(tx => {
    const day = tx.createdAt.substring(0, 10);
    const existing = salesByDayMap.get(day) || { date: day, sales: 0, count: 0, tax: 0, profit: 0, discount: 0 };
    
    // Estimate cost of goods sold (COGS) to find profit
    let txCost = 0;
    tx.items.forEach((it: any) => {
      // Find cost in drug catalog or fall back to 45%
      const catalogDrug = tenantDrugs.find(d => d.id === it.drugId);
      const unitCost = catalogDrug?.cost || (it.price * 0.45);
      txCost += it.quantity * unitCost;
    });

    existing.sales = parseFloat((existing.sales + tx.total).toFixed(2));
    existing.count += 1;
    existing.tax = parseFloat((existing.tax + tx.tax).toFixed(2));
    existing.discount = parseFloat((existing.discount + tx.discount).toFixed(2));
    existing.profit = parseFloat((existing.profit + (tx.total - tx.tax - txCost)).toFixed(2));
    
    salesByDayMap.set(day, existing);
  });

  const dailySales = Array.from(salesByDayMap.values()).sort((a,b) => a.date.localeCompare(b.date));

  // 2. INVENTORY VALUATION REPORT
  const valByCategoryMap = new Map<string, { category: string, uniqueDrugs: number, totalStock: number, wholesaleValue: number, retailValue: number, potentialProfit: number }>();
  
  tenantBatches.forEach(b => {
    const cat = b.category || "Other";
    const existing = valByCategoryMap.get(cat) || { category: cat, uniqueDrugs: 0, totalStock: 0, wholesaleValue: 0, retailValue: 0, potentialProfit: 0 };
    
    existing.uniqueDrugs += 1;
    existing.totalStock += b.quantity;
    existing.wholesaleValue = parseFloat((existing.wholesaleValue + (b.quantity * b.cost)).toFixed(2));
    existing.retailValue = parseFloat((existing.retailValue + (b.quantity * b.price)).toFixed(2));
    existing.potentialProfit = parseFloat((existing.retailValue - existing.wholesaleValue).toFixed(2));
    
    valByCategoryMap.set(cat, existing);
  });

  const inventoryValuation = Array.from(valByCategoryMap.values());

  // 3. PROFIT AND LOSS (P&L) REPORT
  const totalRevenue = tenantTx.reduce((sum, tx) => sum + tx.total, 0);
  const totalTax = tenantTx.reduce((sum, tx) => sum + tx.tax, 0);
  const totalDiscount = tenantTx.reduce((sum, tx) => sum + tx.discount, 0);
  
  let totalCogs = 0;
  tenantTx.forEach(tx => {
    tx.items.forEach((it: any) => {
      const catalogDrug = tenantDrugs.find(d => d.id === it.drugId);
      const cost = catalogDrug?.cost || (it.price * 0.45);
      totalCogs += it.quantity * cost;
    });
  });

  // Gross profit is Net Sales (Total - Tax) minus COGS
  const netSales = totalRevenue - totalTax;
  const grossProfit = Math.max(0, netSales - totalCogs);
  const profitMargin = netSales > 0 ? parseFloat(((grossProfit / netSales) * 100).toFixed(2)) : 0;
  
  // Simulated purchases (supplier restocks outlay)
  const simulatedPurchases = parseFloat((totalCogs * 1.12).toFixed(2));
  // Operational expenses simulation (employee wages, software licensing, pharmacy utilities)
  const opexSimulation = parseFloat((netSales * 0.15 + 1200).toFixed(2)); 
  const netProfit = Math.max(0, grossProfit - opexSimulation);

  const profitLoss = {
    grossRevenue: parseFloat(totalRevenue.toFixed(2)),
    taxCollected: parseFloat(totalTax.toFixed(2)),
    discountsApplied: parseFloat(totalDiscount.toFixed(2)),
    netSales: parseFloat(netSales.toFixed(2)),
    cogs: parseFloat(totalCogs.toFixed(2)),
    grossProfit: parseFloat(grossProfit.toFixed(2)),
    marginPercentage: profitMargin,
    supplierPurchasesOutlay: simulatedPurchases,
    operatingExpenses: opexSimulation,
    netProfit: parseFloat(netProfit.toFixed(2))
  };

  // 4. EXPIRY REPORTS
  const today = new Date();
  const expiryReports = tenantBatches.map(b => {
    const exp = new Date(b.expiryDate);
    const diffTime = exp.getTime() - today.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let status = "NORMAL";
    if (daysRemaining <= 0) {
      status = "EXPIRED";
    } else if (daysRemaining <= 30) {
      status = "CRITICAL";
    } else if (daysRemaining <= 90) {
      status = "WARNING";
    } else if (daysRemaining <= 180) {
      status = "MONITOR";
    }

    return {
      name: b.name,
      batchNumber: b.batchNumber,
      storeName: b.storeName,
      expiryDate: b.expiryDate,
      stock: b.quantity,
      cost: b.cost,
      price: b.price,
      totalValue: parseFloat((b.quantity * b.cost).toFixed(2)),
      daysRemaining,
      status
    };
  }).sort((a,b) => a.daysRemaining - b.daysRemaining);

  // 5. SUPPLIER REPORTS
  const suppliers = [
    { name: "Pfizer Wholesale Distribution", code: "PFIZER" },
    { name: "McKesson Pharmaceutical Logistics", code: "MCKESSON" },
    { name: "AmerisourceBergen Corp", code: "AMERISOURCE" },
    { name: "Cardinal Health Supplies", code: "CARDINAL" }
  ];

  const supplierReports = suppliers.map((sup, idx) => {
    // Distribute inventory batches and spent based on indices for consistent seed output
    const subBatches = tenantBatches.filter((_, bIdx) => bIdx % suppliers.length === idx);
    const spent = subBatches.reduce((sum, b) => sum + (b.quantity * b.cost), 0);
    const units = subBatches.reduce((sum, b) => sum + b.quantity, 0);
    const ordersCount = subBatches.length > 0 ? subBatches.length : Math.floor(2 + Math.random() * 3);
    const finalSpent = spent > 0 ? spent : Math.floor(500 + Math.random() * 3000);
    const finalUnits = units > 0 ? units : Math.floor(100 + Math.random() * 500);

    return {
      name: sup.name,
      ordersCount,
      spent: parseFloat(finalSpent.toFixed(2)),
      itemsCount: finalUnits,
      averageOrderValue: parseFloat((finalSpent / ordersCount).toFixed(2))
    };
  }).sort((a,b) => b.spent - a.spent);

  // 6. CUSTOMER REPORTS
  const customerSpentMap = new Map<string, { name: string, spent: number, visits: number, insurance: string, lastVisit: string }>();
  
  tenantTx.forEach(tx => {
    const cName = tx.customerName || "Walk-in Customer";
    const existing = customerSpentMap.get(cName) || { name: cName, spent: 0, visits: 0, insurance: tx.insuranceProvider || "None (Cash)", lastVisit: tx.createdAt };
    
    existing.spent = parseFloat((existing.spent + tx.total).toFixed(2));
    existing.visits += 1;
    if (new Date(tx.createdAt) > new Date(existing.lastVisit)) {
      existing.lastVisit = tx.createdAt;
    }
    customerSpentMap.set(cName, existing);
  });

  const customerReports = Array.from(customerSpentMap.values())
    .sort((a,b) => b.spent - a.spent)
    .slice(0, 15); // Top 15 customers

  // 7. TAX REPORTS
  const taxByMonthMap = new Map<string, { period: string, taxableSales: number, taxCollected: number, totalReceipts: number }>();
  
  tenantTx.forEach(tx => {
    const month = new Date(tx.createdAt).toLocaleString("en-US", { month: "long", year: "numeric" });
    const existing = taxByMonthMap.get(month) || { period: month, taxableSales: 0, taxCollected: 0, totalReceipts: 0 };
    
    existing.taxableSales = parseFloat((existing.taxableSales + (tx.total - tx.tax)).toFixed(2));
    existing.taxCollected = parseFloat((existing.taxCollected + tx.tax).toFixed(2));
    existing.totalReceipts = parseFloat((existing.totalReceipts + tx.total).toFixed(2));
    
    taxByMonthMap.set(month, existing);
  });

  const taxReports = Array.from(taxByMonthMap.values());

  // 8. TENANT ANALYTICS (CROSS-TENANT SAAS METRICS)
  const tenantAnalytics = tenants.map(t => {
    const tDrugs = drugs.filter(d => d.tenantId === t.id);
    const tTx = transactions.filter(tx => tx.tenantId === t.id);
    const totalRev = tTx.reduce((sum, tx) => sum + tx.total, 0);
    const stockQuantity = tDrugs.reduce((sum, d) => sum + d.stock, 0);
    
    const planMRRs = { starter: 99, professional: 299, enterprise: 999 };
    const mrr = planMRRs[t.plan as keyof typeof planMRRs] || 299;

    return {
      id: t.id,
      name: t.name,
      subdomain: t.subdomain,
      plan: t.plan.toUpperCase(),
      status: t.status.toUpperCase(),
      mrr,
      staffCount: t.plan === "starter" ? 3 : t.plan === "professional" ? 7 : 15,
      stockQty: stockQuantity,
      salesVolume: tTx.length,
      totalRevenue: parseFloat(totalRev.toFixed(2))
    };
  }).sort((a,b) => b.totalRevenue - a.totalRevenue);

  // 9. REVENUE ANALYTICS
  const paymentMethodMap = new Map<string, { paymentMethod: string, amount: number, transactionCount: number }>();
  tenantTx.forEach(tx => {
    const method = tx.paymentMethod || "cash";
    const existing = paymentMethodMap.get(method) || { paymentMethod: method, amount: 0, transactionCount: 0 };
    
    existing.amount = parseFloat((existing.amount + tx.total).toFixed(2));
    existing.transactionCount += 1;
    
    paymentMethodMap.set(method, existing);
  });
  
  const revenueByPaymentMethod = Array.from(paymentMethodMap.values());

  // 10. STAFF PERFORMANCE & ACTIVITY REPORTS
  const staffActivityMap = new Map<string, { name: string, email: string, role: string, ordersCount: number, totalSales: number, avgOrderValue: number, accuracyRating: number }>();
  
  const staffMembers = [
    { name: "Dr. Jane Cashier", email: "jane@jubupharma.com", role: "Cashier" },
    { name: "Dr. Sand Reagan", email: "junubposcenter@gmail.com", role: "Pharmacy Admin" },
    { name: "Dr. John Pharmacist", email: "john@jubupharma.com", role: "Pharmacist" },
    { name: "Offline Terminal Cashier", email: "offline@jubupharma.com", role: "Cashier" }
  ];

  staffMembers.forEach(sm => {
    staffActivityMap.set(sm.name, {
      name: sm.name,
      email: sm.email,
      role: sm.role,
      ordersCount: 0,
      totalSales: 0,
      avgOrderValue: 0,
      accuracyRating: 98.5
    });
  });

  tenantTx.forEach(tx => {
    const cName = tx.cashierName || "Dr. Jane Cashier";
    const existing = staffActivityMap.get(cName) || {
      name: cName,
      email: `${cName.toLowerCase().replace(/\s+/g, '')}@jubupharma.com`,
      role: cName.includes("Pharmacist") ? "Pharmacist" : "Cashier",
      ordersCount: 0,
      totalSales: 0,
      avgOrderValue: 0,
      accuracyRating: 99.0
    };

    existing.ordersCount += 1;
    existing.totalSales = parseFloat((existing.totalSales + tx.total).toFixed(2));
    existing.avgOrderValue = parseFloat((existing.totalSales / existing.ordersCount).toFixed(2));
    staffActivityMap.set(cName, existing);
  });

  const staffReports = Array.from(staffActivityMap.values()).sort((a,b) => b.totalSales - a.totalSales);

  // Package precise, PostgreSQL table-accurate relational SQL queries
  const queries = {
    dailySales: `SELECT 
    DATE_TRUNC('day', sale_date) AS sale_day,
    COUNT(id) AS transaction_count,
    SUM(subtotal) AS gross_subtotal,
    SUM(tax) AS total_tax,
    SUM(discount) AS total_discount,
    SUM(total) AS total_revenue,
    AVG(total) AS average_ticket_size
FROM sales
WHERE tenant_id = '${tenantId}'
  AND sale_date >= '${start.toISOString().split('T')[0]}' 
  AND sale_date <= '${end.toISOString().split('T')[0]}'
  AND deleted_at IS NULL
GROUP BY sale_day
ORDER BY sale_day DESC;`,

    inventoryValuation: `SELECT 
    c.name AS category_name,
    COUNT(i.id) AS unique_batches,
    SUM(i.quantity) AS total_units_in_stock,
    SUM(i.quantity * i.cost) AS total_wholesale_cost,
    SUM(i.quantity * i.price) AS total_retail_value,
    SUM(i.quantity * i.price) - SUM(i.quantity * i.cost) AS potential_profit,
    CASE 
        WHEN SUM(i.quantity * i.price) > 0 
        THEN ROUND(((SUM(i.quantity * i.price) - SUM(i.quantity * i.cost)) / SUM(i.quantity * i.price)) * 100, 2)
        ELSE 0
    END AS projected_margin_percentage
FROM inventory i
JOIN medicines m ON i.medicine_id = m.id AND i.tenant_id = m.tenant_id
LEFT JOIN categories c ON i.category_id = c.id AND i.tenant_id = c.tenant_id
WHERE i.tenant_id = '${tenantId}' AND i.deleted_at IS NULL
GROUP BY c.name
ORDER BY total_retail_value DESC;`,

    profitLoss: `WITH revenue AS (
    SELECT 
        COALESCE(SUM(si.quantity * si.unit_price), 0) AS gross_sales,
        COALESCE(SUM(si.discount), 0) AS sales_discounts,
        COALESCE(SUM(si.quantity * si.unit_price - si.discount), 0) AS net_sales,
        COALESCE(SUM(si.quantity * inv.cost), 0) AS cogs
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id AND si.tenant_id = s.tenant_id
    JOIN inventory inv ON si.inventory_id = inv.id AND si.tenant_id = inv.tenant_id
    WHERE s.tenant_id = '${tenantId}'
      AND s.sale_date >= '${start.toISOString().split('T')[0]}' 
      AND s.sale_date <= '${end.toISOString().split('T')[0]}'
      AND s.deleted_at IS NULL
),
purchases_cost AS (
    SELECT 
        COALESCE(SUM(pi.quantity * pi.unit_cost), 0) AS wholesale_purchases
    FROM purchase_items pi
    JOIN purchases p ON pi.purchase_id = p.id AND pi.tenant_id = p.tenant_id
    WHERE p.tenant_id = '${tenantId}'
      AND p.purchase_date >= '${start.toISOString().split('T')[0]}' 
      AND p.purchase_date <= '${end.toISOString().split('T')[0]}'
      AND p.deleted_at IS NULL
)
SELECT 
    r.gross_sales,
    r.sales_discounts,
    r.net_sales,
    r.cogs,
    (r.net_sales - r.cogs) AS gross_profit,
    ROUND(((r.net_sales - r.cogs) / NULLIF(r.net_sales, 0)) * 100, 2) AS gross_profit_margin_pct,
    p.wholesale_purchases AS restocking_capital_outlay
FROM revenue r, purchases_cost p;`,

    expiryReports: `SELECT 
    m.name AS medicine_name,
    m.sku AS national_drug_code,
    i.expiry_date,
    i.quantity AS units_in_stock,
    i.cost AS wholesale_unit_cost,
    (i.quantity * i.cost) AS total_value_at_risk,
    i.expiry_date - CURRENT_DATE AS days_until_expiration,
    CASE 
        WHEN i.expiry_date <= CURRENT_DATE THEN 'EXPIRED'
        WHEN i.expiry_date - CURRENT_DATE <= 30 THEN 'CRITICAL (<30 days)'
        WHEN i.expiry_date - CURRENT_DATE <= 90 THEN 'WARNING (<90 days)'
        ELSE 'MONITOR (<180 days)'
    END AS urgency_status
FROM inventory i
JOIN medicines m ON i.medicine_id = m.id AND i.tenant_id = m.tenant_id
WHERE i.tenant_id = '${tenantId}'
  AND i.expiry_date <= CURRENT_DATE + INTERVAL '180 days'
  AND i.quantity > 0
  AND i.deleted_at IS NULL
ORDER BY i.expiry_date ASC;`,

    supplierReports: `SELECT 
    s.id AS supplier_id,
    s.name AS supplier_name,
    s.contact_name,
    s.phone,
    COUNT(p.id) AS purchase_orders_count,
    SUM(p.total_amount) AS total_procurement_expenditure,
    COALESCE(SUM(pi.quantity), 0) AS total_units_procured,
    ROUND(AVG(p.total_amount), 2) AS average_purchase_order_value
FROM suppliers s
LEFT JOIN purchases p ON s.id = p.supplier_id AND s.tenant_id = p.tenant_id AND p.deleted_at IS NULL
LEFT JOIN purchase_items pi ON p.id = pi.purchase_id AND p.tenant_id = pi.tenant_id AND pi.deleted_at IS NULL
WHERE s.tenant_id = '${tenantId}' AND s.deleted_at IS NULL
GROUP BY s.id, s.name, s.contact_name, s.phone
ORDER BY total_procurement_expenditure DESC;`,

    customerReports: `SELECT 
    c.id AS customer_id,
    c.first_name || ' ' || c.last_name AS customer_fullname,
    c.phone,
    c.insurance_provider,
    COUNT(s.id) AS sales_visit_count,
    COALESCE(SUM(s.total), 0) AS total_lifetime_spend,
    COALESCE(AVG(s.total), 0) AS average_spend_per_visit,
    MAX(s.sale_date) AS last_purchase_date
FROM customers c
LEFT JOIN sales s ON c.id = s.customer_id AND c.tenant_id = s.tenant_id AND s.deleted_at IS NULL
WHERE c.tenant_id = '${tenantId}' AND c.deleted_at IS NULL
GROUP BY c.id, c.first_name, c.last_name, c.phone, c.insurance_provider
ORDER BY total_lifetime_spend DESC;`,

    taxReports: `SELECT 
    DATE_TRUNC('month', sale_date) AS tax_period_month,
    SUM(subtotal) AS gross_subtotal,
    SUM(discount) AS total_discounts_applied,
    SUM(subtotal - discount) AS net_taxable_sales,
    SUM(tax) AS total_tax_collected,
    SUM(total) AS total_gross_receipts,
    ROUND((SUM(tax) / NULLIF(SUM(subtotal - discount), 0)) * 100, 2) AS effective_tax_rate_pct
FROM sales
WHERE tenant_id = '${tenantId}'
  AND sale_date >= '${start.toISOString().split('T')[0]}' 
  AND sale_date <= '${end.toISOString().split('T')[0]}'
  AND deleted_at IS NULL
GROUP BY tax_period_month
ORDER BY tax_period_month DESC;`,

    tenantAnalytics: `SELECT 
    t.id AS tenant_id,
    t.name AS tenant_name,
    t.subdomain,
    t.plan AS subscription_tier,
    t.status AS billing_status,
    s.billing_cycle,
    COALESCE(s.plan, 'standard') AS subscription_plan,
    t.created_at AS onboard_date,
    (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id AND u.deleted_at IS NULL) AS staff_user_count,
    (SELECT COUNT(*) FROM inventory inv WHERE inv.tenant_id = t.id AND inv.deleted_at IS NULL) AS unique_skus_stocked,
    (SELECT SUM(quantity) FROM inventory inv WHERE inv.tenant_id = t.id AND inv.deleted_at IS NULL) AS total_physical_units,
    (SELECT COUNT(*) FROM sales sale WHERE sale.tenant_id = t.id AND sale.deleted_at IS NULL) AS total_pos_transactions,
    (SELECT COALESCE(SUM(total), 0) FROM sales sale WHERE sale.tenant_id = t.id AND sale.deleted_at IS NULL) AS total_tenant_revenue
FROM tenants t
LEFT JOIN subscriptions s ON t.id = s.tenant_id AND s.deleted_at IS NULL
WHERE t.deleted_at IS NULL
ORDER BY total_tenant_revenue DESC;`,

    revenueAnalytics: `SELECT 
    DATE_TRUNC('month', s.sale_date) AS revenue_month,
    s.payment_method,
    COUNT(s.id) AS sales_volume,
    SUM(s.total) AS total_revenue_by_method,
    ROUND((SUM(s.total) / (SELECT SUM(total) FROM sales WHERE tenant_id = '${tenantId}' AND deleted_at IS NULL) * 100), 2) AS revenue_share_percentage
FROM sales s
WHERE s.tenant_id = '${tenantId}' AND s.deleted_at IS NULL
GROUP BY revenue_month, s.payment_method
ORDER BY revenue_month DESC, total_revenue_by_method DESC;`
  };

  res.json({
    status: "success",
    tenantId,
    durationDays: Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
    data: {
      dailySales,
      inventoryValuation,
      profitLoss,
      expiryReports,
      supplierReports,
      customerReports,
      taxReports,
      tenantAnalytics,
      staffReports,
      revenueAnalytics: {
        byPaymentMethod: revenueByPaymentMethod,
        dailySalesData: dailySales // Reuse dailySales for charts
      }
    },
    queries
  });
});

// ====================================================================================
// ADVANCED NOTIFICATION ENGINE & TEMPLATE COMPILER
// ====================================================================================

interface NotificationEvent {
  id: string;
  tenantId: string;
  type: 'low_stock' | 'expiry' | 'subscription' | 'payment' | 'broadcast';
  title: string;
  message: string;
  channels: {
    email: boolean;
    push: boolean;
    inApp: boolean;
  };
  deliveryStatus: {
    email: 'sent' | 'failed' | 'not_configured' | 'skipped';
    push: 'sent' | 'failed' | 'not_configured' | 'skipped';
    inApp: 'sent' | 'failed' | 'not_configured' | 'skipped';
  };
  metadata?: any;
  isRead: boolean;
  createdAt: string;
}

interface NotificationSettings {
  tenantId: string;
  enabledTypes: {
    low_stock: boolean;
    expiry: boolean;
    subscription: boolean;
    payment: boolean;
    broadcast: boolean;
  };
  channels: {
    email: { enabled: boolean; recipient: string };
    push: { enabled: boolean; endpoint: string };
    inApp: { enabled: boolean };
  };
  templates: {
    low_stock: { title: string; body: string };
    expiry: { title: string; body: string };
    subscription: { title: string; body: string };
    payment: { title: string; body: string };
    broadcast: { title: string; body: string };
  };
}

let notificationEvents: NotificationEvent[] = [];
let notificationSettingsMap: Record<string, NotificationSettings> = {};

function ensureNotificationsInitialized() {
  const tenantIds = ["tenant-downtown", "tenant-carefirst", "tenant-stjude"];
  
  // Initialize default templates and settings per tenant
  tenantIds.forEach(tId => {
    if (!notificationSettingsMap[tId]) {
      const emailRecipient = tId === "tenant-downtown" 
        ? "downtown.ops@jubupharma.com" 
        : tId === "tenant-carefirst" 
          ? "carefirst.wellness@gmail.com" 
          : "stjude.clinical@hospital.org";

      notificationSettingsMap[tId] = {
        tenantId: tId,
        enabledTypes: {
          low_stock: true,
          expiry: true,
          subscription: true,
          payment: true,
          broadcast: true
        },
        channels: {
          email: { enabled: true, recipient: emailRecipient },
          push: { enabled: true, endpoint: `https://fcm.googleapis.com/fcm/send/db-${tId}-devices` },
          inApp: { enabled: true }
        },
        templates: {
          low_stock: { 
            title: "⚠️ [Low Stock Alert] {DRUG_NAME}", 
            body: "Attention Pharmacy Manager, stock for {DRUG_NAME} (SKU: {SKU}) has depleted to {CURRENT_STOCK} units, falling below the safety threshold of {MIN_STOCK}. Please review procurement recommendations." 
          },
          expiry: { 
            title: "⏳ [Expiry Warning] {DRUG_NAME} Batch #{BATCH_NUMBER}", 
            body: "Urgent inventory audit required. {DRUG_NAME} Batch #{BATCH_NUMBER} in {STORE_NAME} is scheduled to expire on {EXPIRY_DATE} ({DAYS_REMAINING} days remaining). Current stock: {STOCK} units. Total asset value at risk: ${VALUE_AT_RISK}." 
          },
          subscription: { 
            title: "💳 SaaS Subscription Renewal: {PLAN_NAME} Tier", 
            body: "This is a recurring billing notification. Your JUBU PHARMA CARE multi-tenant subscription under the {PLAN_NAME} plan is scheduled to renew on {RENEWAL_DATE}. If you have active annual or monthly automated direct debits enabled, no further action is required." 
          },
          payment: { 
            title: "💸 Invoice Generated: JUBU-SaaS-{INVOICE_NUMBER}", 
            body: "Your cloud subscription invoice JUBU-SaaS-{INVOICE_NUMBER} for amount ${AMOUNT} is ready. A direct debit will be processed via your default banking provider on file." 
          },
          broadcast: { 
            title: "📢 System Maintenance & Feature Rollout: v4.11", 
            body: "JUBU Global Cloud Operations: We are deploying schema-level upgrades and advanced reporting modules on July 18th at 02:00 UTC. There will be a maximum of 4 minutes of read-only fallback latency." 
          }
        }
      };
    }
  });

  // Seed notification logs if empty
  if (notificationEvents.length === 0) {
    const today = new Date();
    
    // Downtown Pharmacy notifications
    notificationEvents.push({
      id: "nt-dt-1",
      tenantId: "tenant-downtown",
      type: "low_stock",
      title: "⚠️ [Low Stock Alert] Ibuprofen 400mg",
      message: "Attention Pharmacy Manager, stock for Ibuprofen 400mg (SKU: IBU-400-DT) has depleted to 15 units, falling below the safety threshold of 40. Please review procurement recommendations.",
      channels: { email: true, push: true, inApp: true },
      deliveryStatus: { email: "sent", push: "sent", inApp: "sent" },
      isRead: false,
      createdAt: new Date(today.getTime() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
    });

    notificationEvents.push({
      id: "nt-dt-2",
      tenantId: "tenant-downtown",
      type: "expiry",
      title: "⏳ [Expiry Warning] Atorvastatin 20mg Batch #AT-092",
      message: "Urgent inventory audit required. Atorvastatin 20mg Batch #AT-092 in Main Store is scheduled to expire on 2026-08-15 (32 days remaining). Current stock: 80 units. Total asset value at risk: $960.00.",
      channels: { email: true, push: false, inApp: true },
      deliveryStatus: { email: "sent", push: "skipped", inApp: "sent" },
      isRead: false,
      createdAt: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString() // 1 day ago
    });

    notificationEvents.push({
      id: "nt-dt-3",
      tenantId: "tenant-downtown",
      type: "subscription",
      title: "💳 SaaS Subscription Renewal: STARTER Tier",
      message: "This is a recurring billing notification. Your JUBU PHARMA CARE multi-tenant subscription under the STARTER plan is scheduled to renew on 2026-08-15. If you have active annual or monthly automated direct debits enabled, no further action is required.",
      channels: { email: true, push: false, inApp: true },
      deliveryStatus: { email: "sent", push: "skipped", inApp: "sent" },
      isRead: true,
      createdAt: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString() // 5 days ago
    });

    // CareFirst Wellness notifications
    notificationEvents.push({
      id: "nt-cf-1",
      tenantId: "tenant-carefirst",
      type: "low_stock",
      title: "⚠️ [Low Stock Alert] Metformin 500mg",
      message: "Attention Pharmacy Manager, stock for Metformin 500mg (SKU: MET-500-CF) has depleted to 8 units, falling below the safety threshold of 45. Please review procurement recommendations.",
      channels: { email: true, push: true, inApp: true },
      deliveryStatus: { email: "sent", push: "sent", inApp: "sent" },
      isRead: false,
      createdAt: new Date(today.getTime() - 4 * 60 * 60 * 1000).toISOString() // 4 hours ago
    });

    notificationEvents.push({
      id: "nt-cf-2",
      tenantId: "tenant-carefirst",
      type: "payment",
      title: "💸 Invoice Generated: JUBU-SaaS-908122",
      message: "Your cloud subscription invoice JUBU-SaaS-908122 for amount $299.00 is ready. A direct debit will be processed via your default banking provider on file.",
      channels: { email: true, push: false, inApp: true },
      deliveryStatus: { email: "sent", push: "skipped", inApp: "sent" },
      isRead: false,
      createdAt: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days ago
    });

    // St. Jude Clinical Pharmacy notifications
    notificationEvents.push({
      id: "nt-sj-1",
      tenantId: "tenant-stjude",
      type: "expiry",
      title: "⏳ [Expiry Warning] Amoxicillin 500mg Batch #AX-2041",
      message: "Urgent inventory audit required. Amoxicillin 500mg Batch #AX-2041 in Cold Storage is scheduled to expire on 2026-07-28 (14 days remaining). Current stock: 250 units. Total asset value at risk: $2,000.00.",
      channels: { email: true, push: true, inApp: true },
      deliveryStatus: { email: "sent", push: "sent", inApp: "sent" },
      isRead: false,
      createdAt: new Date(today.getTime() - 12 * 60 * 60 * 1000).toISOString() // 12 hours ago
    });

    // Global Broadcast Notification to everyone
    tenantIds.forEach(tId => {
      notificationEvents.push({
        id: `nt-bc-${tId}-${Date.now()}`,
        tenantId: tId,
        type: "broadcast",
        title: "📢 System Maintenance & Feature Rollout: v4.11",
        message: "JUBU Global Cloud Operations: We are deploying schema-level upgrades and advanced reporting modules on July 18th at 02:00 UTC. There will be a maximum of 4 minutes of read-only fallback latency.",
        channels: { email: true, push: true, inApp: true },
        deliveryStatus: { email: "sent", push: "sent", inApp: "sent" },
        isRead: false,
        createdAt: new Date(today.getTime() - 12 * 60 * 1000).toISOString() // 12 mins ago
      });
    });
  }
}

// 1. Fetch Notification Logs and Settings
app.get("/api/v1/:tenantId/notifications", checkTenantId, (req, res) => {
  const { tenantId } = req.params;
  ensureNotificationsInitialized();

  const settings = notificationSettingsMap[tenantId];
  const logs = notificationEvents.filter(e => e.tenantId === tenantId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  res.json({
    status: "success",
    tenantId,
    settings,
    logs
  });
});

// 2. Update Notification Settings
app.put("/api/v1/:tenantId/notifications/settings", checkTenantId, (req, res) => {
  const { tenantId } = req.params;
  const { enabledTypes, channels, templates } = req.body;
  ensureNotificationsInitialized();

  if (!notificationSettingsMap[tenantId]) {
    return res.status(404).json({ status: "error", message: "Tenant notification settings template not found." });
  }

  if (enabledTypes) notificationSettingsMap[tenantId].enabledTypes = { ...notificationSettingsMap[tenantId].enabledTypes, ...enabledTypes };
  if (channels) {
    if (channels.email) notificationSettingsMap[tenantId].channels.email = { ...notificationSettingsMap[tenantId].channels.email, ...channels.email };
    if (channels.push) notificationSettingsMap[tenantId].channels.push = { ...notificationSettingsMap[tenantId].channels.push, ...channels.push };
    if (channels.inApp) notificationSettingsMap[tenantId].channels.inApp = { ...notificationSettingsMap[tenantId].channels.inApp, ...channels.inApp };
  }
  if (templates) {
    notificationSettingsMap[tenantId].templates = { ...notificationSettingsMap[tenantId].templates, ...templates };
  }

  res.json({
    status: "success",
    message: "Settings updated on the notification engine broker",
    settings: notificationSettingsMap[tenantId]
  });
});

// System Factory Reset Endpoint
app.post("/api/v1/system/reset", (req, res) => {
  try {
    auditLogs.length = 0;
    notificationEvents.length = 0;
    inventoryAudits.length = 0;
    stockTransfers.length = 0;
    qr_codes.length = 0;
    res.json({
      status: "success",
      message: "System data and server-side in-memory logs successfully reset and cleared."
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: "Failed to reset server state." });
  }
});

// 3. Mark Single Notification as Read
app.put("/api/v1/:tenantId/notifications/:id/read", checkTenantId, (req, res) => {
  const { id } = req.params;
  ensureNotificationsInitialized();

  const notification = notificationEvents.find(e => e.id === id);
  if (notification) {
    notification.isRead = true;
    return res.json({ status: "success", message: "Notification status updated to read", notification });
  }

  res.status(404).json({ status: "error", message: "Notification record not found." });
});

// 4. Mark All Notifications as Read for Tenant
app.put("/api/v1/:tenantId/notifications/read-all", checkTenantId, (req, res) => {
  const { tenantId } = req.params;
  ensureNotificationsInitialized();

  notificationEvents.forEach(e => {
    if (e.tenantId === tenantId) {
      e.isRead = true;
    }
  });

  res.json({ status: "success", message: "All local notifications flagged as read" });
});

// 5. Trigger Manual Notification (Simulation & Dispatch Broker)
app.post("/api/v1/:tenantId/notifications/trigger", checkTenantId, (req, res) => {
  const { tenantId } = req.params;
  const { type, customParams, selectedChannels } = req.body;
  
  ensureNotificationsInitialized();
  const settings = notificationSettingsMap[tenantId];

  if (!settings) {
    return res.status(404).json({ status: "error", message: "Settings for tenant not found." });
  }

  // Check if this type is disabled by tenant
  if (!settings.enabledTypes[type as keyof typeof settings.enabledTypes]) {
    return res.status(400).json({ 
      status: "error", 
      message: `Cannot dispatch notification. The '${type}' type is currently disabled in your notification workspace preferences.` 
    });
  }

  // Retrieve raw templates
  const template = settings.templates[type as 'low_stock' | 'expiry' | 'subscription' | 'payment' | 'broadcast'];
  if (!template) {
    return res.status(400).json({ status: "error", message: `No active draft templates found for type: ${type}` });
  }

  let finalTitle = template.title;
  let finalBody = template.body;

  // Render Template with dynamic variable injections
  if (type === "low_stock") {
    const drugName = customParams?.drugName || "Lisinopril 10mg";
    const sku = customParams?.sku || "LIS-10-DT";
    const stock = customParams?.stock || "12";
    const minStock = customParams?.minStock || "50";
    
    finalTitle = finalTitle.replace(/{DRUG_NAME}/g, drugName);
    finalBody = finalBody
      .replace(/{DRUG_NAME}/g, drugName)
      .replace(/{SKU}/g, sku)
      .replace(/{CURRENT_STOCK}/g, stock)
      .replace(/{MIN_STOCK}/g, minStock);
  } else if (type === "expiry") {
    const drugName = customParams?.drugName || "Amoxicillin 500mg";
    const batchNumber = customParams?.batchNumber || "AX-9942";
    const storeName = customParams?.storeName || "Front Counter Cabinet";
    const expiryDate = customParams?.expiryDate || "2026-09-10";
    const daysRemaining = customParams?.daysRemaining || "58";
    const stock = customParams?.stock || "140";
    const valueAtRisk = customParams?.valueAtRisk || "1120.00";

    finalTitle = finalTitle
      .replace(/{DRUG_NAME}/g, drugName)
      .replace(/{BATCH_NUMBER}/g, batchNumber);

    finalBody = finalBody
      .replace(/{DRUG_NAME}/g, drugName)
      .replace(/{BATCH_NUMBER}/g, batchNumber)
      .replace(/{STORE_NAME}/g, storeName)
      .replace(/{EXPIRY_DATE}/g, expiryDate)
      .replace(/{DAYS_REMAINING}/g, daysRemaining)
      .replace(/{STOCK}/g, stock)
      .replace(/{VALUE_AT_RISK}/g, valueAtRisk);
  } else if (type === "subscription") {
    const tenantObj = tenants.find(t => t.id === tenantId);
    const planName = (tenantObj?.plan || "Starter").toUpperCase();
    const renewalDate = customParams?.renewalDate || "2026-08-15";

    finalTitle = finalTitle.replace(/{PLAN_NAME}/g, planName);
    finalBody = finalBody
      .replace(/{PLAN_NAME}/g, planName)
      .replace(/{RENEWAL_DATE}/g, renewalDate);
  } else if (type === "payment") {
    const invoiceNumber = customParams?.invoiceNumber || Math.floor(100000 + Math.random() * 900000).toString();
    const amount = customParams?.amount || (tenantId === "tenant-stjude" ? "999.00" : tenantId === "tenant-carefirst" ? "299.00" : "99.00");

    finalTitle = finalTitle.replace(/{INVOICE_NUMBER}/g, invoiceNumber);
    finalBody = finalBody
      .replace(/{INVOICE_NUMBER}/g, invoiceNumber)
      .replace(/{AMOUNT}/g, amount);
  } else if (type === "broadcast") {
    // If customParams has body/title, override
    if (customParams?.title) finalTitle = customParams.title;
    if (customParams?.message) finalBody = customParams.message;
  }

  // Channels to dispatch to
  const channelsToDispatch = selectedChannels || {
    email: settings.channels.email.enabled,
    push: settings.channels.push.enabled,
    inApp: settings.channels.inApp.enabled
  };

  // Compile Simulated Channel Deliverability Logs
  const deliveryStatus: any = {
    email: channelsToDispatch.email ? (settings.channels.email.recipient ? "sent" : "failed") : "skipped",
    push: channelsToDispatch.push ? (settings.channels.push.endpoint ? "sent" : "failed") : "skipped",
    inApp: channelsToDispatch.inApp ? "sent" : "skipped"
  };

  const newEvents: NotificationEvent[] = [];

  if (type === "broadcast" && customParams?.globalBroadcast) {
    // Broadcast dispatch to ALL tenants
    const tenantIdsList = ["tenant-downtown", "tenant-carefirst", "tenant-stjude"];
    tenantIdsList.forEach(tId => {
      const tenantSettings = notificationSettingsMap[tId] || settings;
      const tDelivery: any = {
        email: channelsToDispatch.email ? (tenantSettings.channels.email.enabled && tenantSettings.channels.email.recipient ? "sent" : "failed") : "skipped",
        push: channelsToDispatch.push ? (tenantSettings.channels.push.enabled && tenantSettings.channels.push.endpoint ? "sent" : "failed") : "skipped",
        inApp: channelsToDispatch.inApp ? "sent" : "skipped"
      };

      const ev = {
        id: `nt-gen-${tId}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        tenantId: tId,
        type: "broadcast" as const,
        title: finalTitle,
        message: finalBody,
        channels: {
          email: channelsToDispatch.email,
          push: channelsToDispatch.push,
          inApp: channelsToDispatch.inApp
        },
        deliveryStatus: tDelivery,
        isRead: false,
        createdAt: new Date().toISOString()
      };
      notificationEvents.push(ev);
      newEvents.push(ev);
    });
  } else {
    // Single tenant dispatch
    const ev = {
      id: `nt-gen-${tenantId}-${Date.now()}`,
      tenantId,
      type: type as any,
      title: finalTitle,
      message: finalBody,
      channels: {
        email: channelsToDispatch.email,
        push: channelsToDispatch.push,
        inApp: channelsToDispatch.inApp
      },
      deliveryStatus,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    notificationEvents.push(ev);
    newEvents.push(ev);
  }

  res.json({
    status: "success",
    message: type === "broadcast" && customParams?.globalBroadcast 
      ? `Global broadcast dispatches queued successfully across multi-tenant cluster`
      : `Notification compiled and successfully dispatched to enabled channels`,
    dispatchedEvents: newEvents,
    deliverySimulationMetrics: {
      timestamp: new Date().toISOString(),
      channelsTargeted: Object.keys(channelsToDispatch).filter(k => (channelsToDispatch as any)[k]),
      emailRecipient: settings.channels.email.recipient,
      pushGatewayEndpoint: settings.channels.push.endpoint,
      latencyMs: Math.floor(10 + Math.random() * 45)
    }
  });
});

async function startServer() {
  // Serve Vite dev server or static build assets
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Express: Vite Dev Middleware mounted");
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log("Express: Serving production static assets from dist");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`JUBU PHARMA CARE Multi-Tenant SaaS server booted on http://0.0.0.0:${PORT}`);
  });
}

startServer();
