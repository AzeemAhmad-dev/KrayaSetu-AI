import urllib.request
import re

url = "https://kraya-setu-ai.vercel.app"
print(f"Fetching {url}...")
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})

try:
    with urllib.request.urlopen(req) as resp:
        html = resp.read().decode("utf-8")
        print("HTML length:", len(html))
        scripts = re.findall(r'src=["\'](/assets/[^"\']+\.js)["\']', html)
        print("Scripts found:", scripts)
        for s in scripts:
            js_url = url + s
            print(f"Fetching JS: {js_url}...")
            js_req = urllib.request.Request(js_url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(js_req) as js_resp:
                content = js_resp.read().decode("utf-8")
                render_urls = set(re.findall(r'https?://[a-zA-Z0-9_\-\.]+\.onrender\.com[^\s"\'\)]*', content))
                api_bases = set(re.findall(r'https?://[a-zA-Z0-9_\-\.:]+(?=/api)', content))
                print("Render URLs found:", render_urls)
                print("API Base URLs found:", api_bases)
                # Look for API_BASE or /api
                api_patterns = set(re.findall(r'https?://[a-zA-Z0-9_\-\.]+', content))
                print("All domains found in JS:", [d for d in api_patterns if "vercel" in d or "render" in d or "railway" in d or "github" in d])
except Exception as e:
    print("Error:", e)
