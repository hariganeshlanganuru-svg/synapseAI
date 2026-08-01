with open('app/index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'DOMContentLoaded' in line or 'switchRole' in line or 'app-layout' in line:
        print(f"Line {i+1}: {line.strip()[:100]}")
