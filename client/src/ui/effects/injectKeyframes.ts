export function injectKeyframes(id: string, css: string) {
  if (typeof document === "undefined") return;
  let style = document.getElementById(id);
  if (!style) {
    style = document.createElement("style");
    style.id = id;
    document.head.appendChild(style);
  }
  style.textContent = css;
}
