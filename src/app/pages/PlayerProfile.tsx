import { useParams, useNavigate } from 'react-router';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Legend, Tooltip as RechartsTooltip,
} from 'recharts';
import { ArrowLeft, Users, TrendingUp, AlertCircle, Award, User, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  fetchPlayers, Player, formatHeight, formatMoney, getScoreColor, getTierColors,
  modelConfidence,
} from '../data/players';
import { MetricGlossaryTooltip } from '../components/ui/metric-glossary';
import { Tooltip, TooltipContent, TooltipTrigger } from '../components/ui/tooltip';

/** Returns the correct English ordinal suffix for a number (1st, 2nd, 3rd, 4th…). */
function ordinalSuffix(n: number): string {
  const abs = Math.abs(n);
  const v = abs % 100;
  if (v >= 11 && v <= 13) return 'th';
  switch (abs % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function Section({
  title, titleExtra, children,
}: { title: string; titleExtra?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-muted-foreground text-xs uppercase tracking-widest" style={{ fontWeight: 600 }}>
          {title}
        </h3>
        {titleExtra}
      </div>
      {children}
    </div>
  );
}

function StatPill({
  label, value, sub, valueColor,
}: { label: string; value: string | number; sub?: string; valueColor?: string }) {
  return (
    <div className="bg-secondary rounded-lg px-4 py-3">
      <div className="text-muted-foreground text-xs" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
        {label}
      </div>
      <div className="mt-0.5 text-lg tabular-nums" style={{ fontWeight: 700, color: valueColor || 'var(--color-foreground)' }}>
        {value}
      </div>
      {sub && <div className="text-muted-foreground text-xs mt-0.5">{sub}</div>}
    </div>
  );
}

function PercentileBar({
  label, value, color, sub, tooltip,
}: { label: string; value: number; color: string; sub: string; tooltip?: string }) {
  const band =
    value >= 80 ? 'Elite' :
    value >= 65 ? 'Above Avg' :
    value >= 45 ? 'Average' :
    value >= 30 ? 'Below Avg' : 'Low';

  const inner = (
    <>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-foreground text-sm" style={{ fontWeight: 600 }}>{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{band}</span>
          <span className="text-sm tabular-nums" style={{ fontWeight: 800, color }}>
            {value}<span className="text-xs font-normal opacity-60">{ordinalSuffix(value)}</span>
          </span>
        </div>
      </div>
      <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
      <div className="text-muted-foreground text-xs mt-1 leading-tight">{sub}</div>
    </>
  );

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-help">{inner}</div>
        </TooltipTrigger>
        <TooltipContent side="top"><p className="text-xs font-medium">{tooltip}</p></TooltipContent>
      </Tooltip>
    );
  }
  return <div>{inner}</div>;
}

function CombineCell({ label, val, unit }: { label: string; val?: number; unit: string }) {
  if (val == null) return null;
  return (
    <div className="bg-secondary/70 rounded-lg p-2.5 text-center">
      <div className="text-muted-foreground text-xs mb-0.5">{label}</div>
      <div className="text-foreground text-sm tabular-nums" style={{ fontWeight: 700 }}>
        {val}{unit}
      </div>
    </div>
  );
}

function AthleticScoreBar({
  label, value, tooltip,
}: { label: string; value: number; tooltip?: string }) {
  const color =
    value >= 75 ? 'var(--color-success)' :
    value >= 55 ? '#60a5fa' :
    value >= 40 ? '#facc15' :
    'var(--color-destructive)';

  const inner = (
    <>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground" style={{ fontWeight: 600 }}>{label}</span>
        <span style={{ color, fontWeight: 700 }}>{value}</span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
    </>
  );

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-help">{inner}</div>
        </TooltipTrigger>
        <TooltipContent side="top"><p className="text-xs font-medium">{tooltip}</p></TooltipContent>
      </Tooltip>
    );
  }
  return <div>{inner}</div>;
}

// ─── Main component ────────────────────────────────────────────────────────────

export function PlayerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlayers().then(data => {
      setPlayers(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-full bg-background flex items-center justify-center">
        <p className="text-muted-foreground animate-pulse">Loading player data...</p>
      </div>
    );
  }

  const player = players.find(p => p.id === id);

  if (!player) {
    return (
      <div className="min-h-full bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-muted-foreground text-6xl mb-4">404</div>
          <p className="text-muted-foreground">Player not found</p>
          <button onClick={() => navigate('/')} className="mt-4 text-success text-sm hover:text-success/80">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const { bg: tierBg, text: tierText, border: tierBorder, hex: tierHex } = getTierColors(player.tier);
  const scoreColor = getScoreColor(player.sleeperScore);

  // Contract value visualization
  const surplusIsPositive = player.contractSurplus >= 0;
  const totalBar = Math.max(player.performanceValue, player.contractCost);
  const costPct = Math.min(100, (player.contractCost / totalBar) * 100);
  const surplusPct = surplusIsPositive
    ? Math.min(100, (player.contractSurplus / totalBar) * 100)
    : 0;
  const overPayPct = !surplusIsPositive
    ? Math.min(100, (Math.abs(player.contractSurplus) / totalBar) * 100)
    : 0;

  // Contract surplus gauge (0–100 percentile needle)
  const surplusNeedlePct = player.contractSurplusPercentile * 100;

  // Percentile values (0–100 integers)
  const upsidePct = Math.round(player.upsidePercentile * 100);
  const roundValPct = Math.round(player.roundValuePercentile * 100);
  const surplusPercentileDisplay = Math.round(player.contractSurplusPercentile * 100);

  // Radar data
  const radarData = Object.entries(player.productionRadar).map(([metric, value]) => ({
    metric,
    player: value,
    posAvg: 50,
  }));

  const confidence = modelConfidence[player.position];

  return (
    <div className="min-h-full bg-background p-6">

      {/* ── Back nav ── */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <span className="text-muted-foreground">/</span>
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-primary" />
          <span className="text-foreground text-sm" style={{ fontWeight: 600 }}>{player.name}</span>
        </div>
      </div>

      {/* ── Hero Header ── */}
      <div className="bg-card border border-border rounded-xl p-6 mb-5">
        <div className="flex flex-wrap items-start gap-5">

          {/* Score circle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="w-20 h-20 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 cursor-help"
                style={{ background: `${scoreColor}15`, border: `2px solid ${scoreColor}40` }}
              >
                <div className="text-3xl" style={{ color: scoreColor, fontWeight: 800, lineHeight: 1 }}>{player.sleeperScore}</div>
                <div className="text-xs mt-0.5" style={{ color: scoreColor, opacity: 0.7, fontWeight: 600 }}>SCORE</div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p className="text-xs font-medium">Sleeper Score: Composite 0–100 rating combining college production, athletic testing, and physical traits. 80+ = elite.</p>
            </TooltipContent>
          </Tooltip>

          {/* Player info */}
          <div className="flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-foreground text-2xl" style={{ fontWeight: 800 }}>{player.name}</h1>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="bg-secondary text-foreground text-xs px-2 py-0.5 rounded" style={{ fontWeight: 700 }}>
                    {player.position}
                  </span>
                  <span className="text-muted-foreground text-sm">{player.college}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground text-sm">
                    Rd {player.draftRound} / #{player.draftPick}
                  </span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground text-sm">
                    {formatHeight(player.height)} / {player.weight} lbs
                  </span>
                </div>
                {player.draftWindowLabel && (
                  <p className="text-muted-foreground text-xs mt-2 italic">
                    "{player.draftWindowLabel}"
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-lg text-sm ${tierBg} ${tierText} border ${tierBorder} cursor-help`}
                      style={{ fontWeight: 700 }}
                    >
                      {player.tier}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-xs font-medium">
                      {player.tier === 'High Upside'   && 'Sleeper Score ≥ 75 — elite projection relative to draft slot. High-priority target.'}
                      {player.tier === 'Safe Floor'    && 'Solid score with positive contract surplus. Reliable value pick.'}
                      {player.tier === 'Boom or Bust'  && 'Good score but surplus is below average. High-variance outcome.'}
                      {player.tier === 'Developmental' && 'Moderate score. Needs development — potential late-round sleeper.'}
                      {player.tier === 'Overdrafted'   && 'Being drafted ahead of projected model value. Proceed with caution.'}
                    </p>
                  </TooltipContent>
                </Tooltip>
                <button
                  onClick={() => navigate(`/compare?p1=${player.id}`)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-secondary border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-all text-sm"
                >
                  <Users className="w-3.5 h-3.5" />
                  Compare
                </button>
              </div>
            </div>

            {/* Key stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-help">
                    <StatPill label="Sleeper Score" value={player.sleeperScore} valueColor={scoreColor} sub="out of 100" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top"><p className="text-xs font-medium">Sleeper Score: Composite 0–100 rating from college production, athletic testing, and physical traits.</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-help">
                    <StatPill label="Perf. Value" value={formatMoney(player.performanceValue)} sub="projected career" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top"><p className="text-xs font-medium">Performance Value: Model-estimated NFL career value expressed in contract dollars.</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-help">
                    <StatPill
                      label="Contract Surplus"
                      value={`${player.contractSurplus >= 0 ? '+' : ''}${formatMoney(Math.abs(player.contractSurplus))}`}
                      valueColor={player.contractSurplus >= 0 ? 'var(--color-success)' : 'var(--color-destructive)'}
                      sub={player.contractSurplus >= 0 ? 'vs. rookie deal' : 'potential overpay'}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top"><p className="text-xs font-medium">Contract Surplus: Performance Value minus expected rookie contract cost. Positive = potential bargain.</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-help">
                    <StatPill label="Proj. Pick" value={`#${player.draftPick}`} sub={`Round ${player.draftRound}`} />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top"><p className="text-xs font-medium">Projected draft pick and round based on consensus big board and model inputs.</p></TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2×2 Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ───────────────────────────────────────────────────────────────
            SECTION 1 (top-left): Contract Value Analysis
        ─────────────────────────────────────────────────────────────── */}
        <Section title="Contract Value Analysis">
          <div className="space-y-5">

            {/* Three money figures */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-muted-foreground text-xs mb-1" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                  Perf. Value
                </div>
                <div className="text-foreground text-xl tabular-nums" style={{ fontWeight: 800 }}>
                  {formatMoney(player.performanceValue)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs mb-1" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                  Surplus
                </div>
                <div
                  className="text-xl tabular-nums"
                  style={{ fontWeight: 800, color: surplusIsPositive ? 'var(--color-success)' : 'var(--color-destructive)' }}
                >
                  {surplusIsPositive ? '+' : ''}{formatMoney(Math.abs(player.contractSurplus))}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs mb-1" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                  Contract Cost
                </div>
                <div className="text-foreground text-xl tabular-nums" style={{ fontWeight: 800 }}>
                  {formatMoney(player.contractCost)}
                </div>
              </div>
            </div>

            {/* Value/cost stacked bar */}
            <div>
              <div className="text-xs text-muted-foreground mb-1.5" style={{ fontWeight: 600 }}>
                Value Breakdown
              </div>
              <div className="h-8 rounded-lg overflow-hidden flex" style={{ background: 'var(--color-secondary)' }}>
                {surplusIsPositive ? (
                  <>
                    <div
                      className="h-full flex items-center justify-center text-xs transition-all duration-700"
                      style={{
                        width: `${costPct}%`,
                        background: 'rgba(100,116,139,0.5)',
                        color: 'var(--color-muted-foreground)',
                        fontWeight: 700,
                        minWidth: costPct > 10 ? 0 : undefined,
                      }}
                    >
                      {costPct > 18 ? `Cost ${formatMoney(player.contractCost)}` : ''}
                    </div>
                    <div
                      className="h-full flex items-center justify-center text-xs transition-all duration-700"
                      style={{
                        width: `${surplusPct}%`,
                        background: 'linear-gradient(to right, var(--color-success), #065f46)',
                        color: '#fff',
                        fontWeight: 700,
                      }}
                    >
                      {surplusPct > 20 ? `+${formatMoney(player.contractSurplus)} surplus` : ''}
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      className="h-full flex items-center justify-center text-xs"
                      style={{
                        width: `${costPct - Math.min(overPayPct, 100 - costPct)}%`,
                        background: 'rgba(100,116,139,0.4)',
                        color: 'var(--color-muted-foreground)',
                        fontWeight: 700,
                      }}
                    >
                      {costPct > 30 ? `Value ${formatMoney(player.performanceValue)}` : ''}
                    </div>
                    <div
                      className="h-full flex items-center justify-center text-xs"
                      style={{
                        width: `${overPayPct}%`,
                        background: 'linear-gradient(to right, var(--color-destructive), #7f1d1d)',
                        color: '#fff',
                        fontWeight: 700,
                      }}
                    >
                      {overPayPct > 20 ? `Overpay ${formatMoney(Math.abs(player.contractSurplus))}` : ''}
                    </div>
                  </>
                )}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Contract Cost</span>
                <span>Performance Value</span>
              </div>
            </div>

            {/* Surplus percentile gauge */}
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                <span style={{ fontWeight: 600 }}>Contract Surplus Percentile</span>
                <span style={{ fontWeight: 700, color: surplusIsPositive ? 'var(--color-success)' : 'var(--color-destructive)' }}>
                  {surplusPercentileDisplay}th percentile
                </span>
              </div>
              <div className="relative h-5 rounded-lg overflow-hidden">
                {/* Gradient track */}
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, #7f1d1d, var(--color-destructive) 30%, var(--color-warning) 50%, var(--color-success) 75%, #065f46)' }} />
                {/* Center line */}
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/30" />
                {/* Needle */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-background shadow-lg z-10 transition-all duration-700"
                  style={{
                    left: `calc(${surplusNeedlePct}% - 6px)`,
                    backgroundColor: surplusIsPositive ? 'var(--color-success)' : 'var(--color-destructive)',
                    boxShadow: `0 0 10px ${surplusIsPositive ? 'var(--color-success)' : 'var(--color-destructive)'}80`,
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Worst Value (0th)</span>
                <span>Avg (50th)</span>
                <span>Best Value (100th)</span>
              </div>
            </div>

            {/* Draft window label */}
            {player.draftWindowLabel && (
              <div className="bg-secondary/40 rounded-lg px-4 py-3 border border-border/50">
                <div className="text-xs text-muted-foreground mb-1" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Model Recommendation
                </div>
                <p className="text-foreground text-sm" style={{ fontWeight: 600 }}>
                  {player.draftWindowLabel}
                </p>
              </div>
            )}
          </div>
        </Section>

        {/* ───────────────────────────────────────────────────────────────
            SECTION 2 (top-right): Model Value Indicators
        ─────────────────────────────────────────────────────────────── */}
        <Section title="Model Value Indicators">
          <div className="space-y-5">
            <PercentileBar
              label="Career Upside"
              value={upsidePct}
              color="var(--color-success)"
              sub="Likelihood of high-end NFL production vs. all 2026 skill prospects"
              tooltip="Career Upside: Probability the player becomes a high-end NFL contributor, modelled vs. all 2026 skill position prospects."
            />
            <PercentileBar
              label="Round Value"
              value={roundValPct}
              color="#60a5fa"
              sub="Expected NFL impact relative to peers drafted in the same round"
              tooltip="Round Value: Expected NFL impact relative to other players drafted in the same round. Measures draft slot efficiency."
            />
            <PercentileBar
              label="Contract Surplus"
              value={surplusPercentileDisplay}
              color="var(--color-primary)"
              sub="Modelled career value relative to rookie contract cost"
              tooltip="Contract Surplus Percentile: How this player's value-over-cost ranks among all 2026 prospects. Higher = better bargain."
            />

            {/* Tier context */}
            <div
              className="rounded-lg p-4 border"
              style={{ backgroundColor: `${tierHex}10`, borderColor: `${tierHex}30` }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4" style={{ color: tierHex }} />
                <span className="text-xs" style={{ fontWeight: 700, color: tierHex, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {player.tier} Tier
                </span>
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                {player.tier === 'High Upside' && 'Sleeper Score above 75 — elite projection relative to draft position. High priority target.'}
                {player.tier === 'Safe Floor' && 'Solid sleeper score with a positive contract surplus. Safe value pick with reliable upside.'}
                {player.tier === 'Boom or Bust' && 'Good sleeper score but contract surplus is below average. High variance outcome.'}
                {player.tier === 'Developmental' && 'Moderate sleeper score. May need time to develop — potential late-round sleeper.'}
                {player.tier === 'Overdrafted' && 'Sleeper score suggests the player is being drafted ahead of their projected value.'}
              </p>
            </div>

            {/* Model confidence */}
            {confidence && (
              <div className="p-3 bg-secondary/60 rounded-lg border border-border/50 flex items-start gap-2">
                <Award className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <p className="text-muted-foreground text-xs leading-relaxed">{confidence}</p>
              </div>
            )}
          </div>
        </Section>

        {/* ───────────────────────────────────────────────────────────────
            SECTION 3 (bottom-left): Position Profile Radar
        ─────────────────────────────────────────────────────────────── */}
        <Section
          title={`${player.position} Profile — vs. Position Group Average`}
          titleExtra={<MetricGlossaryTooltip glossaryKey={player.position} />}
        >
          {radarData.length > 0 ? (
            <div>
              <p className="text-muted-foreground text-xs mb-3">
                Percentile rank within <strong>{player.position}</strong> group · grey ring = position average (50th)
              </p>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                  <PolarGrid stroke="var(--color-border)" />
                  <PolarAngleAxis
                    dataKey="metric"
                    tick={{ fill: 'var(--color-muted-foreground)', fontSize: 11, fontWeight: 600 }}
                  />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar
                    name={player.name}
                    dataKey="player"
                    stroke={scoreColor}
                    fill={scoreColor}
                    fillOpacity={0.25}
                    strokeWidth={2}
                  />
                  <Radar
                    name={`${player.position} Avg`}
                    dataKey="posAvg"
                    stroke="#475569"
                    fill="#475569"
                    fillOpacity={0.15}
                    strokeWidth={1.5}
                    strokeDasharray="4 2"
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', color: 'var(--color-muted-foreground)', paddingTop: '8px' }} />
                  <RechartsTooltip
                    contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-foreground)', fontSize: '12px' }}
                    formatter={(value: number, name: string) => [`${value}th percentile`, name]}
                  />
                </RadarChart>
              </ResponsiveContainer>

              {/* Per-axis breakdown mini-grid */}
              <div className="grid grid-cols-3 gap-2 mt-2 pt-3 border-t border-border">
                {radarData.map(({ metric, player: val }) => {
                  const c = val >= 75 ? 'var(--color-success)' : val >= 50 ? '#60a5fa' : val >= 35 ? '#facc15' : 'var(--color-destructive)';
                  return (
                    <div key={metric} className="bg-secondary/60 rounded-lg p-2 text-center">
                      <div className="text-muted-foreground text-xs truncate mb-0.5" title={metric}>{metric}</div>
                      <div className="text-sm tabular-nums" style={{ fontWeight: 800, color: c }}>{val}{ordinalSuffix(val)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-muted-foreground">
              <AlertCircle className="w-5 h-5 mr-2" />
              <span>No profile data available</span>
            </div>
          )}
        </Section>

        {/* ───────────────────────────────────────────────────────────────
            SECTION 4 (bottom-right): Physical & Combine Profile
        ─────────────────────────────────────────────────────────────── */}
        <Section title="Physical & Combine Profile">
          <div className="space-y-5">

            {/* Physical measurements */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-secondary rounded-lg p-3 text-center">
                <div className="text-muted-foreground text-xs mb-1" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Height
                </div>
                <div className="text-foreground text-lg" style={{ fontWeight: 800 }}>
                  {player.height ? formatHeight(player.height) : '—'}
                </div>
              </div>
              <div className="bg-secondary rounded-lg p-3 text-center">
                <div className="text-muted-foreground text-xs mb-1" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Weight
                </div>
                <div className="text-foreground text-lg" style={{ fontWeight: 800 }}>
                  {player.weight ? `${player.weight} lbs` : '—'}
                </div>
              </div>
            </div>

            {/* Combine results */}
            {Object.values(player.combine).some(v => v != null) ? (
              <div>
                <div className="text-xs text-muted-foreground mb-2" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Combine Results
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <CombineCell label="40-Yard Dash" val={player.combine.fortyYard} unit="s" />
                  <CombineCell label="Vertical Jump" val={player.combine.vertical} unit={'"'} />
                  <CombineCell label="Broad Jump" val={player.combine.broadJump} unit={'"'} />
                  <CombineCell label="3-Cone Drill" val={player.combine.threeCone} unit="s" />
                  <CombineCell label="Short Shuttle" val={player.combine.shuttle} unit="s" />
                  <CombineCell label="Bench Press" val={player.combine.benchPress} unit=" reps" />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>No combine measurements recorded</span>
              </div>
            )}

            {/* Athletic scores (composite z-score percentiles) */}
            <div>
              <div className="text-xs text-muted-foreground mb-3" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Athletic Scores <span className="normal-case font-normal">(0–100 vs. all skill positions)</span>
              </div>
              <div className="grid grid-cols-2 gap-x-5 gap-y-3">
                <AthleticScoreBar label="Speed Score" value={player.athleticRadar.speed}
                  tooltip="Speed Score: Combines 40-yard dash time and body weight into a single explosiveness metric. 75+ = elite."
                />
                <AthleticScoreBar label="Burst Score" value={player.athleticRadar.burst}
                  tooltip="Burst Score: Composite of vertical and broad jump. Measures explosive first-step and lower-body power."
                />
                <AthleticScoreBar label="Agility" value={player.athleticRadar.agility}
                  tooltip="Agility: Derived from the 3-cone drill and short shuttle. Reflects change-of-direction quickness."
                />
                <AthleticScoreBar label="Power (Bench)" value={player.athleticRadar.power}
                  tooltip="Power: Based on bench press reps. Measures upper-body strength relevant to blocking engagement and contact balance."
                />
                <AthleticScoreBar label="Frame (BMI)" value={player.athleticRadar.frame}
                  tooltip="Frame: Derived from height-to-weight ratio (BMI). Higher = bigger frame for the position, which affects durability and contact balance."
                />
                <AthleticScoreBar label="Stature" value={player.athleticRadar.stature}
                  tooltip="Stature: Raw height percentile vs. all skill position prospects. Important for jump-ball situations and contested catches."
                />
              </div>
              <p className="text-muted-foreground text-xs mt-3">
                Scores scaled from combine Z-scores. 50 = average among all skill prospects. 75+ = elite.
              </p>
            </div>
          </div>
        </Section>

      </div>
    </div>
  );
}
