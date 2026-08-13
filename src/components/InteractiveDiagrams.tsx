import { useState } from 'react';
import { Database, Shield, Server, ArrowRight, Layers, Cpu, Cloud, HelpCircle, HardDrive, Key } from 'lucide-react';

interface InteractiveDiagramsProps {
  selectedIsolation: string;
  setSelectedIsolation: (isolation: string) => void;
}

export default function InteractiveDiagrams({ selectedIsolation, setSelectedIsolation }: InteractiveDiagramsProps) {
  const [activeTab, setActiveTab] = useState<'db' | 'infra'>('db');
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const dbIsolations = [
    {
      id: 'shared_schema_tenant_id',
      name: 'Shared DB, Shared Schema',
      desc: 'All tenant records are stored in the same physical tables, separated by a `tenant_id` column. Isolation is enforced through SQL filters and RLS.',
      pros: ['Zero operational overhead', 'Extremely cheap resource sharing', 'Simple global upgrades'],
      cons: ['No physical data separation', 'High risk of "noisy neighbor" issue', 'Potential SQL injection risk exposing other tenant data'],
      sqlQuery: `SELECT * FROM drug_inventory \nWHERE tenant_id = 'tenant-downtown' \nAND category = 'Antibiotics';`,
      postgresqlCode: `-- Row-Level Security Configuration\nALTER TABLE drug_inventory ENABLE ROW LEVEL SECURITY;\n\nCREATE POLICY tenant_isolation_policy ON drug_inventory\n  USING (tenant_id = current_setting('app.current_tenant_id'));`
    },
    {
      id: 'schema_per_tenant',
      name: 'Shared DB, Separate Schema',
      desc: 'Each tenant has a dedicated PostgreSQL namespace (schema) inside the same database. Isolates tables, views, and index constraints.',
      pros: ['Clear logical tablespace isolation', 'Supports customized tenant schemas', 'Simplified backup per schema'],
      cons: ['Connection pooling requires dynamic routing', 'Slightly higher cost to execute migrations', 'Database catalog limits on count of schemas'],
      sqlQuery: `SET search_path TO tenant_carefirst;\nSELECT * FROM drug_inventory \nWHERE category = 'Antibiotics';`,
      postgresqlCode: `-- Schema-per-tenant Route Resolution\nCREATE SCHEMA tenant_carefirst;\n\n-- Create tables under isolated schema\nCREATE TABLE tenant_carefirst.drug_inventory (\n  id SERIAL PRIMARY KEY,\n  name VARCHAR(100),\n  stock INT\n);`
    },
    {
      id: 'database_per_tenant',
      name: 'Separate Database per Tenant',
      desc: 'Each tenant is provisioned with a physically isolated database container or SQL database. Maximizes compute and storage performance.',
      pros: ['Absolute isolation & HIPAA security', 'Dedicated CPU, memory, and disk space', 'Independently custom encryption keys'],
      cons: ['Very expensive infrastructure cost', 'Complex global schema upgrades', 'Tedious cross-tenant reporting'],
      sqlQuery: `-- Router connects to direct database connection string:\n-- postgresql://db-stjude-primary:5432/stjude_pharma\nSELECT * FROM drug_inventory \nWHERE category = 'Antibiotics';`,
      postgresqlCode: `-- Database-per-tenant Provisioning Script\nCREATE DATABASE stjude_pharma_db WITH OWNER admin_stjude;\n\n-- Direct independent restore operations\n\\connect stjude_pharma_db\nCREATE TABLE drug_inventory ( ... );`
    }
  ];

  const currentDb = dbIsolations.find(d => d.id === selectedIsolation) || dbIsolations[0];

  return (
    <div className="bg-slate-900 text-slate-100 rounded-2xl shadow-xl border border-slate-800 overflow-hidden" id="architecture-diagrams">
      {/* Tab bar */}
      <div className="flex border-b border-slate-800 bg-slate-950 px-6 py-4 justify-between items-center flex-wrap gap-4">
        <div>
          <h3 className="font-semibold text-lg text-emerald-400">System Blueprint Visualizer</h3>
          <p className="text-slate-400 text-xs">Explore how JUBU PHARMA CARE secures data isolation and manages cloud workloads</p>
        </div>
        <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
          <button
            onClick={() => setActiveTab('db')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'db'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="h-4 w-4" />
            Database Isolation Patterns
          </button>
          <button
            onClick={() => setActiveTab('infra')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'infra'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="h-4 w-4" />
            SaaS Cloud Infrastructure
          </button>
        </div>
      </div>

      <div className="p-6">
        {activeTab === 'db' ? (
          <div>
            {/* Database Selector Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
              {dbIsolations.map((isolation) => (
                <button
                  key={isolation.id}
                  onClick={() => setSelectedIsolation(isolation.id)}
                  className={`p-4 rounded-xl text-left border transition-all relative ${
                    selectedIsolation === isolation.id
                      ? 'border-emerald-500 bg-emerald-950/20 text-white'
                      : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium text-sm flex items-center gap-2 text-slate-200">
                      <Database className={`h-4 w-4 ${selectedIsolation === isolation.id ? 'text-emerald-400' : 'text-slate-500'}`} />
                      {isolation.name.split(',')[1]}
                    </span>
                    <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded ${
                      isolation.id === 'shared_schema_tenant_id' ? 'bg-sky-500/10 text-sky-400' :
                      isolation.id === 'schema_per_tenant' ? 'bg-emerald-500/10 text-emerald-400' :
                      'bg-indigo-500/10 text-indigo-400'
                    }`}>
                      {isolation.id === 'shared_schema_tenant_id' ? 'Starter' :
                       isolation.id === 'schema_per_tenant' ? 'Professional' : 'Enterprise'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2">{isolation.desc}</p>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* SVG Visualization Area */}
              <div className="bg-slate-950 rounded-xl p-6 border border-slate-800/80 flex flex-col justify-center items-center min-h-[320px]">
                <h4 className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-4 text-center">
                  Visual Blueprint: {currentDb.name}
                </h4>

                {/* SVG Drawing of Database Architecture */}
                <svg viewBox="0 0 500 240" className="w-full max-w-md h-auto overflow-visible">
                  {/* Outer Frame */}
                  <rect x="10" y="10" width="480" height="220" rx="10" fill="none" stroke="#334155" strokeDasharray="4" />

                  {/* Tenant Boxes */}
                  <g transform="translate(30, 40)">
                    {/* Tenant 1 Card */}
                    <rect x="0" y="0" width="100" height="40" rx="6" fill="#0ea5e9" fillOpacity="0.1" stroke="#0ea5e9" strokeWidth="1.5" />
                    <text x="50" y="24" fill="#0ea5e9" fontSize="11" fontWeight="bold" textAnchor="middle">Downtown (Starter)</text>
                    
                    {/* Tenant 2 Card */}
                    <rect x="130" y="0" width="100" height="40" rx="6" fill="#10b981" fillOpacity="0.1" stroke="#10b981" strokeWidth="1.5" />
                    <text x="180" y="24" fill="#10b981" fontSize="11" fontWeight="bold" textAnchor="middle">CareFirst (Pro)</text>

                    {/* Tenant 3 Card */}
                    <rect x="260" y="0" width="100" height="40" rx="6" fill="#6366f1" fillOpacity="0.1" stroke="#6366f1" strokeWidth="1.5" />
                    <text x="310" y="24" fill="#6366f1" fontSize="11" fontWeight="bold" textAnchor="middle">St. Jude (Enterpr.)</text>
                  </g>

                  {/* Lines / Flows */}
                  {selectedIsolation === 'shared_schema_tenant_id' && (
                    <g>
                      <path d="M 80 80 Q 250 120 250 150" fill="none" stroke="#0ea5e9" strokeWidth="1.5" strokeDasharray="4" className="animate-[dash_2s_linear_infinite]" />
                      <path d="M 210 80 Q 250 110 250 150" fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="4" className="animate-[dash_2s_linear_infinite]" />
                      <path d="M 340 80 Q 250 120 250 150" fill="none" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="4" className="animate-[dash_2s_linear_infinite]" />
                      
                      {/* Shared DB Cylinder */}
                      <g transform="translate(190, 140)">
                        <path d="M 10 10 C 10 0, 110 0, 110 10 L 110 60 C 110 70, 10 70, 10 60 Z" fill="#1e293b" stroke="#334155" strokeWidth="2" />
                        <ellipse cx="60" cy="10" rx="50" ry="10" fill="#334155" stroke="#475569" strokeWidth="1" />
                        <text x="60" y="32" fill="#cbd5e1" fontSize="10" fontWeight="bold" textAnchor="middle">Shared PostgreSQL</text>
                        <rect x="20" y="42" width="80" height="14" rx="3" fill="#0f172a" stroke="#0ea5e9" strokeWidth="1" />
                        <text x="60" y="52" fill="#0ea5e9" fontSize="8" textAnchor="middle">tenant_id = Filter</text>
                      </g>
                    </g>
                  )}

                  {selectedIsolation === 'schema_per_tenant' && (
                    <g>
                      <path d="M 80 80 Q 150 110 210 150" fill="none" stroke="#0ea5e9" strokeWidth="1.5" strokeDasharray="4" />
                      <path d="M 210 80 Q 250 110 250 150" fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="4" />
                      <path d="M 340 80 Q 350 110 290 150" fill="none" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="4" />

                      {/* Shared DB Cylinder with Separate Schema namespaces */}
                      <g transform="translate(180, 140)">
                        <path d="M 10 10 C 10 0, 130 0, 130 10 L 130 65 C 130 75, 10 75, 10 65 Z" fill="#1e293b" stroke="#334155" strokeWidth="2" />
                        <ellipse cx="70" cy="10" rx="60" ry="10" fill="#334155" stroke="#475569" strokeWidth="1" />
                        <text x="70" y="30" fill="#cbd5e1" fontSize="9" fontWeight="bold" textAnchor="middle">PostgreSQL Database</text>
                        
                        {/* Schema Blocks */}
                        <g transform="translate(18, 38)">
                          <rect x="0" y="0" width="30" height="18" rx="2" fill="#0ea5e9" fillOpacity="0.2" stroke="#0ea5e9" strokeWidth="1" />
                          <text x="15" y="11" fill="#0ea5e9" fontSize="7" fontWeight="bold" textAnchor="middle">sc_downtown</text>
                          
                          <rect x="36" y="0" width="30" height="18" rx="2" fill="#10b981" fillOpacity="0.2" stroke="#10b981" strokeWidth="1" />
                          <text x="51" y="11" fill="#10b981" fontSize="7" fontWeight="bold" textAnchor="middle">sc_carefirst</text>

                          <rect x="72" y="0" width="32" height="18" rx="2" fill="#6366f1" fillOpacity="0.2" stroke="#6366f1" strokeWidth="1" />
                          <text x="88" y="11" fill="#6366f1" fontSize="7" fontWeight="bold" textAnchor="middle">sc_stjude</text>
                        </g>
                      </g>
                    </g>
                  )}

                  {selectedIsolation === 'database_per_tenant' && (
                    <g>
                      <path d="M 80 80 Q 100 120 100 150" fill="none" stroke="#0ea5e9" strokeWidth="1.5" strokeDasharray="4" />
                      <path d="M 210 80 Q 250 120 250 150" fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="4" />
                      <path d="M 340 80 Q 400 120 400 150" fill="none" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="4" />

                      {/* DB 1 */}
                      <g transform="translate(60, 140)">
                        <path d="M 10 8 C 10 0, 70 0, 70 8 L 70 48 C 70 56, 10 56, 10 48 Z" fill="#0f172a" stroke="#0ea5e9" strokeWidth="1.5" />
                        <ellipse cx="40" cy="8" rx="30" ry="6" fill="#1e293b" stroke="#0ea5e9" strokeWidth="0.5" />
                        <text x="40" y="28" fill="#e2e8f0" fontSize="8" fontWeight="bold" textAnchor="middle">DB_Downtown</text>
                        <text x="40" y="40" fill="#64748b" fontSize="7" textAnchor="middle">Starter Instance</text>
                      </g>

                      {/* DB 2 */}
                      <g transform="translate(210, 140)">
                        <path d="M 10 8 C 10 0, 70 0, 70 8 L 70 48 C 70 56, 10 56, 10 48 Z" fill="#0f172a" stroke="#10b981" strokeWidth="1.5" />
                        <ellipse cx="40" cy="8" rx="30" ry="6" fill="#1e293b" stroke="#10b981" strokeWidth="0.5" />
                        <text x="40" y="28" fill="#e2e8f0" fontSize="8" fontWeight="bold" textAnchor="middle">DB_CareFirst</text>
                        <text x="40" y="40" fill="#64748b" fontSize="7" textAnchor="middle">Pro DB Instance</text>
                      </g>

                      {/* DB 3 */}
                      <g transform="translate(360, 140)">
                        <path d="M 10 8 C 10 0, 70 0, 70 8 L 70 48 C 70 56, 10 56, 10 48 Z" fill="#0f172a" stroke="#6366f1" strokeWidth="1.5" />
                        <ellipse cx="40" cy="8" rx="30" ry="6" fill="#1e293b" stroke="#6366f1" strokeWidth="0.5" />
                        <text x="40" y="28" fill="#e2e8f0" fontSize="8" fontWeight="bold" textAnchor="middle">DB_StJude</text>
                        <text x="40" y="40" fill="#64748b" fontSize="7" textAnchor="middle">Enterprise DB</text>
                      </g>
                    </g>
                  )}
                </svg>

                <div className="mt-4 flex gap-4 text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-sky-500 animate-pulse"></div>
                    Downtown
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                    CareFirst
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-indigo-500"></div>
                    St. Jude
                  </div>
                </div>
              </div>

              {/* Blueprint Description Panel */}
              <div className="flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-emerald-400" />
                    How Isolation is Enforced
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    {currentDb.desc}
                  </p>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                      <span className="text-[10px] text-emerald-400 uppercase font-semibold block mb-1">Architectural Pros</span>
                      <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                        {currentDb.pros.map((pro, idx) => <li key={idx}>{pro}</li>)}
                      </ul>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                      <span className="text-[10px] text-rose-400 uppercase font-semibold block mb-1">Architectural Risks</span>
                      <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                        {currentDb.cons.map((con, idx) => <li key={idx}>{con}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* SQL and Code Preview */}
                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] text-slate-400 font-mono uppercase block mb-1">Dynamic Tenant Router SQL Query</span>
                    <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-[11px] text-sky-400 overflow-x-auto whitespace-pre-wrap">
                      {currentDb.sqlQuery}
                    </pre>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-mono uppercase block mb-1">PostgreSQL Isolation Deployment Definition</span>
                    <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-[10px] text-emerald-400/90 overflow-x-auto whitespace-pre-wrap">
                      {currentDb.postgresqlCode}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Cloud Infrastructure Visual Blueprint */
          <div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Infrastructure SVG Blueprint */}
              <div className="lg:col-span-7 bg-slate-950 rounded-xl p-6 border border-slate-800/80 flex flex-col justify-center items-center min-h-[380px]">
                <h4 className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-4 text-center">
                  JUBU PHARMA CARE Cloud Deployment Network
                </h4>

                <svg viewBox="0 0 600 340" className="w-full h-auto overflow-visible">
                  {/* Outer Cloud Container Border */}
                  <rect x="5" y="5" width="590" height="330" rx="12" fill="none" stroke="#1e293b" strokeDasharray="4" />

                  {/* Nodes & Infrastructure Layout */}
                  {/* Layer 1: Entrance */}
                  <g transform="translate(10, 140)"
                     onMouseEnter={() => setHoveredNode('cdn')}
                     onMouseLeave={() => setHoveredNode(null)}
                     className="cursor-pointer">
                    <rect x="0" y="0" width="70" height="60" rx="8" fill="#1e293b" stroke={hoveredNode === 'cdn' ? '#10b981' : '#475569'} strokeWidth="1.5" />
                    <Cloud className="h-5 w-5 text-emerald-400 mx-auto mt-2" />
                    <text x="35" y="44" fill="#cbd5e1" fontSize="9" fontWeight="bold" textAnchor="middle">Anycast CDN</text>
                    <text x="35" y="52" fill="#64748b" fontSize="7" textAnchor="middle">WAF / DNS Route</text>
                  </g>

                  {/* Link CDN to ALB */}
                  <line x1="80" y1="170" x2="130" y2="170" stroke="#10b981" strokeWidth="1.5" strokeDasharray="3" className="animate-[dash_2s_linear_infinite]" />

                  {/* Layer 2: ALB */}
                  <g transform="translate(130, 130)"
                     onMouseEnter={() => setHoveredNode('alb')}
                     onMouseLeave={() => setHoveredNode(null)}
                     className="cursor-pointer">
                    <rect x="0" y="0" width="80" height="80" rx="8" fill="#1e293b" stroke={hoveredNode === 'alb' ? '#10b981' : '#475569'} strokeWidth="1.5" />
                    <Layers className="h-6 w-6 text-sky-400 mx-auto mt-2" />
                    <text x="40" y="46" fill="#cbd5e1" fontSize="9" fontWeight="bold" textAnchor="middle">Load Balancer</text>
                    <text x="40" y="56" fill="#94a3b8" fontSize="8" textAnchor="middle">SSL Offloading</text>
                    <text x="40" y="66" fill="#0ea5e9" fontSize="8" textAnchor="middle">Tenant Subdomains</text>
                  </g>

                  {/* ALB to Container Cluster Links */}
                  <path d="M 210 170 C 240 170, 240 70, 270 70" fill="none" stroke="#475569" strokeWidth="1.5" />
                  <path d="M 210 170 C 240 170, 240 170, 270 170" fill="none" stroke="#475569" strokeWidth="1.5" />
                  <path d="M 210 170 C 240 170, 240 270, 270 270" fill="none" stroke="#475569" strokeWidth="1.5" />

                  {/* Layer 3: Application Container Cluster */}
                  {/* Container Pod 1 */}
                  <g transform="translate(270, 30)"
                     onMouseEnter={() => setHoveredNode('containers')}
                     onMouseLeave={() => setHoveredNode(null)}
                     className="cursor-pointer">
                    <rect x="0" y="0" width="110" height="70" rx="8" fill="#1e293b" stroke={hoveredNode === 'containers' ? '#10b981' : '#475569'} strokeWidth="1.5" />
                    <Cpu className="h-5 w-5 text-emerald-400 mx-auto mt-2" />
                    <text x="55" y="44" fill="#cbd5e1" fontSize="9" fontWeight="bold" textAnchor="middle">API Node Alpha</text>
                    <text x="55" y="54" fill="#10b981" fontSize="8" textAnchor="middle">Node.js Express (H01)</text>
                    <text x="55" y="62" fill="#64748b" fontSize="7" textAnchor="middle">CPU Usage: 12%</text>
                  </g>

                  {/* Container Pod 2 */}
                  <g transform="translate(270, 130)"
                     onMouseEnter={() => setHoveredNode('containers')}
                     onMouseLeave={() => setHoveredNode(null)}
                     className="cursor-pointer">
                    <rect x="0" y="0" width="110" height="70" rx="8" fill="#1e293b" stroke={hoveredNode === 'containers' ? '#10b981' : '#475569'} strokeWidth="1.5" />
                    <Cpu className="h-5 w-5 text-emerald-400 mx-auto mt-2" />
                    <text x="55" y="44" fill="#cbd5e1" fontSize="9" fontWeight="bold" textAnchor="middle">API Node Beta</text>
                    <text x="55" y="54" fill="#10b981" fontSize="8" textAnchor="middle">Node.js Express (H02)</text>
                    <text x="55" y="62" fill="#64748b" fontSize="7" textAnchor="middle">CPU Usage: 18%</text>
                  </g>

                  {/* Container Pod 3 */}
                  <g transform="translate(270, 230)"
                     onMouseEnter={() => setHoveredNode('containers')}
                     onMouseLeave={() => setHoveredNode(null)}
                     className="cursor-pointer">
                    <rect x="0" y="0" width="110" height="70" rx="8" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
                    <Cpu className="h-5 w-5 text-slate-500 mx-auto mt-2 animate-pulse" />
                    <text x="55" y="44" fill="#64748b" fontSize="9" fontWeight="bold" textAnchor="middle">Node Gamma</text>
                    <text x="55" y="54" fill="#475569" fontSize="8" textAnchor="middle">IDLE (Auto-Scale)</text>
                    <text x="55" y="62" fill="#475569" fontSize="7" textAnchor="middle">Min-instances: 1</text>
                  </g>

                  {/* Cluster Links to DB/Cache */}
                  <path d="M 380 65 L 470 110" fill="none" stroke="#475569" strokeWidth="1" />
                  <path d="M 380 165 L 470 120" fill="none" stroke="#475569" strokeWidth="1" />
                  <path d="M 380 165 L 470 215" fill="none" stroke="#475569" strokeWidth="1" />
                  <path d="M 380 265 L 470 230" fill="none" stroke="#475569" strokeWidth="1" />

                  {/* Layer 4: Redis Cache */}
                  <g transform="translate(470, 80)"
                     onMouseEnter={() => setHoveredNode('redis')}
                     onMouseLeave={() => setHoveredNode(null)}
                     className="cursor-pointer">
                    <rect x="0" y="0" width="110" height="55" rx="6" fill="#1e293b" stroke={hoveredNode === 'redis' ? '#10b981' : '#475569'} strokeWidth="1.5" />
                    <HardDrive className="h-4 w-4 text-red-400 mx-auto mt-1" />
                    <text x="55" y="32" fill="#cbd5e1" fontSize="9" fontWeight="bold" textAnchor="middle">Redis Cache</text>
                    <text x="55" y="42" fill="#ef4444" fontSize="7" textAnchor="middle">Tenant Session & Lock</text>
                    <text x="55" y="49" fill="#64748b" fontSize="7" textAnchor="middle">Hit Rate: 94.2%</text>
                  </g>

                  {/* Layer 5: Databases */}
                  <g transform="translate(470, 180)"
                     onMouseEnter={() => setHoveredNode('cloudsql')}
                     onMouseLeave={() => setHoveredNode(null)}
                     className="cursor-pointer">
                    <rect x="0" y="0" width="110" height="80" rx="6" fill="#1e293b" stroke={hoveredNode === 'cloudsql' ? '#10b981' : '#475569'} strokeWidth="1.5" />
                    <Database className="h-5 w-5 text-sky-400 mx-auto mt-1.5" />
                    <text x="55" y="40" fill="#cbd5e1" fontSize="9" fontWeight="bold" textAnchor="middle">PostgreSQL Cluster</text>
                    <text x="55" y="50" fill="#0ea5e9" fontSize="8" textAnchor="middle">Primary DB (Cloud SQL)</text>
                    <text x="55" y="60" fill="#10b981" fontSize="7" textAnchor="middle">Read Replica Live</text>
                    <text x="55" y="70" fill="#64748b" fontSize="7" textAnchor="middle">Daily Encrypted Backups</text>
                  </g>

                  {/* Third party billing indicator */}
                  <g transform="translate(480, 20)">
                    <rect x="0" y="0" width="90" height="30" rx="4" fill="#0f172a" stroke="#6366f1" strokeWidth="1" />
                    <Key className="h-3 w-3 text-indigo-400 inline-block align-middle ml-2" />
                    <text x="50" y="18" fill="#e2e8f0" fontSize="8" textAnchor="middle">Stripe Billing</text>
                  </g>
                  <line x1="380" y1="35" x2="480" y2="35" stroke="#6366f1" strokeWidth="1" strokeDasharray="2" />
                </svg>

                <p className="text-[10px] text-slate-500 mt-2">💡 Hover nodes to inspect micro-service definitions & scaling configs</p>
              </div>

              {/* Node Explanations */}
              <div className="lg:col-span-5 flex flex-col justify-between">
                <div className="bg-slate-950 rounded-xl p-5 border border-slate-800 h-full flex flex-col">
                  <h4 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-emerald-400" />
                    Cloud Architecture Specifications
                  </h4>

                  {!hoveredNode ? (
                    <div className="space-y-4 text-xs text-slate-400 flex-1 flex flex-col justify-center">
                      <p className="italic text-center">Hover over any node in the interactive diagram to load technical SaaS scaling, security, and hosting specifications.</p>
                      <div className="border-t border-slate-800/80 pt-4">
                        <span className="font-semibold text-slate-300 block mb-1">JUBU PHARMA CARE Hosting Core:</span>
                        <ul className="list-disc list-inside space-y-1.5">
                          <li>Docker containerized application code scaling automatically based on HTTP traffic volume.</li>
                          <li>Anycast global CDN with automatic Web Application Firewall (WAF) blocking suspicious SQL injections and brute force attacks.</li>
                          <li>Redis cluster enabling multi-tenant rate limiting (locks API keys from exhausting server limits).</li>
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 space-y-4">
                      {hoveredNode === 'cdn' && (
                        <div>
                          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 uppercase tracking-wider">Anycast CDN & WAF</span>
                          <h5 className="text-sm font-bold text-slate-200 mt-2 mb-1">Global Routing & Firewalls</h5>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            Acts as the primary entry point for all merchant pharmacy endpoints. Performs edge caching for static assets (React bundle) and runs dynamic Web Application Firewall policies to intercept malicious traffic. Under DDoS, it automatically scales caching headers.
                          </p>
                          <div className="mt-3 text-[11px] font-mono text-emerald-400 bg-slate-900 p-2.5 rounded border border-slate-800/80">
                            Latency: &lt; 20ms at edge<br />
                            SSL: TLS 1.3 Strict<br />
                            IP: Dynamic Anycast IPv4/IPv6
                          </div>
                        </div>
                      )}

                      {hoveredNode === 'alb' && (
                        <div>
                          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-sky-500/10 text-sky-400 uppercase tracking-wider">Application Load Balancer</span>
                          <h5 className="text-sm font-bold text-slate-200 mt-2 mb-1">Multi-Tenant Router</h5>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            Decodes custom tenant subdomains (e.g., <code className="text-sky-400 text-xs font-mono">carefirst.jubupharma.com</code>) and maps incoming HTTP traffic to the appropriate container pool. Terminates SSL and performs health audits on healthy nodes.
                          </p>
                          <div className="mt-3 text-[11px] font-mono text-sky-400 bg-slate-900 p-2.5 rounded border border-slate-800/80">
                            Algorithm: Least outstanding requests<br />
                            Health Check: GET /api/health<br />
                            Sticky Sessions: Enforced via tenant cookies
                          </div>
                        </div>
                      )}

                      {hoveredNode === 'containers' && (
                        <div>
                          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 uppercase tracking-wider">Server Compute Cluster</span>
                          <h5 className="text-sm font-bold text-slate-200 mt-2 mb-1">Auto-Scaling Web Servers</h5>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            Runs the fully containerized Express application servers. Hosts our REST endpoints and executes backend business logic. Automatically triggers scale-out instances when average CPU utilization hits 70%.
                          </p>
                          <div className="mt-3 text-[11px] font-mono text-emerald-400 bg-slate-900 p-2.5 rounded border border-slate-800/80">
                            Engine: Google Cloud Run / AWS ECS<br />
                            Instance Memory: 512MB to 2GB RAM<br />
                            Cold Start Mitigation: Warm standby node enabled
                          </div>
                        </div>
                      )}

                      {hoveredNode === 'redis' && (
                        <div>
                          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-red-500/10 text-red-400 uppercase tracking-wider">In-Memory Cache</span>
                          <h5 className="text-sm font-bold text-slate-200 mt-2 mb-1">Redis Workloads</h5>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            Powers session lookups, user login states, API rate limit counters, and temporary row locks during stock deducts in the POS cashier system to avoid race conditions.
                          </p>
                          <div className="mt-3 text-[11px] font-mono text-red-400 bg-slate-900 p-2.5 rounded border border-slate-800/80">
                            Max Memory: 2GB (LRU eviction)<br />
                            Key Structure: tenant:id:session:token<br />
                            Availability: Multi-AZ Replica
                          </div>
                        </div>
                      )}

                      {hoveredNode === 'cloudsql' && (
                        <div>
                          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-sky-500/10 text-sky-400 uppercase tracking-wider">Relational Database</span>
                          <h5 className="text-sm font-bold text-slate-200 mt-2 mb-1">Cloud SQL Cluster</h5>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            The central multi-tenant database. Implements robust pooling and replicas. Tenant schema structure varies by tier. Replicates in real-time across geographic zones for critical failover.
                          </p>
                          <div className="mt-3 text-[11px] font-mono text-sky-400 bg-slate-900 p-2.5 rounded border border-slate-800/80">
                            Engine: PostgreSQL 16 Enterprise<br />
                            Storage: SSD Auto-growing, encrypted<br />
                            Backups: Point-in-time recovery (PITR) 30 days
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="border-t border-slate-800 pt-3 mt-4">
                    <span className="text-[10px] text-slate-500 block">compliance framework</span>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-1">
                      <Shield className="h-3 w-3 text-emerald-400" />
                      HIPAA / GDPR / PCI-DSS Level 1 Audit Compliant Design
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
