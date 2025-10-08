export type ParcelField = { value: string; confidence: number; source: string };
export type ParcelFields = {
  trackingNumber?: ParcelField;
  recipientName?: ParcelField;
  mobileNumber?: ParcelField;
  unit?: ParcelField;
  addressLine?: ParcelField;
  remarks?: ParcelField;
  extras?: { allTrackings: string[]; allPhones: string[] };
};

const TRIM = (s?: string | null) => (s || '').replace(/\s+/g, ' ').trim();
const uniq = <T,>(a: T[]) => Array.from(new Set(a));

/** Patterns tuned for your sample label */
const trackingREs = [
  {name: 'MYMPA', re: /\bMYMPA\d{9,12}\b/gi, w: 1.0},
  {name: 'MPA', re: /\bMPA\d{9,12}\b/gi, w: 0.9},
  {name: 'MYSPA', re: /\bMYSPA\d{9,12}\b/gi, w: 0.85},
  {name: 'O/N', re: /\bO\/N[:#]?\s*(\d{8,18})\b/gi, w: 0.6},
  // broad fallback (avoid literal word "TRACKING")
  {name: 'ALNUM', re: /\b[A-Z]{2,5}\d{7,13}\b/gi, w: 0.55},
];

/** Malaysian phones 9–11 digits, tolerate +60 */
const phoneRE = /\b(?:\+?6?0)?\d{8,11}\b/g;

/** Name hints */
const nameHint = /\b(?:Customer|Recipient|To|Nama|Kepada)\s*[:\-]?\s*(.+)$/i;

/** Unit like C-28-12 (allow spaces around dashes) */
const unitRE = /\b([A-Z]?\s*-\s*\d{1,3}\s*-\s*\d{1,3})\b/;

/** Address: choose longest comma line, prefer one with MY postcode */
const postcodeMY = /\b\d{5}\b/;

const logExtractedField = (label: string, field?: ParcelField) => {
  if (field) {
    console.log(
      `[parcelOcrParser] ${label}:`,
      field.value,
      `(confidence=${field.confidence.toFixed(2)}, source=${field.source})`,
    );
  } else {
    console.log(`[parcelOcrParser] ${label}: not found`);
  }
};

export function parseRawTextToFields(rawText: string): ParcelFields {
  const raw = TRIM(rawText);
  const lines = raw.split(/\n+/).map(TRIM).filter(Boolean);

  // TRACKING
  const trackCands: ParcelField[] = [];
  for (const {name, re, w} of trackingREs) {
    const matches = Array.from(raw.matchAll(re));
    for (const m of matches) {
      const v0 = (m[1] ?? m[0]) as string;
      const v = v0.replace(/\s+/g, '').toUpperCase();
      if (/^TRACKING$/.test(v)) continue; // filter the literal word
      trackCands.push({value: v, confidence: w, source: `pattern:${name}`});
    }
  }
  // dedupe by value, keep highest confidence
  const byVal = new Map<string, ParcelField>();
  trackCands.forEach(c => {
    const p = byVal.get(c.value);
    if (!p || c.confidence > p.confidence) byVal.set(c.value, c);
  });
  const allTrackings = Array.from(byVal.values()).map(x => x.value);
  const trackingNumber = allTrackings.length
    ? allTrackings
        .map(v => byVal.get(v)!)
        .sort((a, b) => b.confidence - a.confidence)[0]
    : undefined;

  // MOBILE
  const phoneMatches = uniq((raw.match(phoneRE) || []).map(x => x));
  const phoneCands = phoneMatches
    .map(p => {
      let digits = p.replace(/\D/g, '');
      if (digits.startsWith('60') && digits.length >= 10) digits = '0' + digits.slice(2);
      const conf = digits.length >= 9 ? 0.75 : 0.55;
      return {value: digits, confidence: conf, source: 'regex:phone'} as ParcelField;
    })
    .sort((a, b) => b.confidence - a.confidence);
  const mobileNumber = phoneCands[0];

  // NAME
  const nameCands: ParcelField[] = [];
  for (const line of lines) {
    const m = line.match(nameHint);
    if (m?.[1]) {
      const name = TRIM(m[1]).replace(/\(confidence.*\)$/i, '');
      if (name && !/\d{3,}/.test(name)) {
        nameCands.push({value: name, confidence: 0.75, source: 'hint:name-line'});
      }
    }
  }
  const recipientName = nameCands.sort((a, b) => b.confidence - a.confidence)[0];

  // UNIT
  const unitCands: ParcelField[] = [];
  for (const line of lines) {
    const m = line.match(unitRE)?.[1];
    if (m) unitCands.push({value: m.replace(/\s*/g, '').toUpperCase(), confidence: 0.7, source: 'regex:unit'});
  }
  const unit = unitCands[0];

  // ADDRESS
  const addrLines = lines.filter(l => l.includes(','));
  let addressLine: ParcelField | undefined;
  if (addrLines.length) {
    const withPost = addrLines.filter(l => postcodeMY.test(l));
    const best = (withPost.length ? withPost : addrLines).sort((a, b) => b.length - a.length)[0];
    addressLine = {value: best, confidence: withPost.length ? 0.8 : 0.6, source: 'heuristic:address-line'};
  }

  // REMARKS (keywords)
  const remarkHits = ['Non-COD', 'COD', 'Priority', 'Fragile', 'Bulky', 'Return', 'Hold', 'Signature Required'].filter(kw =>
    new RegExp(`\\b${kw.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i').test(raw),
  );
  const remarks = remarkHits.length
    ? {value: uniq(remarkHits).join(', '), confidence: 0.7, source: 'keywords'}
    : undefined;

  logExtractedField('trackingNumber', trackingNumber);
  logExtractedField('recipientName', recipientName);
  logExtractedField('mobileNumber', mobileNumber);
  logExtractedField('unit', unit);
  logExtractedField('addressLine', addressLine);
  logExtractedField('remarks', remarks);
  console.log('[parcelOcrParser] extras.allTrackings:', allTrackings);
  console.log('[parcelOcrParser] extras.allPhones:', phoneCands.map(p => p.value));

  return {
    trackingNumber,
    recipientName,
    mobileNumber,
    unit,
    addressLine,
    remarks,
    extras: {allTrackings, allPhones: phoneCands.map(p => p.value)},
  };
}
