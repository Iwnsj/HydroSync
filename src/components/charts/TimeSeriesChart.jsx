import { useId } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartTooltip, axisTick, useChartTheme } from './chartTheme'
import { useChartAnimation } from '../../hooks/useChartAnimation'
import { shortTime, timeFmt } from '../../utils/format'

/**
 * Generic time-series chart (lines and/or areas) used by Overview, Live
 * Monitoring and History.
 *
 * series: [{ key, name, color, area?, yAxisId?: 'left' | 'right', unit?, decimals? }]
 * target: { min, max, yAxisId?, label? } → shaded crop target band
 */
export default function TimeSeriesChart({
  data,
  series,
  target,
  refLines = [],
  yDomain = ['auto', 'auto'],
  rightDomain = ['auto', 'auto'],
  yTickFormat,
  rightTickFormat,
  xFormat = shortTime,
  tooltipLabel = timeFmt,
  legend = true,
}) {
  const theme = useChartTheme()
  const anim = useChartAnimation()
  const gid = useId().replace(/:/g, '')
  const hasRight = series.some((s) => s.yAxisId === 'right')
  const meta = Object.fromEntries(series.map((s) => [s.key, { unit: s.unit, decimals: s.decimals }]))

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 8, right: hasRight ? 0 : 8, left: -8, bottom: 0 }}>
        <defs>
          {series
            .filter((s) => s.area)
            .map((s) => (
              <linearGradient key={s.key} id={`${gid}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
              </linearGradient>
            ))}
        </defs>
        <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="ts"
          type="number"
          scale="time"
          domain={['dataMin', 'dataMax']}
          tickFormatter={xFormat}
          tick={axisTick(theme)}
          stroke={theme.grid}
          minTickGap={36}
        />
        <YAxis yAxisId="left" domain={yDomain} tickFormatter={yTickFormat} tick={axisTick(theme)} stroke={theme.grid} width={44} allowDecimals />
        {hasRight && (
          <YAxis yAxisId="right" orientation="right" domain={rightDomain} tickFormatter={rightTickFormat} tick={axisTick(theme)} stroke={theme.grid} width={48} />
        )}
        {target && (
          <ReferenceArea
            yAxisId={target.yAxisId ?? 'left'}
            y1={target.min}
            y2={target.max}
            fill="#10b981"
            fillOpacity={0.08}
            stroke="#10b981"
            strokeOpacity={0.35}
            strokeDasharray="4 4"
            ifOverflow="extendDomain"
            label={target.label ? { value: target.label, position: 'insideTopLeft', fill: '#10b981', fontSize: 11 } : undefined}
          />
        )}
        {refLines.map((r) => (
          <ReferenceLine
            key={r.label}
            yAxisId={r.yAxisId ?? 'left'}
            y={r.y}
            stroke={r.color ?? '#f43f5e'}
            strokeDasharray="5 4"
            ifOverflow="extendDomain"
            label={{ value: r.label, position: 'insideBottomRight', fill: r.color ?? '#f43f5e', fontSize: 11 }}
          />
        ))}
        <Tooltip content={<ChartTooltip labelFormatter={tooltipLabel} meta={meta} />} cursor={{ stroke: theme.cursor, strokeDasharray: '3 3' }} />
        {legend && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 4 }} />}
        {series.map((s) =>
          s.area ? (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              yAxisId={s.yAxisId ?? 'left'}
              stroke={s.color}
              strokeWidth={2}
              fill={`url(#${gid}-${s.key})`}
              dot={false}
              activeDot={{ r: 4 }}
              {...anim}
            />
          ) : (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              yAxisId={s.yAxisId ?? 'left'}
              stroke={s.color}
              strokeWidth={2.25}
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls={false}
              {...anim}
            />
          ),
        )}
      </ComposedChart>
    </ResponsiveContainer>
  )
}
