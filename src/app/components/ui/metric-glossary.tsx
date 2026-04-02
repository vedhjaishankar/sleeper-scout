import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';

// ─── Glossary definitions ─────────────────────────────────────────────────────

export const METRIC_GLOSSARY: Record<string, Record<string, string>> = {
  QB: {
    'Completion %':  'Career college completion percentage — how often the QB converted pass attempts.',
    'Yds / Attempt': 'Average passing yards per attempt in college — measures arm efficiency.',
    'TD Efficiency': 'TD-to-INT ratio in college. Higher = safer decision-maker with the ball.',
    'Mobility':      'Total career college rushing yards — indicates dual-threat ability.',
    'Pass Volume':   'Total career college passing yards — reflects usage and experience.',
    'Athleticism':   'Speed Score percentile vs. all skill players — combines weight-adjusted 40-yard dash.',
  },
  WR: {
    'Dominance':       'Receiving share: receiving yards ÷ (receiving yards + rushing yards). Higher values mean the player was a dedicated pass-catcher rather than a gadget/rushing threat.',
    'Yds / Reception': 'Average receiving yards per catch in college — big-play ability.',
    'TD Rate':         'Receiving touchdowns per reception in college.',
    'Speed':           'Speed Score percentile vs. WR position group.',
    'Burst':           'Burst Score percentile vs. WR position group — explosion off the line.',
    'Agility':         'Agility Score percentile vs. WR position group — short-area quickness.',
  },
  TE: {
    'Dominance':       'Receiving share: receiving yards ÷ (receiving yards + rushing yards). Higher values indicate a pass-catching specialist rather than an inline blocker/runner.',
    'Yds / Reception': 'Average receiving yards per catch in college.',
    'TD Rate':         'Receiving touchdowns per reception in college.',
    'Speed':           'Speed Score percentile vs. TE position group.',
    'Frame':           'BMI-based frame score percentile vs. TE group — measures size relative to height.',
    'Power':           'Bench press (reps at 225 lbs) percentile vs. TE group — blocking strength proxy.',
  },
  RB: {
    'Yds / Carry': 'Career college average rushing yards per carry.',
    'Receiving':   'Receptions per carry attempt — higher values signal strong pass-catching ability out of the backfield.',
    'TD Rate':     'Rushing touchdowns per carry attempt in college.',
    'Volume':      'Total career yards from scrimmage (rush + receiving) — workload and durability proxy.',
    'Speed':       'Speed Score percentile vs. RB position group.',
    'Burst':       'Burst Score percentile vs. RB position group — explosion through the hole.',
  },
  /** Used when two different-position players are compared. */
  UNIVERSAL: {
    'Sleeper Score':    'A composite 0–100 score (absolute) combining college production, athletic testing, and physical attributes.',
    'Contract Surplus': 'Percentile rank of contract surplus vs. all skill positions — how much modelled career value exceeds expected rookie contract cost.',
    'Upside':           'Career upside percentile vs. all skill positions — likelihood of high-end NFL production.',
    'Round Value':      'Round value percentile — modelled NFL impact relative to peers drafted in the same round.',
    'Speed':            'Speed Score percentile vs. all skill positions — weight-adjusted 40-yard dash.',
    'Burst':            'Burst Score percentile vs. all skill positions — explosion score derived from vertical and broad jump.',
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * A small ⓘ info icon that opens a Radix tooltip listing metric definitions.
 *
 * Pass a `glossaryKey` that matches one of the METRIC_GLOSSARY keys:
 *   - 'QB' | 'WR' | 'TE' | 'RB'  → position-specific radar axes
 *   - 'UNIVERSAL'                  → cross-position universal radar axes
 */
export function MetricGlossaryTooltip({
  glossaryKey,
  side = 'right',
}: {
  glossaryKey: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
}) {
  const glossary = METRIC_GLOSSARY[glossaryKey];
  if (!glossary) return null;

  const isUniversal = glossaryKey === 'UNIVERSAL';
  const footerNote = isUniversal
    ? 'All values are 0–100. Sleeper Score is absolute; all others are model percentile ranks across all skill positions.'
    : `All values are percentile ranks within the ${glossaryKey} group. 50 = position average.`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Metric definitions"
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-xs" style={{ color: '#000000' }}>
        <div className="space-y-2 py-1">
          <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: '#000000' }}>
            Metric Definitions
          </p>
          {Object.entries(glossary).map(([metric, desc]) => (
            <div key={metric}>
              <span className="text-xs font-bold" style={{ color: '#000000' }}>{metric}: </span>
              <span className="text-xs" style={{ color: '#333333' }}>{desc}</span>
            </div>
          ))}
          <p className="text-xs border-t border-black/10 pt-2 mt-2" style={{ color: '#555555' }}>
            {footerNote}
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
