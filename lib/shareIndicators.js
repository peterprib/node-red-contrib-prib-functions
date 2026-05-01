// Simple moving average: returns an array of period-averages for the input series.
const sma = (data, period) => {
  const n = data.length;
  const result = new Array(n).fill(null);
  const invPeriod = 1 / period;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += data[i];
    if (i >= period) {
      sum -= data[i - period];
    }
    if (i >= period - 1) {
      result[i] = sum * invPeriod;
    }
  }
  return result;
}

// Exponential moving average: uses a smoothing factor to weight recent values more heavily.
const ema = (data, period) => {
  const k = 2 / (period + 1);
  const oneMinusK = 1 - k;
  const invPeriod = 1 / period;
  const result = [];
  let emaPrev = null;
  data.forEach((val, i) => {
    if (val === null) { result.push(null); return; }
    if (emaPrev === null) {
      if (i < period - 1) { result.push(null); return; }
      // Seed with SMA
      const seed = data.slice(0, period).reduce((a, b) => a + b, 0) * invPeriod;
      emaPrev = seed;
      result.push(seed);
    } else {
      const emaVal = val * k + emaPrev * oneMinusK;
      emaPrev = emaVal;
      result.push(emaVal);
    }
  });
  return result;
}

// Relative Strength Index: measures momentum by comparing average gains and losses.
const rsi = (closes, period = 14) => {
  const n = closes.length;
  const result = new Array(n).fill(null);
  const invPeriod = 1 / period;
  const pMinus1 = period - 1;
  let gains = 0, losses = 0;

  let prevClose = closes[0];
  for (let i = 1; i <= period; i++) {
    const close = closes[i];
    const diff = close - prevClose;
    if (diff >= 0) gains += diff;
    else losses -= diff;
    prevClose = close;
  }

  let avgGain = gains * invPeriod;
  let avgLoss = losses * invPeriod;
  const initialRs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result[period] = 100 - 100 / (1 + initialRs);

  for (let i = period + 1; i < n; i++) {
    const close = closes[i];
    const diff = close - prevClose;
    const gain = diff >= 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * pMinus1 + gain) * invPeriod;
    avgLoss = (avgLoss * pMinus1 + loss) * invPeriod;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result[i] = 100 - 100 / (1 + rs);
    prevClose = close;
  }
  return result;
}

// MACD: computes the difference between two EMAs and its signal line/histogram.
const macd = (closes, fast = 12, slow = 26, signal = 9) => {
  const emaFast = ema(closes, fast);
  const emaSlow = ema(closes, slow);
  const macdLine = emaFast.map((v, i) =>
    v !== null && emaSlow[i] !== null ? v - emaSlow[i] : null
  );
  const macdValues = macdLine.filter(v => v !== null);
  const signalRaw = ema(macdValues, signal);
  // Re-align signal to original array length
  const signalLine = new Array(macdLine.length).fill(null);
  let si = 0;
  macdLine.forEach((v, i) => {
    if (v !== null) { signalLine[i] = signalRaw[si++] ?? null; }
  });
  const histogram = macdLine.map((v, i) =>
    v !== null && signalLine[i] !== null ? v - signalLine[i] : null
  );
  return { macdLine, signalLine, histogram };
}

// Bollinger Bands: returns upper, middle, and lower bands around a moving average.
const bollingerBands = (closes, period = 20, stdDev = 2) => {
  const n = closes.length;
  const upper = new Array(n).fill(null);
  const middle = new Array(n).fill(null);
  const lower = new Array(n).fill(null);
  const invPeriod = 1 / period;
  let sum = 0;
  let sumSq = 0;

  for (let i = 0; i < n; i++) {
    const val = closes[i];
    sum += val;
    sumSq += val * val;
    if (i >= period) {
      const back = closes[i - period];
      sum -= back;
      sumSq -= back * back;
    }
    if (i >= period - 1) {
      const m = sum * invPeriod;
      const variance = Math.max(0, sumSq * invPeriod - m * m);
      const sd = Math.sqrt(variance);
      const offset = stdDev * sd;
      middle[i] = m;
      upper[i] = m + offset;
      lower[i] = m - offset;
    }
  }
  return { upper, middle, lower };
}

// Average True Range: measures market volatility using high/low/close ranges.
const atr = (highs, lows, closes, period = 14) => {
  const result = new Array(highs.length).fill(null);
  const invPeriod = 1 / period;
  const pMinus1 = period - 1;
  let prevAtr = null;
  let trSum = 0;

  let prevClose = closes[0];
  for (let i = 1; i < highs.length; i++) {
    const high = highs[i];
    const low = lows[i];
    const trueRange = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    if (i < period) {
      trSum += trueRange;
      continue;
    }
    if (i === period) {
      trSum += trueRange;
      prevAtr = trSum * invPeriod;
      result[i] = prevAtr;
    } else {
      prevAtr = (prevAtr * pMinus1 + trueRange) * invPeriod;
      result[i] = prevAtr;
    }
    prevClose = highs.length > i ? closes[i] : prevClose;
  }
  return result;
}

// On Balance Volume: accumulates volume based on directional close moves.
const obv = (closes, volumes) => {
  const result = new Array(closes.length).fill(null);
  if (closes.length === 0 || volumes.length !== closes.length) return result;
  let current = 0;
  result[0] = current;
  let prevClose = closes[0];
  for (let i = 1; i < closes.length; i++) {
    const close = closes[i];
    if (close > prevClose) current += volumes[i];
    else if (close < prevClose) current -= volumes[i];
    result[i] = current;
    prevClose = close;
  }
  return result;
}

// Stochastic Oscillator: computes %K and smoothed %D values from highs, lows, and closes.
const stochasticOscillator = (highs, lows, closes, kPeriod = 14, dPeriod = 3) => {
  const kValues = new Array(closes.length).fill(null);
  const dValues = new Array(closes.length).fill(null);
  const invDPeriod = 1 / dPeriod;
  let sumD = 0;

  for (let i = 0; i < closes.length; i++) {
    const idxK = i - kPeriod + 1;
    if (idxK < 0) continue;
    
    let highestHigh = highs[idxK];
    let lowestLow = lows[idxK];
    for (let j = idxK + 1; j <= i; j++) {
      if (highs[j] > highestHigh) highestHigh = highs[j];
      if (lows[j] < lowestLow) lowestLow = lows[j];
    }

    const currentClose = closes[i];
    const range = highestHigh - lowestLow;
    kValues[i] = range === 0
      ? 50
      : ((currentClose - lowestLow) / range) * 100;
    
    sumD += kValues[i];
    if (i >= kPeriod + dPeriod - 1) {
      sumD -= kValues[i - dPeriod];
    }
    if (i >= kPeriod + dPeriod - 2) {
      dValues[i] = sumD * invDPeriod;
    }
  }
  return { kValues, dValues };
}

// addIndicators: appends common indicator values to each history object.
const addIndicators = (history) => {
  const closes = history.map(d => parseFloat(d.close));
  const hasVolume = history.every(d => d.volume != null);
  const hasHighLow = history.every(d => d.high != null && d.low != null);
  const volumes = hasVolume ? history.map(d => parseFloat(d.volume)) : [];
  const highs = hasHighLow ? history.map(d => parseFloat(d.high)) : [];
  const lows = hasHighLow ? history.map(d => parseFloat(d.low)) : [];

  const n = closes.length;
  const sma50 = new Array(n).fill(null);
  const sma200 = new Array(n).fill(null);
  const upper = new Array(n).fill(null);
  const middle = new Array(n).fill(null);
  const lower = new Array(n).fill(null);
  const obvValues = new Array(n).fill(null);
  const atrValues = new Array(n).fill(null);
  const kValues = new Array(n).fill(null);
  const dValues = new Array(n).fill(null);
  let sumDValue = 0;

  let sum50 = 0;
  let sum200 = 0;
  let sum20 = 0;
  let sumSq20 = 0;
  const bbPeriod = 20;
  const stochKPeriod = 14;
  const stochDPeriod = 3;
  let obvAccum = 0;
  let prevClose = closes[0];
  let atrSum = 0;
  let prevAtr = null;
  const atrPeriod = 14;

  // Precompute window sizes for performance
  const sma50Window = 50, sma200Window = 200;
  const bbWindow = bbPeriod;
  const stochKWindow = stochKPeriod;
  const stochDWindow = stochDPeriod;
  const inv50 = 1 / 50, inv200 = 1 / 200, invBB = 1 / bbPeriod, invAtr = 1 / 14, invD = 1 / 3;

  for (let i = 0; i < n; i++) {
    const close = closes[i];

    // SMA 50 (incremental update, minimize i - N)
    if (i < sma50Window - 1) {
      sum50 += close;
    } else if (i === sma50Window - 1) {
      sum50 += close;
      sma50[i] = sum50 * inv50;
    } else {
      const idx50 = i - sma50Window;
      const diff = close - closes[idx50];
      sum50 += diff;
      sma50[i] = sma50[i - 1] + diff * inv50;
    }

    // SMA 200 (incremental update, minimize i - N)
    if (i < sma200Window - 1) {
      sum200 += close;
    } else if (i === sma200Window - 1) {
      sum200 += close;
      sma200[i] = sum200 * inv200;
    } else {
      const idx200 = i - sma200Window;
      const diff = close - closes[idx200];
      sum200 += diff;
      sma200[i] = sma200[i - 1] + diff * inv200;
    }

    // Bollinger Bands (efficient: use running mean/variance, minimize i - N)
    sum20 += close;
    sumSq20 += close * close;
    if (i < bbWindow - 1) {
      // Not enough data yet
    } else {
      if (i >= bbWindow) {
        const idxBB = i - bbWindow;
        const removed = closes[idxBB];
        sum20 -= removed;
        sumSq20 -= removed * removed;
      }
      const mean = sum20 * invBB;
      const variance = Math.max(0, sumSq20 * invBB - mean * mean);
      const sd = Math.sqrt(variance);
      middle[i] = mean;
      const bandWidth = 2 * sd;
      upper[i] = mean + bandWidth;
      lower[i] = mean - bandWidth;
    }

    // OBV
    if (hasVolume) {
      if (i === 0) {
        obvAccum = 0;
      } else if (close > prevClose) {
        obvAccum += volumes[i];
      } else if (close < prevClose) {
        obvAccum -= volumes[i];
      }
      obvValues[i] = obvAccum;
    }

    // ATR
    if (hasHighLow && i > 0) {
      const currentHigh = highs[i];
      const currentLow = lows[i];
      const trueRange = Math.max(
        currentHigh - currentLow,
        Math.abs(currentHigh - prevClose),
        Math.abs(currentLow - prevClose)
      );
      if (i < atrPeriod) {
        atrSum += trueRange;
      } else if (i === atrPeriod) {
        atrSum += trueRange;
        prevAtr = atrSum / atrPeriod;
        atrValues[i] = prevAtr;
      } else {
        prevAtr += (trueRange - prevAtr) * invAtr;
        atrValues[i] = prevAtr;
      }
    }

    // Stochastic Oscillator (minimize i - N)
    if (hasHighLow && i >= stochKWindow - 1) {
      const idxK = i - stochKWindow + 1;
      let highestHigh = highs[idxK], lowestLow = lows[idxK];
      for (let j = idxK + 1; j <= i; j++) {
        if (highs[j] > highestHigh) highestHigh = highs[j];
        if (lows[j] < lowestLow) lowestLow = lows[j];
      }
      const rangeK = highestHigh - lowestLow;
      kValues[i] = rangeK === 0
        ? 50
        : ((close - lowestLow) / rangeK) * 100;

      sumDValue += kValues[i];
      if (i >= stochKWindow - 1 + stochDWindow) {
        sumDValue -= kValues[i - stochDWindow];
      }

      if (i >= stochKWindow - 1 + stochDWindow - 1) {
        dValues[i] = sumDValue * invD;
      }
    }

    prevClose = close;
  }

  const rsiValues = rsi(closes);
  const { macdLine, signalLine, histogram } = macd(closes);

  return history.map((d, i) => ({
    ...d,
    sma50: sma50[i]?.toFixed(4) ?? null,
    sma200: sma200[i]?.toFixed(4) ?? null,
    rsi: rsiValues[i]?.toFixed(2) ?? null,
    macd: macdLine[i]?.toFixed(4) ?? null,
    macdSignal: signalLine[i]?.toFixed(4) ?? null,
    macdHist: histogram[i]?.toFixed(4) ?? null,
    bbUpper: upper[i]?.toFixed(4) ?? null,
    bbMiddle: middle[i]?.toFixed(4) ?? null,
    bbLower: lower[i]?.toFixed(4) ?? null,
    obv: obvValues[i] != null ? obvValues[i].toFixed(0) : null,
    atr: atrValues[i]?.toFixed(4) ?? null,
    stochK: kValues[i]?.toFixed(2) ?? null,
    stochD: dValues[i]?.toFixed(2) ?? null,
  }));
}

module.exports = {
  sma,
  ema,
  rsi,
  macd,
  bollingerBands,
  atr,
  obv,
  stochasticOscillator,
  addIndicators,
};