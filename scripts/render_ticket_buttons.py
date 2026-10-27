import os
import subprocess
from PIL import Image

def generate_ticket_html(theme):
    stub_width = 146
    is_dark = (theme == 'dark')
    
    bg_color = "#181512" if is_dark else "#1f1b16"
    text_color = "#f7f2e7" if is_dark else "#fffaf2"
    border_style = "1px solid rgba(240, 228, 206, 0.28);" if is_dark else "1px solid rgba(255, 255, 255, 0.08);"
    sub_color = "#bfb4a2" if is_dark else "rgba(255, 250, 242, 0.72)"
    badge_bg = "#e35d48" if is_dark else "#b9392a"
    dash_color = "rgba(240, 228, 206, 0.35)" if is_dark else "rgba(255, 250, 242, 0.35)"
    icon_bg = "rgba(238, 230, 214, 0.12)" if is_dark else "rgba(255, 250, 242, 0.14)"
    shadow = "0 14px 28px -8px rgba(0, 0, 0, 0.75)" if is_dark else "0 14px 28px -8px rgba(31, 27, 22, 0.45)"

    html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600;700&family=Inter:wght@600;700;800&display=swap');

  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  html, body {{
    background: transparent !important;
    width: 560px;
    height: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
  }}

  .ticket {{
    position: relative;
    width: 486px;
    height: 74px;
    border-radius: 10px;
    display: flex;
    align-items: stretch;
    background: {bg_color};
    color: {text_color};
    border: {border_style};
    box-shadow: {shadow};
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    -webkit-mask:
      radial-gradient(circle at calc(100% - {stub_width}px) 0, transparent 7px, #000 7.5px) top / 100% 51% no-repeat,
      radial-gradient(circle at calc(100% - {stub_width}px) 100%, transparent 7px, #000 7.5px) bottom / 100% 51% no-repeat;
    mask:
      radial-gradient(circle at calc(100% - {stub_width}px) 0, transparent 7px, #000 7.5px) top / 100% 51% no-repeat,
      radial-gradient(circle at calc(100% - {stub_width}px) 100%, transparent 7px, #000 7.5px) bottom / 100% 51% no-repeat;
  }}

  /* Ticket Body (Left) */
  .ticket-body {{
    flex: 1;
    display: flex;
    align-items: center;
    padding: 0 16px 0 20px;
    gap: 15px;
  }}

  .plane-icon {{
    width: 42px;
    height: 42px;
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    background: {icon_bg};
    color: {text_color};
  }}

  .body-text {{
    display: flex;
    flex-direction: column;
    gap: 3px;
  }}

  .main-title {{
    font-size: 19.5px;
    font-weight: 700;
    letter-spacing: -0.015em;
    line-height: 1.1;
    white-space: nowrap;
    color: {text_color};
  }}

  .sub-title {{
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    white-space: nowrap;
    color: {sub_color};
  }}

  /* Perforation line */
  .perforation {{
    width: 0;
    border-left: 1.5px dashed {dash_color};
    margin: 11px 0;
  }}

  /* Stub (Right) */
  .ticket-stub {{
    width: {stub_width}px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 0 10px;
    gap: 3px;
  }}

  .stub-tag {{
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: {sub_color};
  }}

  .stub-main {{
    display: flex;
    align-items: center;
    gap: 6px;
  }}

  .version-tag {{
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 0.02em;
    color: {text_color};
  }}

  .ext-badge {{
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 9.5px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    background: {badge_bg};
    color: #fffaf2;
  }}

  .stub-action {{
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 9.5px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: {text_color};
    opacity: 0.95;
  }}
</style>
</head>
<body>
  <div class="ticket">
    <div class="ticket-body">
      <div class="plane-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.3c.4-.2.6-.6.5-1.1z"/>
        </svg>
      </div>
      <div class="body-text">
        <div class="main-title">Download for Windows</div>
        <div class="sub-title">Standalone 64-bit · 100% Offline</div>
      </div>
    </div>

    <div class="perforation"></div>

    <div class="ticket-stub">
      <div class="stub-tag">BOARDING PASS</div>
      <div class="stub-main">
        <span class="version-tag">v0.1.0</span>
        <span class="ext-badge">.exe</span>
      </div>
      <div class="stub-action">
        Get Ticket
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </div>
    </div>
  </div>
</body>
</html>
"""
    return html

def render_ticket(theme):
    html = generate_ticket_html(theme)
    html_path = os.path.abspath(f"scripts/ticket_{theme}.html")
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html)
        
    raw_png = os.path.abspath(f"scripts/raw_{theme}.png")
    out_png = os.path.abspath(f"assets/download-ticket-{theme}.png")
    
    chrome = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    cmd = [
        chrome,
        "--headless",
        "--disable-gpu",
        "--hide-scrollbars",
        "--default-background-color=00000000",
        "--force-device-scale-factor=2",
        "--window-size=560,140",
        f"--screenshot={raw_png}",
        f"file:///{html_path}"
    ]
    subprocess.run(cmd, check=True)
    
    im = Image.open(raw_png)
    bbox = im.getbbox()
    if bbox:
        left = max(0, bbox[0] - 8)
        top = max(0, bbox[1] - 8)
        right = min(im.width, bbox[2] + 8)
        bottom = min(im.height, bbox[3] + 8)
        cropped = im.crop((left, top, right, bottom))
        cropped.save(out_png, "PNG")
        print(f"Saved {out_png} ({cropped.size[0]}x{cropped.size[1]})")
    else:
        im.save(out_png, "PNG")

if __name__ == "__main__":
    render_ticket("light")
    render_ticket("dark")
