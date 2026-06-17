// src/lib/export.ts
// Client-side PNG and CSV export. No dependencies, no server.

function triggerDownload(url: string, filename: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * Copy computed colours/typography from a live SVG onto a clone, so the
 * serialized standalone SVG (where CSS variables don't resolve) still renders
 * correctly when rasterised.
 */
function inlineStyles(src: SVGSVGElement, clone: SVGSVGElement): void {
  const srcEls = src.querySelectorAll('*');
  const cloneEls = clone.querySelectorAll('*');
  for (let i = 0; i < srcEls.length; i++) {
    const cs = getComputedStyle(srcEls[i]);
    const el = cloneEls[i] as SVGElement;
    el.setAttribute('fill', cs.fill);
    el.setAttribute('stroke', cs.stroke);
    if (cs.strokeWidth) el.setAttribute('stroke-width', cs.strokeWidth);
    if (cs.opacity && cs.opacity !== '1') el.setAttribute('opacity', cs.opacity);
    if (cs.strokeDasharray && cs.strokeDasharray !== 'none') el.setAttribute('stroke-dasharray', cs.strokeDasharray);
    if (srcEls[i].tagName === 'text') {
      el.setAttribute('font-size', cs.fontSize);
      el.setAttribute('font-family', cs.fontFamily);
    }
  }
}

/** Rasterise an SVG element to a PNG and download it. */
export async function svgToPng(svg: SVGSVGElement, filename: string, scale = 2): Promise<void> {
  const vb = svg.viewBox.baseVal;
  const w = (vb && vb.width) || svg.clientWidth || 800;
  const h = (vb && vb.height) || svg.clientHeight || 450;

  const clone = svg.cloneNode(true) as SVGSVGElement;
  inlineStyles(svg, clone);
  clone.setAttribute('width', String(w));
  clone.setAttribute('height', String(h));
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  const xml = new XMLSerializer().serializeToString(clone);
  const url = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(xml)));

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = url;
  });

  const canvas = document.createElement('canvas');
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = getComputedStyle(document.body).backgroundColor || '#0f1115';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(scale, scale);
  ctx.drawImage(img, 0, 0);
  canvas.toBlob((blob) => {
    if (blob) triggerDownload(URL.createObjectURL(blob), filename);
  }, 'image/png');
}

/** Download a 2-D array as a CSV file. */
export function downloadCsv(filename: string, rows: (string | number)[][]): void {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const csv = rows.map((r) => r.map(esc).join(',')).join('\n');
  triggerDownload(URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), filename);
}
