with open('app/index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'HR Operations & Talent Command Center' in line or 'HR Specialist Portal' in line or 'feat_hr' in line:
        print(f"Line {i+1}: {line.strip()[:110]}")
