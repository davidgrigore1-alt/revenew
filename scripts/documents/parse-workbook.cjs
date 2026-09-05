/* Server child process. Never import this file into browser code. */
"use strict";
const zlib = require("node:zlib");
const XLSX = require("xlsx");
const MAX_BYTES = 2097152, MAX_EXPANDED = 33554432;

function container(bytes) {
  if (!bytes.length || bytes.length > MAX_BYTES || bytes.readUInt32LE(0) !== 0x04034b50) throw Error("container");
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) if (bytes.readUInt32LE(i) === 0x06054b50) { end = i; break; }
  if (end < 0 || end + 22 + bytes.readUInt16LE(end + 20) !== bytes.length || bytes.readUInt32LE(end + 4) !== 0) throw Error("container");
  const count = bytes.readUInt16LE(end + 10), start = bytes.readUInt32LE(end + 16);
  if (!count || count > 1024 || count !== bytes.readUInt16LE(end + 8) || start + bytes.readUInt32LE(end + 12) !== end) throw Error("container");
  const entries = new Set(), spans=[]; let pos = start, expanded = 0, contentTypes = "";
  for (let n = 0; n < count; n++) {
    if (pos + 46 > end || bytes.readUInt32LE(pos) !== 0x02014b50) throw Error("container");
    const flags = bytes.readUInt16LE(pos + 8), method = bytes.readUInt16LE(pos + 10), packed = bytes.readUInt32LE(pos + 20), size = bytes.readUInt32LE(pos + 24);
    const nameLength = bytes.readUInt16LE(pos + 28), extra = bytes.readUInt16LE(pos + 30), comment = bytes.readUInt16LE(pos + 32), local = bytes.readUInt32LE(pos + 42);
    const name = bytes.subarray(pos + 46, pos + 46 + nameLength).toString("utf8");
    if (flags & 1 || ![0,8].includes(method) || !name || /(^\/|\\|\.\.|\x00)/.test(name) || entries.has(name) || /vba|macrosheet|activex|embeddings|\.bin$/i.test(name)) throw Error("unsupported_container");
    entries.add(name); expanded += size;
    if (expanded > MAX_EXPANDED || local + 30 > start || bytes.readUInt32LE(local) !== 0x04034b50) throw Error("resource");
    const localNameLength = bytes.readUInt16LE(local + 26), begin = local + 30 + localNameLength + bytes.readUInt16LE(local + 28);
    if (begin + packed > start || bytes.subarray(local + 30, local + 30 + localNameLength).toString("utf8") !== name || bytes.readUInt16LE(local + 8) !== method || bytes.readUInt16LE(local+6)!==flags) throw Error("container");
    let spanEnd=begin+packed;
    if(flags & 8){const signed=spanEnd+4<=start&&bytes.readUInt32LE(spanEnd)===0x08074b50;const descriptor=spanEnd+(signed?4:0);if(descriptor+12>start||bytes.readUInt32LE(descriptor+4)!==packed||bytes.readUInt32LE(descriptor+8)!==size)throw Error("container");spanEnd=descriptor+12;}
    else if(bytes.readUInt32LE(local+18)!==packed||bytes.readUInt32LE(local+22)!==size)throw Error("container");
    spans.push([local,spanEnd]);
    const data = bytes.subarray(begin, begin + packed);
    const inflated = method === 0 ? data : zlib.inflateRawSync(data, { maxOutputLength: Math.min(MAX_EXPANDED, size + 1) });
    if (inflated.length !== size) throw Error("container");
    if (/\.(xml|rels)$/i.test(name) && /<!DOCTYPE|<!ENTITY/i.test(inflated.toString("utf8"))) throw Error("unsupported_xml");
    if (name === "[Content_Types].xml") contentTypes = inflated.toString("utf8");
    pos += 46 + nameLength + extra + comment;
  }
  spans.sort((a,b)=>a[0]-b[0]);let covered=0;for(const span of spans){if(span[0]!==covered)throw Error("container");covered=span[1];}if(covered!==start)throw Error("container");
  if (pos !== end || !entries.has("xl/workbook.xml") || !entries.has("_rels/.rels") || !contentTypes.includes("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml") || /<Override\b[^>]*(?:macroEnabled|vbaProject|binary)/i.test(contentTypes)) throw Error("unsupported_container");
}

function parse(bytes) {
  container(bytes);
  const meta = XLSX.read(bytes, { type: "buffer", bookSheets: true, bookProps: true, bookVBA: false, cellHTML: false });
  if (!meta.SheetNames?.length || meta.SheetNames.length > 64) throw Error("sheet_count");
  const book = XLSX.read(bytes, { type: "buffer", sheets: meta.SheetNames.slice(0,8), sheetRows: 500, dense: true, sheetStubs: true, cellNF: true, cellFormula: true, cellText: true, cellDates: false, bookVBA: false, cellHTML: false, cellStyles: false, WTF: false });
  let inspectedCells = 0, textLeft = 800000;
  function bounded(value) { const full = String(value ?? ""); const text = full.slice(0, Math.min(2000, Math.max(0,textLeft))); textLeft -= text.length; return { text, truncated: text.length < full.length }; }
  const sheets = meta.SheetNames.map((name,index) => {
    const source = book.Sheets[name], ref = source?.["!fullref"] || source?.["!ref"] || null;
    const range = ref ? XLSX.utils.decode_range(ref) : null;
    if (range && (!Number.isSafeInteger(range.e.r) || range.e.r > 1048575 || range.e.c > 16383)) throw Error("range");
    const rows = range ? range.e.r + 1 : 0, columns = range ? range.e.c + 1 : 0;
    const sheet = { index, name, visibility: ["visible","hidden","very_hidden"][book.Workbook?.Sheets?.[index]?.Hidden || 0] || "hidden", range: ref, rows, columns, previewRows: source ? Math.min(rows,500) : 0, previewColumns: source ? Math.min(columns,40) : 0, cells: [], partial: !source || rows > 500 || columns > 40, inspected: Boolean(source) };
    outer: for (let row = 0; row < sheet.previewRows; row++) for (let column = 0; column < sheet.previewColumns; column++) {
      if (inspectedCells >= 20000 || textLeft <= 0) { sheet.partial = true; sheet.previewRows = row; break outer; }
      inspectedCells++;
      const cell = source["!data"]?.[row]?.[column];
      if (!cell) continue;
      const cached = cell.t !== "z" && cell.v !== undefined && cell.v !== null;
      const raw = !cached ? {text:null,truncated:false} : typeof cell.v === "string" ? bounded(cell.v) : { text: cell.v, truncated: false };
      const display = bounded(cached ? cell.w ?? cell.v ?? "" : "");
      const formula = cell.f ? bounded(cell.f) : null;
      const truncated = raw.truncated || display.truncated || Boolean(formula?.truncated);
      sheet.partial ||= truncated;
      sheet.cells.push({ address: XLSX.utils.encode_cell({r:row,c:column}), row, column, type: cell.t === "n" && XLSX.SSF.is_date(cell.z || "") ? "d" : cell.t || "z", raw: raw.text, display: display.text, ...(formula ? {formula:formula.text} : {}), cached, hyperlink: Boolean(cell.l), truncated });
    }
    return sheet;
  });
  const result = { parser: "sheetjs-ce-0.20.3-projection-v1", sheetCount: meta.SheetNames.length, sheets, partial: sheets.some(s=>s.partial), inspectedCells };
  if (Buffer.byteLength(JSON.stringify(result)) > 2000000) throw Error("projection_size");
  return result;
}
module.exports = { parse, container };
if (require.main === module) process.once("message", message => {
  try { const result = parse(Buffer.from(message.bytes,"base64")); process.send({ok:true,result},()=>process.exit(0)); }
  catch { process.send({ok:false},()=>process.exit(1)); }
});
