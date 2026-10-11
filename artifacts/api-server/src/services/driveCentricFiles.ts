/** Pure feed validation, shared by the importer and read-only diagnostics. */
export function parseCsv(content: string): Record<string, string>[] {
  const records: string[][] = [];
  let record: string[] = [], value = "", quoted = false;
  const input = content.replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (c === '"') {
      if (quoted && input[i + 1] === '"') { value += '"'; i++; }
      else if (quoted || value === "") quoted = !quoted;
      else throw new Error("Invalid CSV quote");
    } else if (!quoted && (c === "," || c === "\n" || c === "\r")) {
      record.push(value); value = "";
      if (c !== ",") {
        if (record.some(v => v !== "")) records.push(record);
        record = [];
        if (c === "\r" && input[i + 1] === "\n") i++;
      }
    } else value += c;
  }
  if (quoted) throw new Error("Unterminated CSV field");
  if (value || record.length) { record.push(value); records.push(record); }
  const headers = records.shift();
  if (!headers) return [];
  if (new Set(headers).size !== headers.length) throw new Error("Duplicate CSV headers");
  return records.map(row => {
    if (row.length !== headers.length) throw new Error("CSV row does not match header width");
    return Object.fromEntries(headers.map((h, i) => [h, row[i]]));
  });
}

export interface FeedEntry { name: string; type: string; }
const filename = /^(\d+)_v2_([a-z]+)_(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})_(\d{12})\.csv$/i;
export function selectLatestBatch(entries: FeedEntry[], remotePath: string, store: string, now = Date.now()) {
  if (!/^\d+$/.test(store)) throw new Error("Expected store number is missing or invalid");
  const files = entries.filter(e => e.type === "-").map(e => ({name:e.name,parts:filename.exec(e.name)}))
    .filter(f => f.parts && f.parts[1] === store);
  const deals = files.filter(f => f.parts![2].toLowerCase() === "deal")
    .sort((a,b) => b.parts![5].localeCompare(a.parts![5]));
  if (!deals.length) {
    const observed = [...new Set(entries.flatMap(e => filename.exec(e.name)?.[1] ?? []))].sort();
    throw new Error(`No deal exports for expected store ${store}; observed stores: ${observed.join(", ") || "none"}`);
  }
  const latest = deals[0], parts = latest.parts!, stamp = parts[5];
  const exportedAt = Date.parse(`${stamp.slice(0,4)}-${stamp.slice(4,6)}-${stamp.slice(6,8)}T${stamp.slice(8,10)}:${stamp.slice(10,12)}:00Z`);
  const dataEnd = Date.parse(`${parts[4]}T23:59:59Z`);
  if (!Number.isFinite(exportedAt) || !Number.isFinite(dataEnd) || exportedAt > now + 24*3600_000 || dataEnd > now + 24*3600_000)
    throw new Error(`Invalid export date for store ${store}`);
  if (now-exportedAt > 72*3600_000 || now-dataEnd > 72*3600_000)
    throw new Error(`Stale export for store ${store}: ${latest.name}; daily feed is more than 72 hours old`);
  const find = (table: string) => {
    const matches = files.filter(f => f.parts![2].toLowerCase() === table && f.parts![3] === parts[3] && f.parts![4] === parts[4] && f.parts![5] === stamp);
    if (matches.length !== 1) throw new Error(`Incomplete or ambiguous batch for store ${store}: ${table} (${stamp})`);
    return `${remotePath.replace(/\/$/, "")}/${matches[0].name}`;
  };
  return {deal:find("deal"),customer:find("customer"),contact:find("customercontact"),sourceGroup:find("sourcedescriptiongroup"),storeInfo:find("storeinfo"),storeNum:store};
}

export function validateStoreRows(expectedStoreId: string, storeInfo: Record<string,string>[], tables: Record<string,Record<string,string>[]>) {
  if (!expectedStoreId) throw new Error("sftp_store_id must identify the verified dealership before importing");
  if (storeInfo.length !== 1 || storeInfo[0].StoreId !== expectedStoreId || storeInfo[0].IsDeleted === "1")
    throw new Error("StoreInfo does not match the configured dealership; import refused");
  for (const [table, rows] of Object.entries(tables)) {
    if (rows.some(row => row.StoreId !== expectedStoreId)) throw new Error(`${table} contains a missing or different StoreId; import refused`);
  }
}
