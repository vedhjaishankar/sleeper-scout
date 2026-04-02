import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Legend, Tooltip as RechartsTooltip,
} from 'recharts';
import { Users, ArrowLeft, Trophy, Minus, User, Loader2, ExternalLink } from 'lucide-react';
import {
  fetchPlayers, Player, formatHeight, formatMoney, getScoreColor, getTierColors,
} from '../data/players';
import { FilterDropdown } from '../components/ui/filter-dropdown';
import { MetricGlossaryTooltip } from '../components/ui/metric-glossary';
import { Tooltip, TooltipContent, TooltipTrigger } from '../components/ui/tooltip';

// ─── Constants ────────────────────────────────────────────────────────────────

const P1_COLOR = 'var(--color-success)' as const;
const P2_COLOR = 'var(--color-primary)' as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

type WinnerKey = 'player1' | 'player2' | 'tie';

function winnerOf(v1: number, v2: number, higherIsBetter = true, threshold = 1.5): WinnerKey {
  const diff = higherIsBetter ? v1 - v2 : v2 - v1;
  if (diff > threshold) return 'player1';
  if (diff < -threshold) return 'player2';
  return 'tie';
}

function signedMoney(usd: number) {
  return `${usd >= 0 ? '+' : '−'}${formatMoney(Math.abs(usd))}`;
}

function ordinalSuffix(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return 'th';
  switch (n % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

// ─── PlayerSelect ─────────────────────────────────────────────────────────────

function PlayerSelect({
  value, onChange, excludeId, label, accentColor, playersList,
}: {
  value: string; onChange: (id: string) => void;
  excludeId: string; label: string; accentColor: string; playersList: Player[];
}) {
  const options = [
    { label: '— Select a player —', value: '' },
    ...playersList
      .filter(p => p.id !== excludeId)
      .sort((a, b) => b.sleeperScore - a.sleeperScore)
      .map(p => ({
        label: p.name,
        value: p.id,
        description: `${p.position} · Rd ${p.draftRound} Pick ${p.draftPick} · Score: ${p.sleeperScore}`,
      })),
  ];
  return (
    <div className="flex-1 w-full" style={{ '--form-accent': accentColor, '--primary': accentColor } as React.CSSProperties}>
      <FilterDropdown
        label={label}
        icon={<User className="h-5 w-5" style={{ color: accentColor }} />}
        value={value}
        options={options}
        onChange={onChange}
        accentColor={accentColor}
        colorAllOptions={label === 'Player 1'}
      />
    </div>
  );
}

// ─── ProfileCard ──────────────────────────────────────────────────────────────

function ProfileCard({
  player, opponent, color, isWinner, onNavigate,
}: {
  player: Player; opponent?: Player; color: string;
  isWinner?: boolean; onNavigate: () => void;
}) {
  const { bg, text, border } = getTierColors(player.tier);
  const scoreColor = getScoreColor(player.sleeperScore);

  /** Highlight this player's value if it wins the head-to-head. */
  const winColor = (val: number, oppVal: number | undefined, higherIsBetter = true) => {
    if (oppVal === undefined) return color;
    return winnerOf(val, oppVal, higherIsBetter, 0) === 'player1' ? color : 'var(--color-muted-foreground)';
  };

  return (
    <div
      className="bg-card border rounded-xl p-5 relative overflow-hidden transition-all duration-300 flex flex-col"
      style={{
        borderTopColor: color,
        borderTopWidth: 3,
        borderColor: isWinner ? color : 'var(--color-border)',
        boxShadow: isWinner ? `0 0 28px -6px ${color}55` : undefined,
      }}
    >
      {/* Winner badge */}
      {isWinner && (
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 py-1 px-4 flex items-center gap-1.5 rounded-b-lg shadow-sm"
          style={{ backgroundColor: color, color: 'var(--color-background)' }}
        >
          <Trophy className="w-3 h-3" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Winner</span>
        </div>
      )}

      {/* Header row */}
      <div className="flex items-start gap-3 mb-4">
        {/* Score bubble */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0 cursor-help"
              style={{ background: `${scoreColor}18`, border: `2px solid ${scoreColor}40` }}
            >
              <div style={{ color: scoreColor, fontWeight: 900, fontSize: '1.4rem', lineHeight: 1 }}>{player.sleeperScore}</div>
              <div className="text-[9px] mt-0.5" style={{ color: scoreColor, opacity: 0.7, fontWeight: 600 }}>SCORE</div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p className="text-xs font-medium">Sleeper Score: Composite 0–100 rating from college production, athletic testing, and physical traits. 80+ = elite.</p>
          </TooltipContent>
        </Tooltip>

        <div className="flex-1 min-w-0">
          <div className="text-lg leading-tight truncate" style={{ fontWeight: 800, color }}>{player.name}</div>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="bg-secondary text-xs px-1.5 py-0.5 rounded" style={{ fontWeight: 700, color }}>{player.position}</span>
            <span className="text-muted-foreground text-xs truncate">{player.college}</span>
          </div>
          <div className="text-muted-foreground text-xs mt-0.5">
            Rd {player.draftRound} / #{player.draftPick} · {formatHeight(player.height)} · {player.weight} lbs
          </div>
        </div>
      </div>

      {/* Tier badge */}
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`inline-flex items-center self-start px-2.5 py-0.5 rounded-lg text-xs ${bg} ${text} border ${border} mb-4 cursor-help`} style={{ fontWeight: 700 }}>
            {player.tier}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs font-medium">
            {player.tier === 'High Upside'   && 'Score ≥ 75 — elite projection relative to draft slot. High-priority target.'}
            {player.tier === 'Safe Floor'    && 'Solid score with positive contract surplus. Reliable, lower-risk value pick.'}
            {player.tier === 'Boom or Bust'  && 'Good score but surplus is below average — high-variance outcome.'}
            {player.tier === 'Developmental' && 'Moderate score. Needs development time — potential late-round sleeper.'}
            {player.tier === 'Overdrafted'   && 'Being drafted ahead of projected model value. Proceed with caution.'}
          </p>
        </TooltipContent>
      </Tooltip>

      {/* Contract metrics 2×2 */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {([
          {
            label: 'Perf. Value',
            value: formatMoney(player.performanceValue),
            color: winColor(player.performanceValue, opponent?.performanceValue),
            sub: 'projected career',
            tooltip: 'Performance Value: Model-estimated NFL career value expressed in contract dollars.',
          },
          {
            label: 'Contract Cost',
            value: formatMoney(player.contractCost),
            color: winColor(player.contractCost, opponent?.contractCost, false),
            sub: 'rookie deal',
            tooltip: 'Contract Cost: Expected rookie contract value based on projected draft slot. Lower is better.',
          },
          {
            label: 'Contract Surplus',
            value: signedMoney(player.contractSurplus),
            color: player.contractSurplus >= 0 ? 'var(--color-success)' : 'var(--color-destructive)',
            sub: player.contractSurplus >= 0 ? 'potential steal' : 'high-cost pick',
            tooltip: 'Contract Surplus: Performance Value minus Contract Cost. Positive = potential bargain relative to their rookie deal.',
          },
          {
            label: 'Surplus Rank',
            value: `${Math.round(player.contractSurplusPercentile * 100)}${ordinalSuffix(Math.round(player.contractSurplusPercentile * 100))}`,
            color: winColor(player.contractSurplusPercentile, opponent?.contractSurplusPercentile),
            sub: 'percentile rank',
            tooltip: 'Surplus Rank: Contract Surplus percentile vs. all 2026 prospects. Higher = better value relative to draft cost.',
          },
        ] as Array<{ label: string; value: string; color: string; sub: string; tooltip: string }>).map(m => (
          <Tooltip key={m.label}>
            <TooltipTrigger asChild>
              <div className="bg-secondary rounded-lg p-2.5 text-center cursor-help">
                <div className="text-muted-foreground text-[10px] mb-1" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                  {m.label}
                </div>
                <div className="text-sm tabular-nums" style={{ fontWeight: 800, color: m.color }}>{m.value}</div>
                <div className="text-muted-foreground text-[10px] mt-0.5">{m.sub}</div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs font-medium">{m.tooltip}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>

      {/* Draft window label */}
      {player.draftWindowLabel && (
        <div className="bg-secondary/40 rounded-lg px-3 py-2 border border-border/40 mb-3">
          <p className="text-muted-foreground text-xs italic">"{player.draftWindowLabel}"</p>
        </div>
      )}

      {/* Navigate to full profile */}
      <button
        onClick={onNavigate}
        className="mt-auto flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-secondary/60 border border-border/60 text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-all text-xs"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        View Full Profile
      </button>
    </div>
  );
}

// ─── Head-to-Head table ───────────────────────────────────────────────────────

type TableRow =
  | { kind: 'divider'; label: string }
  | { kind: 'row'; label: string; v1: string; v2: string; winner: WinnerKey; tooltip?: string };

function H2HRow({
  row, p1Color, p2Color,
}: { row: Extract<TableRow, { kind: 'row' }>; p1Color: string; p2Color: string }) {
  // Wraps content in a Tooltip only when tooltip text is provided
  const tip = (children: React.ReactNode) =>
    row.tooltip ? (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help">{children}</span>
        </TooltipTrigger>
        <TooltipContent side="top"><p className="text-xs font-medium">{row.tooltip}</p></TooltipContent>
      </Tooltip>
    ) : <>{children}</>;

  return (
    <tr className="border-b border-border/40">
      <td className="py-2.5 px-4 text-right w-[38%]">
        {tip(
          <span className="text-sm tabular-nums" style={{
            fontWeight: row.winner === 'player1' ? 800 : 500,
            color: row.winner === 'player1' ? p1Color : '#64748b',
          }}>
            {row.v1}
            {row.winner === 'player1' && <Trophy className="inline w-3 h-3 ml-1" style={{ color: p1Color }} />}
          </span>
        )}
      </td>
      <td className="py-2.5 px-2 text-center w-[24%]">
        {tip(
          <span className="text-muted-foreground text-[10px]" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            {row.label}
          </span>
        )}
      </td>
      <td className="py-2.5 px-4 text-left w-[38%]">
        {tip(
          <span className="text-sm tabular-nums" style={{
            fontWeight: row.winner === 'player2' ? 800 : 500,
            color: row.winner === 'player2' ? p2Color : '#64748b',
          }}>
            {row.winner === 'player2' && <Trophy className="inline w-3 h-3 mr-1" style={{ color: p2Color }} />}
            {row.v2}
          </span>
        )}
      </td>
    </tr>
  );
}

function DividerRow({ label }: { label: string }) {
  return (
    <tr>
      <td colSpan={3} className="px-4 py-1.5">
        <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold border-b border-border/60 pb-1 text-center">
          {label}
        </div>
      </td>
    </tr>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CompareView() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [playersList, setPlayersList] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [p1Id, setP1Id] = useState(searchParams.get('p1') || '');
  const [p2Id, setP2Id] = useState(searchParams.get('p2') || '');

  useEffect(() => {
    fetchPlayers().then(data => { setPlayersList(data); setLoading(false); });
  }, []);

  const p1 = playersList.find(p => p.id === p1Id) || null;
  const p2 = playersList.find(p => p.id === p2Id) || null;

  // Adaptive radar: same position → productionRadar, cross-position → universalRadar
  const { radarData, radarLabel, isCrossPosition } = useMemo(() => {
    if (!p1 || !p2) return { radarData: [], radarLabel: '', isCrossPosition: false };
    const samePos = p1.position === p2.position;
    const s1 = samePos ? p1.productionRadar : p1.universalRadar;
    const s2 = samePos ? p2.productionRadar : p2.universalRadar;
    return {
      radarData: Object.keys(s1).map(metric => ({
        metric,
        [p1.name]: s1[metric] ?? 0,
        [p2.name]: s2[metric] ?? 0,
      })),
      radarLabel: samePos ? `${p1.position} Position Profile` : 'Universal Sleeper Profile',
      isCrossPosition: !samePos,
    };
  }, [p1, p2]);

  // Build H2H table rows
  const { tableRows, matchResult } = useMemo(() => {
    if (!p1 || !p2) return { tableRows: [], matchResult: null };

    const row = (
      label: string, v1: string, v2: string,
      n1: number, n2: number, higherIsBetter = true, threshold = 1.5, tooltip?: string,
    ): Extract<TableRow, { kind: 'row' }> => ({
      kind: 'row', label, v1, v2, tooltip,
      winner: winnerOf(n1, n2, higherIsBetter, threshold),
    });

    const upsidePct1 = Math.round(p1.upsidePercentile * 100);
    const upsidePct2 = Math.round(p2.upsidePercentile * 100);
    const rvPct1 = Math.round(p1.roundValuePercentile * 100);
    const rvPct2 = Math.round(p2.roundValuePercentile * 100);
    const surplusPct1 = Math.round(p1.contractSurplusPercentile * 100);
    const surplusPct2 = Math.round(p2.contractSurplusPercentile * 100);

    const rows: TableRow[] = [
      { kind: 'divider', label: 'Model Projections' },
      row('Sleeper Score', String(p1.sleeperScore), String(p2.sleeperScore), p1.sleeperScore, p2.sleeperScore, true, 2,
        'Sleeper Score: Composite 0–100 rating combining college production, athletic testing, and physical traits.'),
      row('Perf. Value', formatMoney(p1.performanceValue), formatMoney(p2.performanceValue), p1.performanceValue, p2.performanceValue, true, 0,
        'Performance Value: Model-estimated NFL career value expressed in contract dollars. Higher is better.'),
      row('Contract Cost', formatMoney(p1.contractCost), formatMoney(p2.contractCost), p1.contractCost, p2.contractCost, false, 0,
        'Contract Cost: Expected rookie contract value based on projected draft slot. Lower = cheaper relative to value.'),
      row('Contract Surplus', signedMoney(p1.contractSurplus), signedMoney(p2.contractSurplus), p1.contractSurplus, p2.contractSurplus, true, 0,
        'Contract Surplus: Performance Value minus Contract Cost. Positive = potential bargain; negative = potential overpay.'),

      { kind: 'divider', label: 'Draft Analysis' },
      row(
        'Upside Rank',
        `${upsidePct1}${ordinalSuffix(upsidePct1)} Percentile`,
        `${upsidePct2}${ordinalSuffix(upsidePct2)} Percentile`,
        p1.upsidePercentile, p2.upsidePercentile, true, 0.02,
        'Career Upside: Probability of becoming a high-end NFL contributor, ranked vs. all 2026 skill prospects.',
      ),
      row(
        'Round Value Rank',
        `${rvPct1}${ordinalSuffix(rvPct1)} Percentile`,
        `${rvPct2}${ordinalSuffix(rvPct2)} Percentile`,
        p1.roundValuePercentile, p2.roundValuePercentile, true, 0.02,
        'Round Value: Expected NFL impact relative to peers drafted in the same round. Measures draft slot efficiency.',
      ),
      row(
        'Surplus Rank',
        `${surplusPct1}${ordinalSuffix(surplusPct1)} percentile`,
        `${surplusPct2}${ordinalSuffix(surplusPct2)} percentile`,
        p1.contractSurplusPercentile, p2.contractSurplusPercentile, true, 0.02,
        'Surplus Rank: Contract Surplus percentile vs. all 2026 prospects. Higher = better bargain for the draft cost.',
      ),
      row('Proj. Pick', `#${p1.draftPick} Rd ${p1.draftRound}`, `#${p2.draftPick} Rd ${p2.draftRound}`, p1.draftPick, p2.draftPick, false, 1.5,
        'Projected Pick: Consensus projected draft position and round. Lower pick number = drafted earlier.'),
    ];

    // Combine rows — only show if at least one player has data
    const hasCombine =
      Object.values(p1.combine).some(v => v != null) ||
      Object.values(p2.combine).some(v => v != null);

    if (hasCombine) {
      rows.push({ kind: 'divider', label: 'Athletic Testing' });

      const combineFields: Array<{ label: string; key: keyof typeof p1.combine; unit: string; lower?: boolean; tooltip: string }> = [
        { label: '40-Yard Dash', key: 'fortyYard', unit: 's', lower: true, tooltip: '40-Yard Dash: Measures straight-line speed. Lower time = faster. Elite skill players typically run sub-4.45s.' },
        { label: 'Vertical Jump', key: 'vertical', unit: '"', tooltip: 'Vertical Jump: Measures lower-body explosion and jumping ability. Higher = more explosive.' },
        { label: 'Broad Jump', key: 'broadJump', unit: '"', tooltip: 'Broad Jump: Measures horizontal explosion and lower-body power output. Higher = more explosive.' },
        { label: '3-Cone Drill', key: 'threeCone', unit: 's', lower: true, tooltip: '3-Cone Drill: Measures change-of-direction agility and body control. Lower time = more agile.' },
        { label: 'Short Shuttle', key: 'shuttle', unit: 's', lower: true, tooltip: 'Short Shuttle (5-10-5): Measures lateral quickness and acceleration. Lower time = faster.' },
        { label: 'Bench Press', key: 'benchPress', unit: ' reps', tooltip: 'Bench Press: Reps of 225 lbs. Measures upper-body strength and endurance.' },
      ];

      for (const { label, key, unit, lower, tooltip } of combineFields) {
        const v1 = p1.combine[key];
        const v2 = p2.combine[key];
        if (v1 != null || v2 != null) {
          const s1 = v1 != null ? `${v1}${unit}` : '—';
          const s2 = v2 != null ? `${v2}${unit}` : '—';
          const n1 = v1 ?? (lower ? 999 : 0);
          const n2 = v2 ?? (lower ? 999 : 0);
          rows.push({ kind: 'row', label, v1: s1, v2: s2, winner: winnerOf(n1, n2, !lower), tooltip });
        }
      }
    }

    // Tally wins
    const dataRows = rows.filter((r): r is Extract<TableRow, { kind: 'row' }> => r.kind === 'row');
    const p1Wins = dataRows.filter(r => r.winner === 'player1').length;
    const p2Wins = dataRows.filter(r => r.winner === 'player2').length;
    const ties = dataRows.filter(r => r.winner === 'tie').length;
    const overallWinner = p1Wins > p2Wins ? p1 : p2Wins > p1Wins ? p2 : null;
    const overallColor = p1Wins > p2Wins ? P1_COLOR : P2_COLOR;

    return { tableRows: rows, matchResult: { p1Wins, p2Wins, ties, overallWinner, overallColor } };
  }, [p1, p2]);

  // Radar breakdown (per-axis wins)
  const radarBreakdown = useMemo(() => {
    if (!p1 || !p2 || radarData.length === 0) return [];
    return radarData.map(d => ({
      metric: d.metric as string,
      v1: d[p1.name] as number,
      v2: d[p2.name] as number,
      winner: winnerOf(d[p1.name] as number, d[p2.name] as number, true, 3),
    }));
  }, [p1, p2, radarData]);

  return (
    <div className="min-h-full bg-background p-6">

      {/* Nav bar */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => navigate('/')}
          className="group flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4 group-hover:text-foreground transition-colors" />
          Dashboard
        </button>
        <span className="text-muted-foreground">/</span>
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4" style={{ color: 'var(--foreground)' }} />
          <span className="text-foreground text-sm" style={{ fontWeight: 600 }}>Compare Players</span>
        </div>
      </div>

      <h1 className="text-foreground text-2xl mb-1" style={{ fontWeight: 700 }}>Player Comparison</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Compare two prospects side-by-side — contract value, position profile, and head-to-head metrics.
      </p>

      {/* ── Player selectors ── */}
      <div className="bg-card border border-border rounded-xl p-5 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <PlayerSelect value={p1Id} onChange={setP1Id} excludeId={p2Id} label="Player 1" accentColor={P1_COLOR} playersList={playersList} />
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary border border-border flex-shrink-0">
            <span className="text-muted-foreground text-xs" style={{ fontWeight: 700 }}>vs</span>
          </div>
          <PlayerSelect value={p2Id} onChange={setP2Id} excludeId={p1Id} label="Player 2" accentColor={P2_COLOR} playersList={playersList} />
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-success animate-spin mb-4" />
          <p className="text-muted-foreground">Loading draft prospects...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && (!p1 || !p2) && (
        <div className="bg-card border border-border rounded-xl p-16 text-center">
          <Users className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--foreground)' }} />
          <p className="text-foreground text-lg" style={{ fontWeight: 600 }}>Select two players to compare</p>
          <p className="text-muted-foreground text-sm mt-2">Use the dropdowns above to choose two prospects.</p>
        </div>
      )}

      {/* ── 2×2 Comparison grid ── */}
      {!loading && p1 && p2 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* ─── TOP-LEFT: Player 1 Card ─── */}
          <ProfileCard
            player={p1}
            opponent={p2}
            color={P1_COLOR}
            isWinner={matchResult?.overallWinner === p1}
            onNavigate={() => navigate(`/player/${p1.id}`)}
          />

          {/* ─── TOP-RIGHT: Player 2 Card ─── */}
          <ProfileCard
            player={p2}
            opponent={p1}
            color={P2_COLOR}
            isWinner={matchResult?.overallWinner === p2}
            onNavigate={() => navigate(`/player/${p2.id}`)}
          />

          {/* ─── BOTTOM-LEFT: Head-to-Head Table ─── */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Verdict banner */}
            {matchResult && (
              <div className="px-5 py-4 border-b border-border flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="text-muted-foreground text-[10px] uppercase tracking-widest mb-1" style={{ fontWeight: 600 }}>
                    Head-to-Head
                  </div>
                  {/* Win tally */}
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-xl tabular-nums" style={{ color: P1_COLOR, fontWeight: 800 }}>{matchResult.p1Wins}</div>
                      <div className="text-[10px] text-muted-foreground">{p1.name.split(' ').at(-1)} wins</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl tabular-nums text-muted-foreground" style={{ fontWeight: 800 }}>{matchResult.ties}</div>
                      <div className="text-[10px] text-muted-foreground">Ties</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl tabular-nums" style={{ color: P2_COLOR, fontWeight: 800 }}>{matchResult.p2Wins}</div>
                      <div className="text-[10px] text-muted-foreground">{p2.name.split(' ').at(-1)} wins</div>
                    </div>
                  </div>
                </div>

                {/* Overall winner */}
                {matchResult.overallWinner ? (
                  <div
                    className="flex items-center gap-2.5 bg-secondary/80 border-2 rounded-xl px-3 py-2"
                    style={{ borderColor: matchResult.overallColor }}
                  >
                    <Trophy className="w-5 h-5 flex-shrink-0" style={{ color: matchResult.overallColor }} />
                    <div>
                      <div className="text-[9px] text-muted-foreground uppercase tracking-widest" style={{ fontWeight: 800 }}>Overall Winner</div>
                      <div className="text-sm leading-tight" style={{ color: matchResult.overallColor, fontWeight: 900 }}>
                        {matchResult.overallWinner.name}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2">
                    <Minus className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground text-xs" style={{ fontWeight: 700 }}>Too close to call</span>
                  </div>
                )}
              </div>
            )}

            {/* Column labels + rows — all in one table so widths align */}
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="py-2 px-4 text-right w-[38%] font-normal">
                    <span style={{ color: P1_COLOR, fontWeight: 700, fontSize: '12px' }}>{p1.name}</span>
                  </th>
                  <th className="py-2 px-2 text-center w-[24%] font-normal">
                    <span className="text-muted-foreground text-[10px]" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                      Category
                    </span>
                  </th>
                  <th className="py-2 px-4 text-left w-[38%] font-normal">
                    <span style={{ color: P2_COLOR, fontWeight: 700, fontSize: '12px' }}>{p2.name}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, i) =>
                  row.kind === 'divider'
                    ? <DividerRow key={i} label={row.label} />
                    : <H2HRow key={i} row={row} p1Color={P1_COLOR} p2Color={P2_COLOR} />
                )}
              </tbody>
            </table>
          </div>

          {/* ─── BOTTOM-RIGHT: Radar Overlay ─── */}
          <div className="bg-card border border-border rounded-xl p-5">
            {/* Section header */}
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <h3 className="text-muted-foreground text-xs uppercase tracking-widest" style={{ fontWeight: 600 }}>
                  {radarLabel} — Overlay
                </h3>
                <MetricGlossaryTooltip
                  glossaryKey={isCrossPosition ? 'UNIVERSAL' : p1.position}
                  side="bottom"
                />
              </div>
              {isCrossPosition && (
                <span className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded border border-border" style={{ fontWeight: 500 }}>
                  Cross-position · percentile vs. all skill positions
                </span>
              )}
            </div>

            {!isCrossPosition && (
              <p className="text-muted-foreground text-xs mb-3">
                Percentile rank within <strong>{p1.position}</strong> group · 50 = position average
              </p>
            )}

            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                <PolarGrid stroke="var(--color-border)" />
                <PolarAngleAxis
                  dataKey="metric"
                  tick={{ fill: 'var(--color-muted-foreground)', fontSize: 11, fontWeight: 600 }}
                />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name={p1.name} dataKey={p1.name} stroke={P1_COLOR} fill={P1_COLOR} fillOpacity={0.2} strokeWidth={2} />
                <Radar name={p2.name} dataKey={p2.name} stroke={P2_COLOR} fill={P2_COLOR} fillOpacity={0.2} strokeWidth={2} />
                <Legend wrapperStyle={{ fontSize: '12px', color: 'var(--color-muted-foreground)', paddingTop: '8px' }} />
                <RechartsTooltip
                  contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-foreground)', fontSize: '12px' }}
                  formatter={(value: number) => [`${value}`, '']}
                />
              </RadarChart>
            </ResponsiveContainer>

            {/* Per-axis breakdown — mini H2H table */}
            <div className="border-t border-border mt-2 pt-3">
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold text-center mb-2">
                Axis Breakdown
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/40 bg-secondary/20">
                    <th className="py-1.5 px-3 text-right w-[38%] font-normal">
                      <span className="text-[10px]" style={{ color: P1_COLOR, fontWeight: 700 }}>{p1.name.split(' ').at(-1)}</span>
                    </th>
                    <th className="py-1.5 px-2 text-center w-[24%] font-normal">
                      <span className="text-muted-foreground text-[10px]">Metric</span>
                    </th>
                    <th className="py-1.5 px-3 text-left w-[38%] font-normal">
                      <span className="text-[10px]" style={{ color: P2_COLOR, fontWeight: 700 }}>{p2.name.split(' ').at(-1)}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {radarBreakdown.map(({ metric, v1, v2, winner }) => (
                    <tr key={metric} className="border-b border-border/30 last:border-0">
                      <td className="py-1.5 px-3 text-right">
                        <span className="text-xs tabular-nums" style={{
                          fontWeight: winner === 'player1' ? 800 : 400,
                          color: winner === 'player1' ? P1_COLOR : '#64748b',
                        }}>
                          {v1}
                          {winner === 'player1' && <Trophy className="inline w-2.5 h-2.5 ml-1" style={{ color: P1_COLOR }} />}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        <span className="text-[10px] text-muted-foreground" style={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                          {metric}
                        </span>
                      </td>
                      <td className="py-1.5 px-3 text-left">
                        <span className="text-xs tabular-nums" style={{
                          fontWeight: winner === 'player2' ? 800 : 400,
                          color: winner === 'player2' ? P2_COLOR : '#64748b',
                        }}>
                          {winner === 'player2' && <Trophy className="inline w-2.5 h-2.5 mr-1" style={{ color: P2_COLOR }} />}
                          {v2}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Profile Edges — which metrics each player leads on */}
            {radarBreakdown.length > 0 && (() => {
              const p1Edges = radarBreakdown.filter(r => r.winner === 'player1').map(r => r.metric);
              const p2Edges = radarBreakdown.filter(r => r.winner === 'player2').map(r => r.metric);
              const ties = radarBreakdown.filter(r => r.winner === 'tie').map(r => r.metric);
              return (
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="rounded-lg p-3 border" style={{ borderColor: `${P1_COLOR}30`, background: `${P1_COLOR}08` }}>
                    <div className="text-[10px] mb-1.5" style={{ color: P1_COLOR, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {p1.name.split(' ').at(-1)} leads
                    </div>
                    {p1Edges.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {p1Edges.map(m => (
                          <span key={m} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: `${P1_COLOR}20`, color: P1_COLOR, fontWeight: 600 }}>
                            {m}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">No clear edges</span>
                    )}
                  </div>
                  <div className="rounded-lg p-3 border" style={{ borderColor: `${P2_COLOR}30`, background: `${P2_COLOR}08` }}>
                    <div className="text-[10px] mb-1.5" style={{ color: P2_COLOR, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {p2.name.split(' ').at(-1)} leads
                    </div>
                    {p2Edges.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {p2Edges.map(m => (
                          <span key={m} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: `${P2_COLOR}20`, color: P2_COLOR, fontWeight: 600 }}>
                            {m}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">No clear edges</span>
                    )}
                  </div>
                  {ties.length > 0 && (
                    <div className="col-span-2 rounded-lg p-2 bg-secondary/50 border border-border/40 flex items-center gap-2">
                      <Minus className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-[10px] text-muted-foreground">
                        <span style={{ fontWeight: 600 }}>Even:</span> {ties.join(' · ')}
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

        </div>
      )}
    </div>
  );
}
