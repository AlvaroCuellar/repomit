// Keep useful formatting from Word/web copy-paste without importing fonts, images or scripts.
export function cleanPastedHtml(html: string): string {
  const template = document.createElement('template');
  template.innerHTML = html;
  const escape = (text: string) =>
    (text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  function walk(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return escape(node.textContent || '');
    if (!(node instanceof HTMLElement)) return '';
    const tag = node.tagName.toLowerCase();
    if (['script', 'style', 'iframe', 'object', 'svg', 'img', 'input', 'button'].includes(tag))
      return '';
    let contents = Array.from(node.childNodes).map(walk).join('');
    if (tag === 'br') return '<br>';
    if (tag === 'a') {
      const href = node.getAttribute('href') || '';
      return /^(https?:\/\/|mailto:|\/(?!\/))/.test(href)
        ? `<a href="${escape(href)}">${contents}</a>`
        : contents;
    }
    if (tag === 'i' || tag === 'em' || node.style.fontStyle === 'italic')
      contents = `<em>${contents}</em>`;
    if (
      tag === 'b' ||
      tag === 'strong' ||
      ['bold', '700', '800', '900'].includes(node.style.fontWeight)
    )
      contents = `<strong>${contents}</strong>`;
    if (['p', 'div', 'li'].includes(tag)) return `${contents}<br>`;
    if (['sup', 'sub'].includes(tag)) return `<${tag}>${contents}</${tag}>`;
    return contents;
  }
  return Array.from(template.content.childNodes).map(walk).join('');
}
