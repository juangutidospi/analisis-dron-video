/**
 * Helper de estilos: css`…` → CSSStyleSheet adoptable por un shadow root.
 * @param {TemplateStringsArray} strings
 * @param {...unknown} values
 * @returns {CSSStyleSheet}
 */
export function css(strings, ...values) {
  const text = strings.reduce((out, s, i) => out + s + (values[i] ?? ''), '');
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(text);
  return sheet;
}
