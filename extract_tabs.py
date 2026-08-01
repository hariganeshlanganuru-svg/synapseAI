import re
import sys

def main():
    try:
        with open('app/index.html', 'r', encoding='utf-8') as f:
            html = f.read()
        
        # Find all tab-panes
        panes = re.findall(r'<div[^>]*id=["\']([^"\']+)["\'][^>]*class=["\'][^"\']*tab-pane[^"\']*["\'][^>]*>', html)
        print("Tab panes found:", panes)
    except Exception as e:
        print("Error:", e)

if __name__ == '__main__':
    main()
