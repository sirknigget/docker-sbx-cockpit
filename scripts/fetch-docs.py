"""Discover Docker Sandbox pages via sitemap; fetch only Markdown page bodies."""
import concurrent.futures
import datetime
import json
import pathlib
import urllib.request
import xml.etree.ElementTree as ET

ROOT = pathlib.Path(__file__).resolve().parents[1] / 'docs' / 'docker-sandboxes'
BASE = 'https://docs.docker.com'

def fetch(url):
    with urllib.request.urlopen(url, timeout=60) as response:
        return response.read()

def download(url):
    prefix = '/ai/sandboxes' if '/ai/sandboxes' in url else '/reference/cli/sbx'
    relative = url.removeprefix(BASE + prefix).strip('/')
    if prefix == '/reference/cli/sbx':
        relative = 'cli/' + (relative or 'index')
    markdown_url = url.rstrip('/') + '.md'
    destination = ROOT / ((relative or 'index') + '.md')
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(fetch(markdown_url))
    return {'source': markdown_url, 'file': str(destination.relative_to(ROOT))}

if __name__ == '__main__':
    sitemap = ET.fromstring(fetch(BASE + '/sitemap.xml'))
    urls = sorted({node.text for node in sitemap.iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc') if node.text and (node.text.startswith(BASE + '/ai/sandboxes/') or node.text.startswith(BASE + '/reference/cli/sbx/'))})
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        pages = list(pool.map(download, urls))
    (ROOT / 'manifest.json').write_text(json.dumps({'fetched_at': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'pages': pages}, indent=2) + '\n')
    print(f'Saved {len(pages)} Markdown pages in {ROOT}')
