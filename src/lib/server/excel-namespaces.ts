import JSZip from 'jszip';
import { SaxesParser } from 'saxes';
import { escapeText } from '../data/repomit.ts';

// ExcelJS expects unprefixed SpreadsheetML elements. Other valid XLSX writers
// (including our template exporter) use x:workbook / x:worksheet instead.
// Normalize using a namespace-aware XML parser, never replacements in cell text.
export async function normalizeExcelNamespaces(buffer: Buffer): Promise<Buffer> {
  const zip = await JSZip.loadAsync(buffer);
  let changed = false;
  const main = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  for (const entry of Object.values(zip.files)) {
    if (!/^xl\/(workbook|styles|sharedStrings|worksheets\/[^/]+)\.xml$/.test(entry.name)) continue;
    const xml = await entry.async('string');
    if (!xml.includes(`="${main}"`) || !/xmlns:[\w.-]+=/.test(xml)) continue;
    const parser = new SaxesParser({ xmlns: true });
    const pieces: string[] = [];
    let normalized = false;
    parser.on('opentag', (tag) => {
      const isMain = tag.uri === main;
      if (isMain && tag.prefix) normalized = true;
      const name = isMain ? tag.local : tag.name;
      const attrs = Object.values(tag.attributes)
        .map((a) => {
          if (isMain && tag.prefix && a.name === 'xmlns') return '';
          if (a.name.startsWith('xmlns:') && a.value === main) return '';
          return ` ${a.name}="${escapeText(a.value).replace(/"/g, '&quot;')}"`;
        })
        .join('');
      pieces.push(`<${name}${attrs}${isMain && tag.prefix ? ` xmlns="${main}"` : ''}>`);
    });
    parser.on('closetag', (tag) => pieces.push(`</${tag.uri === main ? tag.local : tag.name}>`));
    parser.on('text', (value) => pieces.push(escapeText(value)));
    parser.on('cdata', (value) => pieces.push(escapeText(value)));
    parser.on('doctype', () => {
      throw new Error('DTD no admitido');
    });
    parser.write(xml).close();
    if (normalized) {
      zip.file(entry.name, pieces.join(''));
      changed = true;
    }
  }
  return changed ? zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }) : buffer;
}
