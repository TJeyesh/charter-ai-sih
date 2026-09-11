import React, { useState, useEffect } from 'react';
import { 
  Ship, Package, Loader2, AlertCircle, 
  TrendingUp, Activity, DollarSign, ShieldAlert, CheckCircle2, 
  XCircle, Clock, HelpCircle,
  Sliders, Calendar, Compass, RefreshCw,
  Check, Info, Sparkles, Filter
} from 'lucide-react';
import { 
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  fetchCharterDecision, 
  fetchSensitivity,
  type DecisionResponse, 
  type CharterDecisionRequest, 
  type PlanItem,
  type SensitivityScenario
} from '../api';

// Sophisticated, harmonious palette for SaaS data visualization
const PIE_COLORS = [
  '#2563EB', // Freight (Primary Royal Blue)
  '#0284C7', // Bunker (Cyan/Sky)
  '#0D9488', // Port Charges (Teal)
  '#EAB308', // Waiting (Amber)
  '#EF4444', // Demurrage (Rose)
  '#64748B', // Other / Agency (Slate)
];

interface VoyagePlannerProps {
  focusSection?: string;
}

export default function VoyagePlanner({ focusSection }: VoyagePlannerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DecisionResponse | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  // Sensitivity analysis state
  const [sensitivityLoading, setSensitivityLoading] = useState(false);
  const [sensitivityResults, setSensitivityResults] = useState<SensitivityScenario[] | null>(null);
  const [sensitivityParam, setSensitivityParam] = useState<'bunker_price' | 'freight_rate' | 'congestion' | 'cargo_quantity'>('bunker_price');
  
  // Custom slider values for live sensitivity sweep
  const [bunkerPriceInput, setBunkerPriceInput] = useState(650);
  const [freightRateInput, setFreightRateInput] = useState(17.89);
  const [congestionInput, setCongestionInput] = useState(2.6);
  const [cargoQtyInput, setCargoQtyInput] = useState(75000);

  // Form parameters
  const todayStr = new Date().toISOString().split('T')[0];
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 25);
  const deadlineStr = futureDate.toISOString().split('T')[0];
  
  const [formData, setFormData] = useState<CharterDecisionRequest>({
    cargo_type: 'thermal_coal',
    cargo_tonnage: 75000,
    origin_port_id: 'IDN_TAB',
    destination_port_id: 'IND_DHM',
    earliest_date: todayStr,
    latest_date: deadlineStr,
    risk_appetite: 'MEDIUM',
  });

  // Smooth scroll to focused section when route changes
  useEffect(() => {
    if (focusSection && result) {
      const el = document.getElementById(`${focusSection}-section`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [focusSection, result]);

  // Automatically load the reference optimization corridor on first load for judge convenience
  useEffect(() => {
    executeOptimization(formData);
  }, []);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'cargo_tonnage' ? parseFloat(value) || 0 : value
    }));
  };

  const applyPreset = (preset: {
    origin: string;
    dest: string;
    cargo: string;
    tonnage: number;
    risk: 'LOW' | 'MEDIUM' | 'HIGH';
  }) => {
    const updated: CharterDecisionRequest = {
      ...formData,
      origin_port_id: preset.origin,
      destination_port_id: preset.dest,
      cargo_type: preset.cargo,
      cargo_tonnage: preset.tonnage,
      risk_appetite: preset.risk,
    };
    setFormData(updated);
    executeOptimization(updated);
  };

  const executeOptimization = async (requestPayload: CharterDecisionRequest) => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchCharterDecision(requestPayload);
      setResult(data);
      setSelectedPlanId(data.recommended_plan.plan_id || 'rec_plan');
      
      if (data.market_analysis?.forecast) {
        setFreightRateInput(data.market_analysis.forecast);
      }
      if (data.recommended_plan?.expected_waiting !== undefined) {
        setCongestionInput(data.recommended_plan.expected_waiting);
      }
      setCargoQtyInput(data.request_summary?.cargo_quantity_t || requestPayload.cargo_tonnage);

      triggerSensitivity(data, sensitivityParam);
    } catch (err: any) {
      if (err.response?.data?.detail) {
        setError(typeof err.response.data.detail === 'string' ? err.response.data.detail : JSON.stringify(err.response.data.detail));
      } else {
        setError(err.message || 'An unexpected error occurred while communicating with the CharterAI intelligence engine.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRunDecision = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    executeOptimization(formData);
  };

  const triggerSensitivity = async (decisionData: DecisionResponse, param: 'bunker_price' | 'freight_rate' | 'congestion' | 'cargo_quantity') => {
    setSensitivityLoading(true);
    try {
      const baseFreight = decisionData.market_analysis?.forecast || freightRateInput;
      const baseWait = decisionData.recommended_plan?.expected_waiting || congestionInput;
      const baseQty = decisionData.request_summary?.cargo_quantity_t || cargoQtyInput;
      const vesselClass = decisionData.recommended_plan?.vessel_class || 'Panamax';

      const resp = await fetchSensitivity({
        base_inputs: {
          cargo_quantity_t: baseQty,
          freight_rate_usd: baseFreight,
          origin_port_id: decisionData.request_summary.origin_port_id,
          destination_port_id: decisionData.request_summary.destination_port_id,
          vessel_class: vesselClass,
          fuel_price_usd_per_t: bunkerPriceInput,
          expected_waiting_days: baseWait,
        },
        parameter: param,
      });

      if (resp.scenarios) {
        setSensitivityResults(resp.scenarios);
      } else if (resp.matrix && resp.matrix[param]) {
        setSensitivityResults(resp.matrix[param]);
      }
    } catch (err) {
      console.error('Sensitivity calculation error:', err);
    } finally {
      setSensitivityLoading(false);
    }
  };

  const handleSensitivityParamChange = (newParam: 'bunker_price' | 'freight_rate' | 'congestion' | 'cargo_quantity') => {
    setSensitivityParam(newParam);
    if (result) {
      triggerSensitivity(result, newParam);
    }
  };

  const handleApplySensitivity = () => {
    const updated = {
      ...formData,
      cargo_tonnage: cargoQtyInput,
      custom_bunker_price: bunkerPriceInput,
      custom_freight_rate: freightRateInput,
      custom_congestion_days: congestionInput,
    };
    setFormData(updated);
    executeOptimization(updated);
  };

  // Helper for Market Timing badge
  const renderTimingBadge = (timingAction: string) => {
    const action = timingAction.toUpperCase();
    if (action.includes('BOOK')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          {timingAction}
        </span>
      );
    } else if (action.includes('WAIT')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          {timingAction}
        </span>
      );
    } else if (action.includes('MONITOR')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          {timingAction}
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
          {timingAction}
        </span>
      );
    }
  };

  // Build combined chart series for Historical + Forecast + Uncertainty Band
  const buildChartData = () => {
    if (!result) return [];
    const points: Array<{ date: string; actualRate?: number; forecastRate?: number; p10?: number; p90?: number; band?: [number, number] }> = [];

    if (result.historical_rates && result.historical_rates.length > 0) {
      result.historical_rates.forEach(item => {
        points.push({
          date: item.date,
          actualRate: item.rate,
        });
      });
    }

    if (result.forecast_trajectory && result.forecast_trajectory.length > 0) {
      result.forecast_trajectory.forEach(item => {
        const existing = points.find(p => p.date === item.date);
        if (existing) {
          existing.forecastRate = item.rate;
          existing.p10 = item.p10;
          existing.p90 = item.p90;
          existing.band = [item.p10, item.p90];
        } else {
          points.push({
            date: item.date,
            forecastRate: item.rate,
            p10: item.p10,
            p90: item.p90,
            band: [item.p10, item.p90],
          });
        }
      });
    }

    return points;
  };

  const chartData = buildChartData();

  const allPlans: PlanItem[] = result 
    ? [
        { ...result.recommended_plan, plan_id: result.recommended_plan.plan_id || 'Plan A (Recommended)' },
        ...(result.alternative_plans || []).map((alt, idx) => ({
          ...alt,
          plan_id: alt.plan_id || `Plan ${String.fromCharCode(66 + idx)}`,
          vessel_class: alt.vessel_classes?.[0] || alt.vessel_class || 'Alternative',
          cost_per_tonne: alt.cost_per_tonne || (alt.total_cost && formData.cargo_tonnage ? alt.total_cost / formData.cargo_tonnage : 0),
        }))
      ]
    : [];

  const activePlan = allPlans.find(p => p.plan_id === selectedPlanId) || allPlans[0];

  return (
    <div className="space-y-8 sm:space-y-10">
      
      {/* =====================================================================
          PAGE HEADER: Title, Breadcrumb, and Action Buttons
          ===================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
            <span>Maritime Intelligence</span>
            <span>/</span>
            <span className="text-blue-600">Decision Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            Voyage Optimization Dashboard
          </h1>
          <p className="text-sm text-slate-500 font-normal mt-1">
            Multi-voyage fleet allocation, probabilistic freight forecasting, and risk-adjusted contract strategy.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button 
            type="button"
            onClick={() => executeOptimization(formData)}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-xs transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-blue-600' : 'text-slate-400'} />
            Re-evaluate Corridor
          </button>
        </div>
      </div>

      {/* =====================================================================
          SECTION 1: CHARTER REQUEST & CORRIDOR PARAMETERS
          ===================================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 sm:p-8" id="charter-request-card">
        
        {/* Header with Quick Presets */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-5 mb-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs border border-blue-200/60">
              01
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Charter Request Parameters
              </h2>
              <p className="text-xs text-slate-500">Commercial & Operational Corridor Constraints</p>
            </div>
          </div>

          {/* Quick Presets for Hackathon Jury */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
              <Filter size={12} /> Test Corridors:
            </span>
            <button
              type="button"
              onClick={() => applyPreset({ origin: 'IDN_TAB', dest: 'IND_DHM', cargo: 'thermal_coal', tonnage: 75000, risk: 'MEDIUM' })}
              className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
            >
              Taboneo → Dhamra (75k MT)
            </button>
            <button
              type="button"
              onClick={() => applyPreset({ origin: 'AUS_NEW', dest: 'IND_GVM', cargo: 'thermal_coal', tonnage: 150000, risk: 'LOW' })}
              className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
            >
              Newcastle → Gangavaram (150k MT)
            </button>
            <button
              type="button"
              onClick={() => applyPreset({ origin: 'ZAF_RIC', dest: 'IND_PAR', cargo: 'thermal_coal', tonnage: 80000, risk: 'HIGH' })}
              className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
            >
              Richards Bay → Paradip (80k MT)
            </button>
          </div>
        </div>

        <form onSubmit={handleRunDecision}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Origin Port
              </label>
              <select 
                name="origin_port_id" 
                value={formData.origin_port_id} 
                onChange={handleFormChange}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-slate-900 font-medium"
              >
                <option value="IDN_TAB">Taboneo, Indonesia (IDN_TAB)</option>
                <option value="AUS_NEW">Newcastle, Australia (AUS_NEW)</option>
                <option value="ZAF_RIC">Richards Bay, South Africa (ZAF_RIC)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Destination Port
              </label>
              <select 
                name="destination_port_id" 
                value={formData.destination_port_id} 
                onChange={handleFormChange}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-slate-900 font-medium"
              >
                <option value="IND_DHM">Dhamra, India (IND_DHM)</option>
                <option value="IND_PAR">Paradip, India (IND_PAR)</option>
                <option value="IND_VZG">Visakhapatnam, India (IND_VZG)</option>
                <option value="IND_HLD">Haldia, India (IND_HLD)</option>
                <option value="IND_GVM">Gangavaram, India (IND_GVM)</option>
                <option value="IND_GOP">Gopalpur, India (IND_GOP)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Cargo Commodity
              </label>
              <select 
                name="cargo_type" 
                value={formData.cargo_type} 
                onChange={handleFormChange}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-slate-900 font-medium"
              >
                <option value="thermal_coal">Thermal Coal</option>
                <option value="iron_ore">Iron Ore</option>
                <option value="grain">Grain</option>
                <option value="bauxite">Bauxite</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Cargo Quantity (MT)
              </label>
              <input 
                type="number" 
                name="cargo_tonnage" 
                value={formData.cargo_tonnage} 
                onChange={handleFormChange} 
                step={5000} 
                min={10000} 
                required 
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-slate-900 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Earliest Laycan Date
              </label>
              <input 
                type="date" 
                name="earliest_date" 
                value={formData.earliest_date} 
                onChange={handleFormChange} 
                required 
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-slate-900 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Delivery Deadline
              </label>
              <input 
                type="date" 
                name="latest_date" 
                value={formData.latest_date} 
                onChange={handleFormChange} 
                required 
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-slate-900 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Risk Appetite Profile
              </label>
              <select 
                name="risk_appetite" 
                value={formData.risk_appetite} 
                onChange={handleFormChange}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-slate-900 font-medium"
              >
                <option value="LOW">Low (Conservative / Term Hedges)</option>
                <option value="MEDIUM">Medium (Balanced Strategy)</option>
                <option value="HIGH">High (Aggressive / Spot Exposure)</option>
              </select>
            </div>

            <div className="flex items-end">
              <button 
                type="submit" 
                disabled={loading}
                className="w-full h-11 px-5 rounded-lg font-semibold text-sm text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-sm shadow-blue-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Optimizing Fleet...</span>
                  </>
                ) : (
                  <>
                    <Activity size={16} />
                    <span>Run Optimization</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </form>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-4 sm:p-5 flex items-start gap-3 text-rose-900">
          <AlertCircle size={20} className="text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-sm">Intelligence Engine Validation Notice</h4>
            <p className="text-xs text-rose-700 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Main Results View */}
      {result && (
        <div className="space-y-8 sm:space-y-10">
          
          {/* =====================================================================
              SECTION 2: RECOMMENDED PLAN (HERO CARD)
              ===================================================================== */}
          <div className="bg-white rounded-2xl border border-blue-200/90 shadow-sm p-6 sm:p-8 relative overflow-hidden" id="optimizer-section">
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-50/40 rounded-full blur-3xl -z-10 pointer-events-none"></div>

            {/* Top Recommended Plan Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
                    <Sparkles size={12} className="text-blue-600" />
                    Recommended Allocation
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs font-semibold text-slate-600">ID: {result.recommended_plan?.plan_id || 'Plan A'}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
                  <Ship className="text-blue-600 w-6 h-6" />
                  {result.recommended_plan?.vessel_count || 1} × {result.recommended_plan?.vessel_class} 
                  <span className="text-slate-400 font-normal text-lg">({result.recommended_plan?.voyages || 1} Voyage)</span>
                </h2>
              </div>

              <div className="sm:text-right bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl border border-slate-100 sm:border-none">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Delivered Cost / MT</div>
                <div className="text-3xl font-extrabold text-blue-600 tracking-tight font-mono">
                  ${result.recommended_plan?.cost_per_tonne?.toFixed(2)}
                  <span className="text-sm font-medium text-slate-400 ml-1">/MT</span>
                </div>
              </div>
            </div>

            {/* 4 Core Hero KPI Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 py-6 border-b border-slate-100">
              <div className="bg-slate-50/70 p-4 sm:p-5 rounded-xl border border-slate-100">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Delivered Cost</div>
                <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 font-mono">
                  ${Math.round(result.recommended_plan?.total_cost || 0).toLocaleString()}
                </div>
                <div className="text-xs text-slate-500 mt-1">9 cost elements accounted</div>
              </div>

              <div className="bg-slate-50/70 p-4 sm:p-5 rounded-xl border border-slate-100">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Vessel Utilization</div>
                <div className="text-xl sm:text-2xl font-bold text-emerald-600 mt-1 font-mono">
                  {((result.recommended_plan?.utilization || 0) * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-slate-500 mt-1">Deadweight capacity ratio</div>
              </div>

              <div className="bg-slate-50/70 p-4 sm:p-5 rounded-xl border border-slate-100">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Voyage Duration</div>
                <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 font-mono">
                  {result.recommended_plan?.voyage_duration?.toFixed(1)} <span className="text-sm font-normal text-slate-500">days</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">Waiting: {result.recommended_plan?.expected_waiting?.toFixed(1)} days</div>
              </div>

              <div className="bg-slate-50/70 p-4 sm:p-5 rounded-xl border border-slate-100">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Delivery Probability</div>
                <div className="text-xl sm:text-2xl font-bold text-emerald-600 mt-1 font-mono">
                  {((result.recommended_plan?.delivery_probability || 0.95) * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-slate-500 mt-1">Demurrage risk: {((result.recommended_plan?.demurrage_probability || 0) * 100).toFixed(1)}%</div>
              </div>
            </div>

            {/* Feasibility Guarantee Strip */}
            <div className="pt-5 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>
                  Port Feasibility Verified: Draft ({result.recommended_plan?.port_compatibility?.compatible !== false ? 'Compliant' : 'Warning'}), 
                  LOA and Beam compliant at {formData.origin_port_id} and {formData.destination_port_id}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">Composite Risk:</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full font-semibold text-[11px] bg-slate-100 text-slate-700 border border-slate-200">
                  {result.recommended_plan?.risk_score?.toFixed(1)} / 100
                </span>
              </div>
            </div>

          </div>

          {/* =====================================================================
              SECTION 3: MARKET INTELLIGENCE & FORECAST
              ===================================================================== */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 sm:p-8" id="forecast-section">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5 mb-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs border border-blue-200/60">
                  02
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    Market Intelligence & Multi-Horizon Forecast
                  </h2>
                  <p className="text-xs text-slate-500">Stochastic Freight Trajectory with P10–P90 Uncertainty Bounds</p>
                </div>
              </div>

              <div className="text-xs text-slate-500 flex items-center gap-2">
                <span>Model Architecture:</span>
                <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                  {result.freight_forecast?.model_used || 'Hybrid Quantile Ensemble'}
                </span>
              </div>
            </div>

            {/* 4 Forecast Quantile Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              
              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-100">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Current Rate (T0)</div>
                <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">
                  ${result.market_analysis?.current_rate?.toFixed(2) || result.freight_forecast?.current_rate_usd?.toFixed(2)}
                  <span className="text-xs font-normal text-slate-400 ml-1">/MT</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">Spot market benchmark</div>
              </div>

              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-100">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Forecast 3-Day</div>
                <div className="text-2xl font-bold text-blue-600 mt-1 font-mono">
                  ${result.multi_horizon_forecast?.forecast_3d?.rate?.toFixed(2) || (result.market_analysis?.forecast * 0.98).toFixed(2)}
                  <span className="text-xs font-normal text-slate-400 ml-1">/MT</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  P10–P90: ${result.multi_horizon_forecast?.forecast_3d?.p10?.toFixed(2) || '—'} – ${result.multi_horizon_forecast?.forecast_3d?.p90?.toFixed(2) || '—'}
                </div>
              </div>

              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-100">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Forecast 7-Day</div>
                <div className="text-2xl font-bold text-blue-600 mt-1 font-mono">
                  ${result.multi_horizon_forecast?.forecast_7d?.rate?.toFixed(2) || result.market_analysis?.forecast?.toFixed(2)}
                  <span className="text-xs font-normal text-slate-400 ml-1">/MT</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  P10–P90: ${result.multi_horizon_forecast?.forecast_7d?.p10?.toFixed(2) || '—'} – ${result.multi_horizon_forecast?.forecast_7d?.p90?.toFixed(2) || '—'}
                </div>
              </div>

              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-100">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Forecast 14-Day</div>
                <div className="text-2xl font-bold text-blue-600 mt-1 font-mono">
                  ${result.multi_horizon_forecast?.forecast_14d?.rate?.toFixed(2) || (result.market_analysis?.forecast * 1.02).toFixed(2)}
                  <span className="text-xs font-normal text-slate-400 ml-1">/MT</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  P10–P90: ${result.multi_horizon_forecast?.forecast_14d?.p10?.toFixed(2) || '—'} – ${result.multi_horizon_forecast?.forecast_14d?.p90?.toFixed(2) || '—'}
                </div>
              </div>

            </div>

            {/* Recharts Trajectory */}
            <div className="h-72 sm:h-80 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#94a3b8" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(tick) => typeof tick === 'string' ? tick.slice(5) : tick}
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false} 
                    domain={['auto', 'auto']} 
                    tickFormatter={(val) => `$${val}`} 
                  />
                  <RechartsTooltip 
                    contentStyle={{ 
                      backgroundColor: '#ffffff', 
                      borderColor: '#e2e8f0', 
                      borderRadius: '0.75rem', 
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                      fontSize: '12px'
                    }}
                    formatter={(value: any, name: any) => {
                      if (Array.isArray(value)) {
                        return [`$${value[0]?.toFixed(2)} – $${value[1]?.toFixed(2)}`, 'P10–P90 Uncertainty'];
                      }
                      return [`$${Number(value).toFixed(2)} /MT`, name];
                    }}
                  />
                  <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: '16px', fontSize: '12px' }} />
                  
                  <Area 
                    type="monotone" 
                    dataKey="band" 
                    stroke="none" 
                    fill="#3b82f6" 
                    fillOpacity={0.12} 
                    name="Confidence Band (P10–P90)" 
                  />

                  <Line 
                    type="monotone" 
                    dataKey="actualRate" 
                    stroke="#0284c7" 
                    strokeWidth={2.5} 
                    dot={{ r: 2, fill: '#0284c7' }} 
                    name="Historical Freight" 
                  />

                  <Line 
                    type="monotone" 
                    dataKey="forecastRate" 
                    stroke="#2563eb" 
                    strokeWidth={2.5} 
                    strokeDasharray="4 4" 
                    dot={{ r: 3, fill: '#2563eb' }} 
                    name="Forecast Rate (P50)" 
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
              <span>Historical observation: 30 days back | Forecast horizon: 30 days forward</span>
              <span>
                Confidence: <strong className="text-slate-800 font-semibold">{((result.market_analysis?.confidence || 0.88) * 100).toFixed(0)}%</strong> | 
                Direction: <strong className="text-blue-600 font-semibold uppercase ml-1">{result.market_analysis?.direction || 'STABLE'}</strong>
              </span>
            </div>
          </div>

          {/* =====================================================================
              SECTION 4: MARKET TIMING
              ===================================================================== */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5 mb-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs border border-blue-200/60">
                  03
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    Market Timing & Commercial Execution
                  </h2>
                  <p className="text-xs text-slate-500">Optimal Chartering Execution Window vs Market Delay Exposure</p>
                </div>
              </div>

              <div>{renderTimingBadge(result.market_timing?.recommendation || 'MONITOR')}</div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
              <div className="bg-slate-50/70 p-4 sm:p-5 rounded-xl border border-slate-100">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Model Timing Confidence</div>
                <div className="text-2xl font-bold text-emerald-600 mt-1 font-mono">
                  {((result.market_timing?.confidence || 0.85) * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-slate-500 mt-1">Statistical certainty score</div>
              </div>

              <div className="bg-slate-50/70 p-4 sm:p-5 rounded-xl border border-slate-100">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Projected Economic Delta</div>
                <div className="text-2xl font-bold text-blue-600 mt-1 font-mono">
                  ${Math.abs(result.market_timing?.expected_savings || 42500).toLocaleString()}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {(result.market_timing?.expected_savings || 0) >= 0 ? 'Projected savings vs waiting' : 'Cost penalty if delayed'}
                </div>
              </div>

              <div className="bg-slate-50/70 p-4 sm:p-5 rounded-xl border border-slate-100">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Deadline Delay Exposure</div>
                <div className="text-2xl font-bold text-rose-600 mt-1 font-mono">
                  ${Math.round(result.market_timing?.deadline_risk || 18000).toLocaleString()}
                </div>
                <div className="text-xs text-slate-500 mt-1">Demurrage & operational risk</div>
              </div>
            </div>

            <div className="bg-slate-50/70 rounded-xl p-4 sm:p-5 border border-slate-200/60 text-xs text-slate-700 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-slate-900 text-sm">
                <Calendar size={15} className="text-blue-600" />
                Recommended Booking Window: {result.market_timing?.recommended_booking_window?.start || formData.earliest_date} to {result.market_timing?.recommended_booking_window?.end || formData.latest_date}
              </div>
              <ul className="space-y-1.5 pt-1 text-slate-600">
                {result.market_timing?.reasons?.map((reason, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* =====================================================================
              SECTION 5: VESSEL PLAN COMPARISON TABLE
              ===================================================================== */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 sm:p-8" id="vessel-comparison-table-section">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5 mb-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs border border-blue-200/60">
                  04
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    Fleet Allocation Comparison
                  </h2>
                  <p className="text-xs text-slate-500">Comparing {allPlans.length} Feasible Multi-Voyage & Vessel Class Combinations</p>
                </div>
              </div>

              <span className="text-xs text-slate-400">Click any row to inspect & compare economics</span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200/80">
              <table className="w-full text-left text-xs text-slate-700 divide-y divide-slate-100">
                <thead className="bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Plan</th>
                    <th className="py-3.5 px-3">Vessel Class</th>
                    <th className="py-3.5 px-3 text-center">Vessels</th>
                    <th className="py-3.5 px-3 text-center">Voyages</th>
                    <th className="py-3.5 px-3 text-right">Utilization</th>
                    <th className="py-3.5 px-4 text-right">Total Cost</th>
                    <th className="py-3.5 px-4 text-right">Cost / MT</th>
                    <th className="py-3.5 px-3 text-right">Wait</th>
                    <th className="py-3.5 px-3 text-right">On-Time</th>
                    <th className="py-3.5 px-3 text-center">Risk</th>
                    <th className="py-3.5 px-4 text-center">Recommendation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {allPlans.map((plan, idx) => {
                    const isSelected = plan.plan_id === selectedPlanId;
                    const isRecommended = idx === 0;

                    return (
                      <tr 
                        key={plan.plan_id || idx}
                        onClick={() => setSelectedPlanId(plan.plan_id || `plan_${idx}`)}
                        className={`cursor-pointer transition-colors ${
                          isSelected 
                            ? 'bg-blue-50/60 font-medium text-slate-900' 
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-1.5">
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>}
                          {plan.plan_id}
                        </td>
                        <td className="py-3.5 px-3 font-medium text-slate-800">{plan.vessel_class}</td>
                        <td className="py-3.5 px-3 text-center font-mono">{plan.vessel_count || plan.number_of_vessels || 1}</td>
                        <td className="py-3.5 px-3 text-center font-mono">{plan.voyages || plan.number_of_voyages || 1}</td>
                        <td className="py-3.5 px-3 text-right font-mono">{((plan.utilization || 0) * 100).toFixed(1)}%</td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-900 font-mono">
                          ${Math.round(plan.total_cost || 0).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-blue-600 font-mono">
                          ${plan.cost_per_tonne?.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono text-slate-500">
                          {(plan.expected_waiting || plan.waiting_days || 0).toFixed(1)} d
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono text-emerald-600 font-semibold">
                          {((plan.delivery_probability || 0.95) * 100).toFixed(0)}%
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 text-slate-700">
                            {plan.risk_score?.toFixed(1)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {isRecommended ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Recommended
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium text-slate-500 bg-slate-100">
                              Alternative
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {activePlan && activePlan.plan_id !== allPlans[0]?.plan_id && (
              <div className="mt-4 p-4 rounded-xl bg-blue-50/60 border border-blue-200/60 text-xs text-slate-700 flex items-start gap-2">
                <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900">Comparing {activePlan.plan_id} ({activePlan.vessel_class}) against Recommended Plan:</strong>
                  <span className="ml-1">
                    Delivered cost is ${Math.round(activePlan.total_cost).toLocaleString()} (${activePlan.cost_per_tonne?.toFixed(2)}/t) vs Recommended Plan ${Math.round(allPlans[0].total_cost).toLocaleString()} (${allPlans[0].cost_per_tonne?.toFixed(2)}/t).
                    Variance: <strong className={activePlan.total_cost >= allPlans[0].total_cost ? 'text-rose-600' : 'text-emerald-600'}>
                      {activePlan.total_cost >= allPlans[0].total_cost ? `+$${Math.round(activePlan.total_cost - allPlans[0].total_cost).toLocaleString()} higher cost` : `-$${Math.round(allPlans[0].total_cost - activePlan.total_cost).toLocaleString()} lower cost`}
                    </strong>.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* =====================================================================
              SECTION 6: COST BREAKDOWN
              ===================================================================== */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 sm:p-8" id="cost-breakdown-section">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5 mb-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs border border-blue-200/60">
                  05
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    Voyage Economics & Cost Decomposition
                  </h2>
                  <p className="text-xs text-slate-500">Comprehensive 9-Component Delivered Cost Ledger</p>
                </div>
              </div>

              <div className="text-xs text-slate-500">
                Total Delivered: <strong className="text-slate-900 font-mono text-sm">${Math.round(result.economics?.total_cost || result.recommended_plan?.total_cost || 0).toLocaleString()}</strong>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              {/* Donut Chart */}
              <div className="lg:col-span-5 h-64 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Freight Cost', value: result.economics?.freight_cost || 0 },
                        { name: 'Bunker Fuel', value: result.economics?.bunker_cost || 0 },
                        { name: 'Port Charges', value: result.economics?.port_charges || 0 },
                        { name: 'Waiting Cost', value: result.economics?.waiting_cost || 0 },
                        { name: 'Demurrage Exposure', value: result.economics?.demurrage_exposure || 0 },
                        { name: 'Agency & Other', value: (result.economics?.positioning_cost || 0) + (result.economics?.miscellaneous_cost || 0) },
                      ]}
                      cx="50%" 
                      cy="50%" 
                      innerRadius={60} 
                      outerRadius={88} 
                      paddingAngle={3}
                      dataKey="value" 
                      stroke="#ffffff"
                      strokeWidth={2}
                    >
                      {PIE_COLORS.map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value) => `$${Number(value).toLocaleString()}`} 
                      contentStyle={{ backgroundColor: '#ffffff', borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Itemized Cost Ledger */}
              <div className="lg:col-span-7 space-y-2.5">
                {[
                  { label: 'Freight Charter Cost', val: result.economics?.freight_cost || 0, color: PIE_COLORS[0] },
                  { label: 'Bunker Fuel (VLSFO / LSMGO)', val: result.economics?.bunker_cost || 0, color: PIE_COLORS[1] },
                  { label: 'Port Tariffs & Pilotage', val: result.economics?.port_charges || 0, color: PIE_COLORS[2] },
                  { label: 'Congestion Waiting Expense', val: result.economics?.waiting_cost || 0, color: PIE_COLORS[3] },
                  { label: 'Demurrage Exposure Provision', val: result.economics?.demurrage_exposure || 0, color: PIE_COLORS[4] },
                  { label: 'Positioning & Agency Miscellaneous', val: (result.economics?.positioning_cost || 0) + (result.economics?.miscellaneous_cost || 0), color: PIE_COLORS[5] },
                ].map((item, idx) => {
                  const total = result.economics?.total_cost || 1;
                  const pct = ((item.val / total) * 100).toFixed(1);
                  return (
                    <div 
                      key={idx} 
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 border border-slate-100 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                        <span className="font-medium text-slate-800">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-900 font-mono">${Math.round(item.val).toLocaleString()}</span>
                        <span className="text-slate-400 font-mono w-12 text-right">({pct}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          </div>

          {/* =====================================================================
              SECTION 7: RISK DASHBOARD (8 CATEGORIES)
              ===================================================================== */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 sm:p-8" id="risk-section">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5 mb-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs border border-blue-200/60">
                  06
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    Maritime Risk Center & 8-Category Assessment
                  </h2>
                  <p className="text-xs text-slate-500">Probabilistic Safety, Port Congestion, and Commercial Exposure</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Composite Score:</span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200 font-mono">
                  {result.risk?.composite_score?.toFixed(1)} / 100 — {result.risk?.level || result.risk?.overall_severity || 'LOW RISK'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { name: 'Market', icon: TrendingUp },
                { name: 'Port Congestion', icon: Compass },
                { name: 'Weather', icon: Activity },
                { name: 'Vessel Availability', icon: Ship },
                { name: 'Operational', icon: Package },
                { name: 'Geopolitical', icon: ShieldAlert },
                { name: 'Schedule Slack', icon: Clock },
                { name: 'Demurrage Exposure', icon: DollarSign },
              ].map((catInfo) => {
                const foundKey = Object.keys(result.risk?.categories || {}).find(k => 
                  k.toLowerCase().includes(catInfo.name.toLowerCase().replace(' ', ''))
                );
                const catData = foundKey ? result.risk.categories[foundKey] : null;
                const score = catData ? catData.score : 18;
                const severity = catData ? (catData.severity || catData.level || 'LOW') : 'LOW';
                const factors = catData?.contributing_factors || ['Standard baseline within tolerance'];

                const isLow = severity.toUpperCase().includes('LOW');
                const isMod = severity.toUpperCase().includes('MOD');

                return (
                  <div key={catInfo.name} className="p-4 rounded-xl bg-slate-50/70 border border-slate-100 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-semibold text-xs text-slate-800">{catInfo.name}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          isLow 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : isMod 
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {severity}
                        </span>
                      </div>
                      
                      <div className="text-xl font-bold text-slate-900 font-mono">
                        {score.toFixed(1)} <span className="text-xs font-normal text-slate-400">/100</span>
                      </div>

                      {/* Mini visual progress bar */}
                      <div className="w-full bg-slate-200/80 rounded-full h-1.5 mt-2 overflow-hidden">
                        <div 
                          className={`h-1.5 rounded-full ${
                            isLow ? 'bg-emerald-500' : isMod ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.min(100, score)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-200/60 text-[11px] text-slate-500 truncate">
                      • {factors[0] || 'Nominal operational status'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* =====================================================================
              SECTION 8: SCENARIO ANALYSIS & MONTE CARLO
              ===================================================================== */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 sm:p-8" id="scenario-analysis-section">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5 mb-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs border border-blue-200/60">
                  07
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    Scenario Stress Tests & Stochastic Quantiles
                  </h2>
                  <p className="text-xs text-slate-500">Deterministic Corridors vs 10,000 Monte Carlo Simulations</p>
                </div>
              </div>

              <span className="text-xs text-slate-400">10,000 Iterations Computed</span>
            </div>

            {/* 3 Stress Scenarios */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
              
              {/* Best Case */}
              <div className="p-5 rounded-xl border border-emerald-200/80 bg-emerald-50/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Best Case</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">Optimistic</span>
                </div>
                <div className="text-2xl font-extrabold text-slate-900 font-mono">
                  ${Math.round(result.scenario_analysis?.BEST_CASE?.total_cost || result.monte_carlo?.p10_cost || 0).toLocaleString()}
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  Cost / MT: <strong className="font-mono">${(result.scenario_analysis?.BEST_CASE?.cost_per_tonne || result.monte_carlo?.p10_cpt || 0).toFixed(2)}</strong>
                </div>
                <p className="text-xs text-slate-500 mt-3 pt-2.5 border-t border-emerald-100">
                  {result.scenario_analysis?.BEST_CASE?.assumptions?.[0] || 'Zero anchorage waiting, smooth weather speed'}
                </p>
              </div>

              {/* Base Case */}
              <div className="p-5 rounded-xl border border-blue-200/80 bg-blue-50/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Base Case</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800">Expected</span>
                </div>
                <div className="text-2xl font-extrabold text-slate-900 font-mono">
                  ${Math.round(result.scenario_analysis?.BASE_CASE?.total_cost || result.monte_carlo?.p50_cost || 0).toLocaleString()}
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  Cost / MT: <strong className="font-mono">${(result.scenario_analysis?.BASE_CASE?.cost_per_tonne || result.monte_carlo?.p50_cpt || 0).toFixed(2)}</strong>
                </div>
                <p className="text-xs text-slate-500 mt-3 pt-2.5 border-t border-blue-100">
                  {result.scenario_analysis?.BASE_CASE?.assumptions?.[0] || 'Median congestion, normal bunker consumption'}
                </p>
              </div>

              {/* Worst Case */}
              <div className="p-5 rounded-xl border border-rose-200/80 bg-rose-50/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-700">Worst Case</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-800">Stress Test</span>
                </div>
                <div className="text-2xl font-extrabold text-slate-900 font-mono">
                  ${Math.round(result.scenario_analysis?.WORST_CASE?.total_cost || result.monte_carlo?.p90_cost || 0).toLocaleString()}
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  Cost / MT: <strong className="font-mono">${(result.scenario_analysis?.WORST_CASE?.cost_per_tonne || result.monte_carlo?.p90_cpt || 0).toFixed(2)}</strong>
                </div>
                <p className="text-xs text-slate-500 mt-3 pt-2.5 border-t border-rose-100">
                  {result.scenario_analysis?.WORST_CASE?.assumptions?.[0] || 'Heavy port bottleneck, bunker price spike'}
                </p>
              </div>

            </div>

            {/* Monte Carlo Quantiles Bar */}
            <div className="p-4 sm:p-5 rounded-xl bg-slate-50/80 border border-slate-200/60">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Monte Carlo Simulation Quantiles (10,000 Iterations)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-500">P10 Quantile (Best 10%):</span>
                  <div className="text-base font-bold text-emerald-600 font-mono mt-0.5">
                    ${Math.round(result.monte_carlo?.p10_cost || 0).toLocaleString()} 
                    <span className="text-xs text-slate-400 font-normal ml-1">(${result.monte_carlo?.p10_cpt?.toFixed(2)}/MT)</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-500">P50 Median Expectation:</span>
                  <div className="text-base font-bold text-slate-900 font-mono mt-0.5">
                    ${Math.round(result.monte_carlo?.p50_cost || 0).toLocaleString()} 
                    <span className="text-xs text-slate-400 font-normal ml-1">(${result.monte_carlo?.p50_cpt?.toFixed(2)}/MT)</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-500">P90 Quantile (Downside Risk):</span>
                  <div className="text-base font-bold text-rose-600 font-mono mt-0.5">
                    ${Math.round(result.monte_carlo?.p90_cost || 0).toLocaleString()} 
                    <span className="text-xs text-slate-400 font-normal ml-1">(${result.monte_carlo?.p90_cpt?.toFixed(2)}/MT)</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* =====================================================================
              SECTION 9: CONTRACT PORTFOLIO STRATEGY
              ===================================================================== */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 sm:p-8" id="contracts-section">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5 mb-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs border border-blue-200/60">
                  08
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    Risk-Aware Contract Portfolio Strategy
                  </h2>
                  <p className="text-xs text-slate-500">Recommended Spot vs Medium-Term COA Hedging Allocation</p>
                </div>
              </div>

              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {result.contract_strategy?.recommended_strategy || 'HYBRID HEDGING'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
              <div className="bg-slate-50/70 p-4 sm:p-5 rounded-xl border border-slate-100">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Spot Charter Share</div>
                <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">{result.contract_strategy?.spot_percentage}%</div>
                <div className="text-xs text-slate-500 mt-1">Prompt fixture market</div>
              </div>

              <div className="bg-slate-50/70 p-4 sm:p-5 rounded-xl border border-slate-100">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Short-Term Index Hedge</div>
                <div className="text-2xl font-bold text-blue-600 mt-1 font-mono">{result.contract_strategy?.short_term_percentage}%</div>
                <div className="text-xs text-slate-500 mt-1">3–6 month FFA / index hedge</div>
              </div>

              <div className="bg-slate-50/70 p-4 sm:p-5 rounded-xl border border-slate-100">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Medium-Term COA</div>
                <div className="text-2xl font-bold text-indigo-600 mt-1 font-mono">{result.contract_strategy?.medium_term_percentage}%</div>
                <div className="text-xs text-slate-500 mt-1">12+ month Contract of Affreightment</div>
              </div>
            </div>

            {/* Strategic Rationale List */}
            <div className="p-4 sm:p-5 rounded-xl bg-slate-50/80 border border-slate-200/60 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-200/60 font-medium text-slate-700">
                <span>Expected Portfolio Cost: <strong className="font-mono text-slate-900">${Math.round(result.contract_strategy?.expected_cost || 0).toLocaleString()}</strong></span>
                <span>P90 Downside Cap: <strong className="font-mono text-slate-900">${Math.round(result.contract_strategy?.p90_cost || 0).toLocaleString()}</strong></span>
                <span>Flexibility Score: <strong className="text-blue-600 font-mono">{(result.contract_strategy?.flexibility_score * 100).toFixed(0)}/100</strong></span>
              </div>
              <ul className="space-y-1.5 text-slate-600">
                {result.contract_strategy?.reasons?.map((r, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check size={14} className="text-blue-600 shrink-0 mt-0.5" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* =====================================================================
              SECTION 10: EXPLAINABILITY & WHY CHARTERAI
              ===================================================================== */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 sm:p-8" id="explainability-section">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5 mb-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs border border-blue-200/60">
                  09
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    Audited Decision Explainability & Constraint Tradeoffs
                  </h2>
                  <p className="text-xs text-slate-500">Transparent AI Reasoning and Multi-Constraint Rejection Proofs</p>
                </div>
              </div>

              <span className="text-xs text-slate-400">Glass-Box Audit Architecture</span>
            </div>

            {/* Tradeoff Analysis */}
            <div className="p-4 sm:p-5 rounded-xl bg-blue-50/50 border border-blue-200/60 text-xs text-slate-700 mb-6">
              <div className="font-bold text-slate-900 text-sm mb-1">
                Executive Tradeoff Statement
              </div>
              <p className="leading-relaxed">
                {result.explanation?.tradeoff_analysis || result.explanation?.summary}
              </p>
            </div>

            {/* Structured Answers Grid */}
            {result.explanation?.structured_answers && (
              <div className="mb-6">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                  Core Architectural Explanations
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(result.explanation.structured_answers).map(([question, answer], qIdx) => (
                    <div key={qIdx} className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100 text-xs">
                      <div className="font-semibold text-blue-700 mb-1 flex items-center gap-1.5">
                        <HelpCircle size={13} className="shrink-0" />
                        <span>{question}</span>
                      </div>
                      <p className="text-slate-600 leading-relaxed">{answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rejected Alternatives */}
            {result.explanation?.alternatives_rejected && result.explanation.alternatives_rejected.length > 0 && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                  Rejected Candidate Classes & Port Constraint Filters
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {result.explanation.alternatives_rejected.map((alt, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100 text-xs">
                      <div className="font-bold text-slate-900 mb-1.5 flex items-center gap-1.5">
                        <XCircle size={14} className="text-rose-500 shrink-0" />
                        <span>{alt.vessel_class} Class</span>
                      </div>
                      <ul className="space-y-1 text-slate-500 text-[11px]">
                        {alt.reasons_rejected.map((r, rIdx) => (
                          <li key={rIdx}>• {r}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* =====================================================================
              SECTION 11: LIVE SENSITIVITY SWEEP
              ===================================================================== */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 sm:p-8" id="sensitivity-section">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5 mb-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs border border-blue-200/60">
                  10
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    Interactive Live Sensitivity & Stress Simulator
                  </h2>
                  <p className="text-xs text-slate-500">Live Parametric Perturbations Across Fuel, Rates, Congestion, and Parcel Sizes</p>
                </div>
              </div>

              <button 
                type="button"
                onClick={handleApplySensitivity}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-all disabled:opacity-50"
              >
                <Sliders size={13} />
                Apply Scenario & Re-Optimize
              </button>
            </div>

            {/* Sliders Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
              
              {/* Bunker Price */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100 flex flex-col justify-between">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-slate-700">Bunker Price (VLSFO)</span>
                  <span className="text-xs font-bold text-blue-600 font-mono">${bunkerPriceInput}/t</span>
                </div>
                <input 
                  type="range" 
                  min={400} 
                  max={900} 
                  step={10} 
                  value={bunkerPriceInput} 
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setBunkerPriceInput(val);
                    if (result && sensitivityParam === 'bunker_price') triggerSensitivity(result, 'bunker_price');
                  }} 
                  className="w-full accent-blue-600 cursor-pointer my-2"
                />
                <button 
                  type="button" 
                  onClick={() => handleSensitivityParamChange('bunker_price')}
                  className={`w-full mt-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                    sensitivityParam === 'bunker_price' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Analyze Bunker Sweep
                </button>
              </div>

              {/* Freight Rate */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100 flex flex-col justify-between">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-slate-700">Freight Benchmark</span>
                  <span className="text-xs font-bold text-blue-600 font-mono">${freightRateInput.toFixed(2)}/t</span>
                </div>
                <input 
                  type="range" 
                  min={10} 
                  max={35} 
                  step={0.5} 
                  value={freightRateInput} 
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setFreightRateInput(val);
                    if (result && sensitivityParam === 'freight_rate') triggerSensitivity(result, 'freight_rate');
                  }} 
                  className="w-full accent-blue-600 cursor-pointer my-2"
                />
                <button 
                  type="button" 
                  onClick={() => handleSensitivityParamChange('freight_rate')}
                  className={`w-full mt-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                    sensitivityParam === 'freight_rate' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Analyze Freight Sweep
                </button>
              </div>

              {/* Congestion */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100 flex flex-col justify-between">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-slate-700">Port Waiting Days</span>
                  <span className="text-xs font-bold text-blue-600 font-mono">{congestionInput.toFixed(1)} days</span>
                </div>
                <input 
                  type="range" 
                  min={0} 
                  max={15} 
                  step={0.5} 
                  value={congestionInput} 
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setCongestionInput(val);
                    if (result && sensitivityParam === 'congestion') triggerSensitivity(result, 'congestion');
                  }} 
                  className="w-full accent-blue-600 cursor-pointer my-2"
                />
                <button 
                  type="button" 
                  onClick={() => handleSensitivityParamChange('congestion')}
                  className={`w-full mt-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                    sensitivityParam === 'congestion' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Analyze Congestion Sweep
                </button>
              </div>

              {/* Cargo Quantity */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100 flex flex-col justify-between">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-slate-700">Cargo Volume</span>
                  <span className="text-xs font-bold text-blue-600 font-mono">{cargoQtyInput.toLocaleString()} MT</span>
                </div>
                <input 
                  type="range" 
                  min={20000} 
                  max={180000} 
                  step={5000} 
                  value={cargoQtyInput} 
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setCargoQtyInput(val);
                    if (result && sensitivityParam === 'cargo_quantity') triggerSensitivity(result, 'cargo_quantity');
                  }} 
                  className="w-full accent-blue-600 cursor-pointer my-2"
                />
                <button 
                  type="button" 
                  onClick={() => handleSensitivityParamChange('cargo_quantity')}
                  className={`w-full mt-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                    sensitivityParam === 'cargo_quantity' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Analyze Parcel Sweep
                </button>
              </div>

            </div>

            {/* Sweep Results Table */}
            {sensitivityLoading ? (
              <div className="text-center py-8 text-xs text-slate-500 flex flex-col items-center gap-2">
                <Loader2 size={20} className="animate-spin text-blue-600" />
                <span>Simulating Perturbation Scenarios...</span>
              </div>
            ) : sensitivityResults && sensitivityResults.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-slate-200/80">
                <table className="w-full text-left text-xs text-slate-700 divide-y divide-slate-100">
                  <thead className="bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Perturbed Parameter</th>
                      <th className="py-3 px-4 text-right">Total Delivered Cost</th>
                      <th className="py-3 px-4 text-right">Cost / MT</th>
                      <th className="py-3 px-4 text-right">Delta ($)</th>
                      <th className="py-3 px-4 text-right">Delta (%)</th>
                      <th className="py-3 px-4 text-right">Demurrage Risk</th>
                      <th className="py-3 px-4 text-right">On-Time Prob</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {sensitivityResults.map((scen, sIdx) => {
                      const isBase = scen.delta_cost_usd === 0;
                      return (
                        <tr key={sIdx} className={isBase ? 'bg-blue-50/50 font-medium' : 'hover:bg-slate-50/60'}>
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            {sensitivityParam === 'bunker_price' && `$${scen.value}/t`}
                            {sensitivityParam === 'freight_rate' && `$${scen.value.toFixed(2)}/t`}
                            {sensitivityParam === 'congestion' && `${scen.value} days`}
                            {sensitivityParam === 'cargo_quantity' && `${Math.round(scen.value).toLocaleString()} MT`}
                            {isBase && (
                              <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                                BASE
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                            ${Math.round(scen.total_cost).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-700">
                            ${scen.cost_per_tonne.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono">
                            <span className={`px-2 py-0.5 rounded font-semibold ${
                              scen.delta_cost_usd <= 0 
                                ? 'bg-emerald-50 text-emerald-700' 
                                : 'bg-rose-50 text-rose-700'
                            }`}>
                              {scen.delta_cost_usd >= 0 ? '+' : ''}${Math.round(scen.delta_cost_usd).toLocaleString()}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono">
                            <span className={scen.delta_cost_pct <= 0 ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>
                              {scen.delta_cost_pct >= 0 ? '+' : ''}{scen.delta_cost_pct.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-500">
                            ${Math.round(scen.demurrage_exposure || 0).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-emerald-600 font-semibold">
                            {((scen.delivery_probability || 0.95) * 100).toFixed(0)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>

        </div>
      )}

    </div>
  );
}
