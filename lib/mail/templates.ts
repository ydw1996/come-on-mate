export function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export function plainTextToHtml(body: string) {
  return `<!doctype html>
<html lang="ko">
  <body style="margin:0;padding:16px;font-family:Arial,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#111827;font-size:14px;line-height:1.7;">
    <div style="white-space:pre-wrap;word-break:keep-all;overflow-wrap:anywhere;">${escapeHtml(body)}</div>
  </body>
</html>`
}
