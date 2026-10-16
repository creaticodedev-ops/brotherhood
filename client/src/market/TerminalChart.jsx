import { useEffect, useRef, useState } from 'react'
import {
  AreaSeries,
  CandlestickSeries,
  ColorType,
  createChart,
  CrosshairMode,
  HistogramSeries,
  LastPriceAnimationMode,
  LineStyle,
} from 'lightweight-charts'
import { bucketStart } from './api'
import { formatPrice, numberLocale } from './format'

const UP = '#22b573'
const DOWN = 'rgba(244, 245, 243, 0.62)'
const GRID = 'rgba(255, 255, 255, 0.045)'
const TEXT = 'rgba(244, 245, 243, 0.5)'
const VISIBLE_BARS = 140

const intradayTf = (tf) => !['1d', '1w'].includes(tf)

/** Professional market chart: candles or area, volume, crosshair legend and live last bar. */
export const TerminalChart = ({ symbol, digits = 2, candles, tf, type, price, quoteTs, locale, labels }) => {
  const containerRef = useRef(null)
  const chartRef = useRef(null)
  const seriesRef = useRef({})
  const lastBarRef = useRef(null)
  const [legend, setLegend] = useState(null)
  const [liveBar, setLiveBar] = useState(null)

  useEffect(() => {
    const container = containerRef.current
    const chart = createChart(container, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: TEXT,
        fontFamily: "'Inter', system-ui, sans-serif",
        fontSize: 11,
        attributionLogo: false,
      },
      grid: { vertLines: { color: GRID }, horzLines: { color: GRID } },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.12, bottom: 0.2 } },
      timeScale: { borderVisible: false, rightOffset: 6, barSpacing: 7, minBarSpacing: 2 },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: 'rgba(255,255,255,0.22)', style: LineStyle.Dashed, labelBackgroundColor: '#161a18' },
        horzLine: { color: 'rgba(255,255,255,0.22)', style: LineStyle.Dashed, labelBackgroundColor: '#161a18' },
      },
      handleScale: { axisPressedMouseMove: true },
    })

    const candlesSeries = chart.addSeries(CandlestickSeries, {
      upColor: UP,
      downColor: 'rgba(0,0,0,0)',
      borderUpColor: UP,
      borderDownColor: DOWN,
      wickUpColor: UP,
      wickDownColor: DOWN,
      priceLineColor: UP,
      priceLineStyle: LineStyle.Dotted,
    })
    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor: UP,
      lineWidth: 2,
      topColor: 'rgba(34, 181, 115, 0.22)',
      bottomColor: 'rgba(34, 181, 115, 0)',
      priceLineColor: UP,
      priceLineStyle: LineStyle.Dotted,
      lastPriceAnimation: LastPriceAnimationMode.OnDataUpdate,
      visible: false,
    })
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceScaleId: 'volume',
      priceFormat: { type: 'volume' },
      lastValueVisible: false,
      priceLineVisible: false,
    })
    chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.84, bottom: 0 } })

    seriesRef.current = { candles: candlesSeries, area: areaSeries, volume: volumeSeries }
    chartRef.current = chart

    const onMove = (param) => {
      const bar = param.time ? param.seriesData.get(candlesSeries) : null
      setLegend(bar && 'open' in bar ? bar : null)
    }
    chart.subscribeCrosshairMove(onMove)

    return () => {
      chart.unsubscribeCrosshairMove(onMove)
      chart.remove()
      chartRef.current = null
      seriesRef.current = {}
    }
  }, [])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return
    const fmtTime = new Intl.DateTimeFormat(numberLocale(locale), {
      day: '2-digit',
      month: 'short',
      year: intradayTf(tf) ? undefined : '2-digit',
      hour: intradayTf(tf) ? '2-digit' : undefined,
      minute: intradayTf(tf) ? '2-digit' : undefined,
      hour12: false,
    })
    chart.applyOptions({
      localization: {
        locale: numberLocale(locale),
        priceFormatter: (value) => formatPrice(value, locale, digits),
        timeFormatter: (time) => fmtTime.format(time * 1000),
      },
      timeScale: { timeVisible: intradayTf(tf), secondsVisible: false },
    })
    const priceFormat = { type: 'price', precision: digits, minMove: 10 ** -digits }
    seriesRef.current.candles.applyOptions({ priceFormat })
    seriesRef.current.area.applyOptions({ priceFormat })
  }, [locale, tf, digits])

  useEffect(() => {
    const { candles: c, area, volume } = seriesRef.current
    if (!c) return
    c.setData([])
    area.setData([])
    volume.setData([])
    lastBarRef.current = null
    setLiveBar(null)
    setLegend(null)
  }, [symbol])

  useEffect(() => {
    const { candles: c, area, volume } = seriesRef.current
    if (!c) return
    if (!candles?.length) {
      lastBarRef.current = null
      return
    }
    c.setData(candles)
    area.setData(candles.map((bar) => ({ time: bar.time, value: bar.close })))
    volume.setData(
      candles.map((bar) => ({
        time: bar.time,
        value: bar.volume,
        color: bar.close >= bar.open ? 'rgba(34, 181, 115, 0.28)' : 'rgba(244, 245, 243, 0.12)',
      })),
    )
    lastBarRef.current = { ...candles[candles.length - 1] }
    setLiveBar(lastBarRef.current)
    const n = candles.length
    chartRef.current.timeScale().setVisibleLogicalRange({ from: Math.max(0, n - VISIBLE_BARS), to: n + 4 })
  }, [candles])

  useEffect(() => {
    const { candles: c, area } = seriesRef.current
    if (!c) return
    c.applyOptions({ visible: type === 'candles' })
    area.applyOptions({ visible: type === 'area' })
  }, [type])

  useEffect(() => {
    const { candles: c, area } = seriesRef.current
    const last = lastBarRef.current
    if (!c || !last || !Number.isFinite(price) || !quoteTs) return
    const time = bucketStart(Math.floor(quoteTs / 1000), tf)
    if (time < last.time) return
    const bar =
      time === last.time
        ? { ...last, high: Math.max(last.high, price), low: Math.min(last.low, price), close: price }
        : { time, open: last.close, high: Math.max(last.close, price), low: Math.min(last.close, price), close: price, volume: 0 }
    lastBarRef.current = bar
    setLiveBar(bar)
    c.update(bar)
    area.update({ time: bar.time, value: bar.close })
  }, [price, quoteTs, tf])

  const shown = legend || liveBar
  const change = shown ? shown.close - shown.open : null

  return (
    <div className="tchart" dir="ltr">
      {shown ? (
        <dl className="tchart-legend" aria-hidden="true">
          {[
            ['O', shown.open],
            ['H', shown.high],
            ['L', shown.low],
            ['C', shown.close],
          ].map(([key, value]) => (
            <div key={key}>
              <dt>{labels[key]}</dt>
              <dd>{formatPrice(value, locale, digits)}</dd>
            </div>
          ))}
          <div className={`is-${change >= 0 ? 'up' : 'down'}`}>
            <dt>Δ</dt>
            <dd>{formatPrice(change, locale, digits)}</dd>
          </div>
        </dl>
      ) : null}
      <div ref={containerRef} className="tchart-canvas" />
    </div>
  )
}

export default TerminalChart
