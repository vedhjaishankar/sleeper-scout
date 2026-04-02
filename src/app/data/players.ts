export type Position = 'QB' | 'RB' | 'WR' | 'TE' | 'G' | 'DT' | 'LB' | 'CB';
export type TierLabel = 'High Upside' | 'Safe Floor' | 'Boom or Bust' | 'Developmental' | 'Overdrafted';

/** Raw college production and athletic figures from the CSV. */
export interface ProductionStats {
  // Passing (QB, and partially WR/TE)
  completionPct?: number;
  yardsPerAttempt?: number;
  tdIntRatio?: number;
  passYards?: number;
  rushYards?: number;        // career college rush yards
  // Receiving (WR, TE)
  dominatorRating?: number;
  yardsPerReception?: number;
  recTdRate?: number;
  // Running (RB)
  yardsPerCarry?: number;
  receptionRate?: number;    // receptions per carry attempt
  rushTdRate?: number;
  yardsFromScrimmage?: number;
}

export interface Player {
  id: string;
  name: string;
  position: Position;
  college: string;
  draftRound: number;
  draftPick: number;         // projected pick
  projectedPick: number;     // same as draftPick for 2026 class
  sleeperScore: number;

  // Primary contract metrics (USD)
  contractCost: number;
  performanceValue: number;
  contractSurplus: number;

  // Percentile rankings (0–1)
  contractSurplusPercentile: number;
  upsidePercentile: number;
  roundValuePercentile: number;

  // Human-readable label from the model
  draftWindowLabel: string;

  // Legacy / derived
  surplusValue: number;
  breakoutProbability: number;
  availabilityFactor: number;

  tier: TierLabel;
  height: number;
  weight: number;
  combine: {
    fortyYard?: number;
    vertical?: number;
    broadJump?: number;
    threeCone?: number;
    shuttle?: number;
    benchPress?: number;
  };
  athleticRadar: {
    speed: number;
    burst: number;
    agility: number;
    power: number;
    frame: number;
    stature: number;
  };
  /** Raw production figures (used to compute productionRadar). */
  productionStats: ProductionStats;
  /**
   * Percentile rank (0–100) of each production metric within the player's
   * position group. posAvg = 50 by definition, so the chart baseline is correct.
   * Axes differ by position:
   *  QB  → Completion%, Yds/Att, TD Efficiency, Mobility, Athleticism, Upside
   *  WR  → Dominance, Yds/Reception, TD Rate, Speed, Burst, Agility
   *  TE  → Dominance, Yds/Reception, TD Rate, Speed, Frame, Power
   *  RB  → Yds/Carry, Receiving, TD Rate, Volume, Speed, Burst
   */
  productionRadar: Record<string, number>;
  /**
   * Cross-position universal radar (0–100) for comparing players at different
   * positions. Uses model-level percentiles that are already standardised
   * across all skill players: Sleeper Score, Contract Surplus %, Upside %,
   * Round Value %, Speed, Burst.
   */
  universalRadar: Record<string, number>;
  featureImportance: {
    draftCapital: number;
    agility: number;
    collegeProduction: number;
    athleticism: number;
    size: number;
  };
}

// ─── Metadata ────────────────────────────────────────────────────────────────

export const modelConfidence: Record<string, string> = {
  QB: 'Correctly ranks about 6 in 10 QBs by career trajectory',
  RB: 'Correctly ranks about 7 in 10 RBs by career trajectory',
  WR: 'Correctly ranks about 7 in 10 WRs by career trajectory',
  TE: 'Correctly ranks about 6 in 10 TEs by career trajectory',
};

export const positionAvgRadar: Record<string, Record<string, number>> = {
  WR: { speed: 54, burst: 60, agility: 57, power: 42, frame: 40, stature: 40 },
  TE: { speed: 56, burst: 47, agility: 41, power: 60, frame: 70, stature: 65 },
  QB: { speed: 33, burst: 36, agility: 43, power: 64, frame: 48, stature: 56 },
  RB: { speed: 50, burst: 51, agility: 50, power: 50, frame: 49, stature: 49 },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTier(score: number, surplusPercentile: number): TierLabel {
  if (score > 75) return 'High Upside';
  if (score > 55) {
    return surplusPercentile > 0.5 ? 'Safe Floor' : 'Boom or Bust';
  }
  if (score > 40) return 'Developmental';
  return 'Overdrafted';
}

function toTitleCase(str: string): string {
  if (!str) return '';
  return str.toLowerCase().replace(/(^|[^\w])(\w)/g, (_, p1, p2) => p1 + p2.toUpperCase());
}

/** Parse a flat CSV string into an array of row objects keyed by header. */
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const nonEmpty = lines.filter(l => l.trim());
  if (nonEmpty.length < 2) return [];

  const headers = nonEmpty[0].split(',').map(h => h.trim());

  return nonEmpty.slice(1).map(line => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    values.push(current.trim());

    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? '';
    });
    return row;
  });
}

/** Scale a Z-score (−3 to 3) to a 0–100 integer. */
function scaleZ(z: string | undefined): number {
  const val = parseFloat(z ?? '');
  if (isNaN(val)) return 50;
  return Math.round(Math.max(0, Math.min(100, ((val + 3) / 6) * 100)));
}

/** Scale agility Z-score (inverted — lower time is better). */
function scaleAgilityZ(z: string | undefined): number {
  const val = parseFloat(z ?? '');
  if (isNaN(val)) return 50;
  return Math.round(Math.max(0, Math.min(100, ((-val + 3) / 6) * 100)));
}

function num(s: string | undefined): number {
  const v = parseFloat(s ?? '');
  return isNaN(v) ? 0 : v;
}

function optNum(s: string | undefined): number | undefined {
  if (!s) return undefined;
  const v = parseFloat(s);
  return isNaN(v) ? undefined : v;
}

// ─── Data loader ─────────────────────────────────────────────────────────────

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function rowToPlayer(d: Record<string, string>, _idx: number): Player {
  const id = slugify(d.player_name || String(_idx));
  const sleeperScore = Math.round(num(d.sleeper_score));
  const performanceValue = num(d.performance_value_usd);
  const contractCost = num(d.contract_cost_usd);
  const contractSurplus = num(d.contract_surplus_usd);
  const contractSurplusPercentile = num(d.contract_surplus_percentile);
  const upsidePercentile = num(d.upside_percentile);
  const roundValuePercentile = num(d.round_value_percentile);

  const productionStats: ProductionStats = {
    // Passing
    completionPct:      optNum(d.completion_pct),
    yardsPerAttempt:    optNum(d.yards_per_attempt),
    tdIntRatio:         optNum(d.td_int_ratio),
    passYards:          optNum(d.col_pass_yards),
    rushYards:          optNum(d.col_rush_yards),
    // Receiving
    dominatorRating:    optNum(d.dominator_rating),
    yardsPerReception:  optNum(d.yards_per_reception),
    recTdRate:          optNum(d.rec_td_rate),
    // Running
    yardsPerCarry:      optNum(d.yards_per_carry),
    receptionRate:      optNum(d.reception_rate),
    rushTdRate:         optNum(d.rush_td_rate),
    yardsFromScrimmage: optNum(d.yards_from_scrimmage),
  };

  return {
    id,
    name: d.player_name || 'Unknown',
    position: (d.position || 'WR') as Position,
    college: toTitleCase(d.college || 'Unknown'),
    draftRound: parseInt(d.draft_round || '0') || 0,
    draftPick: parseInt(d.projected_draft_pick || '0') || 0,
    projectedPick: parseInt(d.projected_draft_pick || '0') || 0,

    sleeperScore,
    contractCost,
    performanceValue,
    contractSurplus,
    contractSurplusPercentile,
    upsidePercentile,
    roundValuePercentile,
    draftWindowLabel: d.draft_window_label || '',

    surplusValue: Math.round(contractSurplus / 1_000_000),
    breakoutProbability: Math.round(upsidePercentile * 100),
    availabilityFactor: Math.round(roundValuePercentile * 100),

    tier: getTier(sleeperScore, contractSurplusPercentile),

    height: num(d.height_in),
    weight: num(d.weight_lbs),

    combine: {
      fortyYard: optNum(d.forty_yard),
      vertical: optNum(d.vertical_jump),
      broadJump: optNum(d.broad_jump),
      threeCone: optNum(d.cone_drill),
      shuttle: optNum(d.shuttle),
      benchPress: optNum(d.bench_reps),
    },

    athleticRadar: {
      speed: scaleZ(d.speed_score_z),
      burst: scaleZ(d.burst_score_z),
      agility: scaleAgilityZ(d.agility_score_z),
      power: scaleZ(d.bench_reps_z),
      frame: scaleZ(d.bmi_z),
      stature: scaleZ(d.height_in_z),
    },

    productionStats,
    productionRadar: {}, // filled in by computeProductionRadar()
    universalRadar: {}, // filled in by computeProductionRadar()

    featureImportance: {
      draftCapital: Math.round(contractSurplusPercentile * 100),
      agility: scaleAgilityZ(d.agility_score_z),
      collegeProduction: Math.round(roundValuePercentile * 100),
      athleticism: scaleZ(d.speed_score_z),
      size: scaleZ(d.bmi_z),
    },
  };
}

/**
 * Given an array of numeric values, return the percentile rank (0–100) of `val`
 * among those values (higher = better). Returns 50 if data is unavailable.
 */
function pctRank(val: number | undefined, values: number[]): number {
  if (val == null || values.length === 0) return 50;
  const sorted = [...values].sort((a, b) => a - b);
  const below = sorted.filter(v => v < val).length;
  return Math.round((below / Math.max(sorted.length - 1, 1)) * 100);
}

/**
 * Second pass: for each player compute position-specific percentile ranks and
 * store them as `productionRadar`.
 */
function computeProductionRadar(players: Player[]): Player[] {
  // Group players by position
  const groups = new Map<string, Player[]>();
  for (const p of players) {
    if (!groups.has(p.position)) groups.set(p.position, []);
    groups.get(p.position)!.push(p);
  }

  return players.map(player => {
    const g = groups.get(player.position) ?? [player];
    const ps = player.productionStats;
    const ar = player.athleticRadar;

    // Helper – percentile rank of one production stat within position group
    const prs = (key: keyof ProductionStats) =>
      pctRank(ps[key], g.map(p => p.productionStats[key]).filter((v): v is number => v != null));

    let productionRadar: Record<string, number>;

    switch (player.position) {
      case 'QB':
        productionRadar = {
          'Completion %':   prs('completionPct'),
          'Yds / Attempt':  prs('yardsPerAttempt'),
          'TD Efficiency':  prs('tdIntRatio'),
          'Mobility':       prs('rushYards'),
          'Pass Volume':    prs('passYards'),
          'Athleticism':    ar.speed,   // speed z-score still meaningful for QBs
        };
        break;

      case 'WR':
        productionRadar = {
          'Dominance':      prs('dominatorRating'),
          'Yds / Reception':prs('yardsPerReception'),
          'TD Rate':        prs('recTdRate'),
          'Speed':          ar.speed,
          'Burst':          ar.burst,
          'Agility':        ar.agility,
        };
        break;

      case 'TE':
        productionRadar = {
          'Dominance':      prs('dominatorRating'),
          'Yds / Reception':prs('yardsPerReception'),
          'TD Rate':        prs('recTdRate'),
          'Speed':          ar.speed,
          'Frame':          ar.frame,
          'Power':          ar.power,
        };
        break;

      case 'RB':
      default:
        productionRadar = {
          'Yds / Carry':    prs('yardsPerCarry'),
          'Receiving':      prs('receptionRate'),
          'TD Rate':        prs('rushTdRate'),
          'Volume':         prs('yardsFromScrimmage'),
          'Speed':          ar.speed,
          'Burst':          ar.burst,
        };
        break;
    }

    const universalRadar: Record<string, number> = {
      'Sleeper Score':       player.sleeperScore,
      'Contract Surplus':    Math.round(player.contractSurplusPercentile * 100),
      'Upside':              Math.round(player.upsidePercentile * 100),
      'Round Value':         Math.round(player.roundValuePercentile * 100),
      'Speed':               player.athleticRadar.speed,
      'Burst':               player.athleticRadar.burst,
    };

    return { ...player, productionRadar, universalRadar };
  });
}

export async function fetchPlayers(): Promise<Player[]> {
  try {
    const [passRes, runRes] = await Promise.all([
      fetch(`${import.meta.env.BASE_URL}skill_pass_2026_scored.csv`),
      fetch(`${import.meta.env.BASE_URL}skill_run_2026_scored.csv`),
    ]);

    if (!passRes.ok || !runRes.ok) throw new Error('CSV fetch failed');

    const [passText, runText] = await Promise.all([
      passRes.text(),
      runRes.text(),
    ]);

    const passRows = parseCSV(passText);
    const runRows = parseCSV(runText);
    const allRows = [...passRows, ...runRows].filter(d => d.player_name);

    const raw = allRows.map((d, i) => rowToPlayer(d, i));
    return computeProductionRadar(raw);
  } catch (error) {
    console.error('Failed to fetch players:', error);
    return [];
  }
}

// ─── UI Utilities ─────────────────────────────────────────────────────────────

export function getTierColors(tier: TierLabel) {
  switch (tier) {
    case 'High Upside':  return { hex: '#39ff14', bg: 'bg-[rgba(57,255,20,0.1)]',  bgHover: 'hover:bg-[rgba(57,255,20,0.2)]',  bgSelected: 'bg-[rgba(57,255,20,0.2)]',  text: 'text-[#39ff14]',  border: 'border-[#39ff14]/30' };
    case 'Safe Floor':   return { hex: '#60a5fa', bg: 'bg-blue-500/10',            bgHover: 'hover:bg-blue-500/20',            bgSelected: 'bg-blue-500/20',            text: 'text-blue-400',   border: 'border-blue-400/30' };
    case 'Boom or Bust': return { hex: '#c084fc', bg: 'bg-purple-500/10',          bgHover: 'hover:bg-purple-500/20',          bgSelected: 'bg-purple-500/20',          text: 'text-purple-400', border: 'border-purple-400/30' };
    case 'Developmental':return { hex: '#facc15', bg: 'bg-yellow-500/10',          bgHover: 'hover:bg-yellow-500/20',          bgSelected: 'bg-yellow-500/20',          text: 'text-yellow-400', border: 'border-transparent' };
    case 'Overdrafted':  return { hex: '#f87171', bg: 'bg-red-500/10',             bgHover: 'hover:bg-red-500/20',             bgSelected: 'bg-red-500/20',             text: 'text-red-400',    border: 'border-red-400/30' };
    default:             return { hex: '#94a3b8', bg: 'bg-slate-500/10',           bgHover: 'hover:bg-slate-500/20',           bgSelected: 'bg-slate-500/20',           text: 'text-slate-400',  border: 'border-slate-400/30' };
  }
}

export function getScoreColor(score: number): string {
  if (score >= 80) return '#39ff14';
  if (score >= 65) return '#60a5fa';
  if (score >= 50) return '#facc15';
  return '#f87171';
}

export function getScoreClass(score: number): string {
  if (score >= 80) return 'text-[#39ff14]';
  if (score >= 65) return 'text-blue-400';
  if (score >= 50) return 'text-yellow-400';
  return 'text-red-400';
}

/** Format a USD amount as a compact $ string, e.g. $15.9M */
export function formatMoney(usd: number): string {
  const m = usd / 1_000_000;
  return `$${Math.abs(m).toFixed(1)}M`;
}

export function formatHeight(inches: number): string {
  if (!inches) return '-';
  const feet = Math.floor(inches / 12);
  const rem = inches % 12;
  return `${feet}'${rem}"`;
}

export function formatPick(round: number, pick: number): string {
  if (!round || !pick) return 'Undrafted';
  return `Rd ${round} Pk ${pick}`;
}