import { css } from '../../../core/css.js';

export const styles = css`
:host { display: block; }
.chartbox { position: relative; }
svg { display: block; width: 100%; height: auto; overflow: visible; }
.chart .grid { stroke: var(--grid); stroke-width: 1; fill: none; }
.chart .grid-0 { stroke-width: 1.2; }
.chart .axlbl { font-size: 11px; fill: var(--color-text-muted); }
.chart .series-line { stroke-width: 2.4; }
.chart .crosshair { stroke: var(--color-text-muted); stroke-width: 1.4; }
.chart .cdot { stroke: var(--color-bg); stroke-width: 2; }
.chart-tip {
  position: absolute; top: 8px; transform: translateX(-50%); background: var(--color-surface-solid); color: var(--color-text);
  border: 1px solid var(--color-divider); font-size: 12.5px; font-weight: 600; line-height: 1.55; padding: 8px 11px; border-radius: 10px;
  white-space: nowrap; opacity: 0; pointer-events: none; box-shadow: var(--shadow-lg); z-index: 6;
}
.chart-tip.flip { transform: translateX(-100%); }
.chart-tip i { display: inline-block; width: 9px; height: 9px; border-radius: 2px; margin-right: 6px; vertical-align: middle; }
`;
