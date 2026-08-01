import sys
sys.stdout.reconfigure(encoding='utf-8')
with open("app/index.html", "r", encoding="utf-8") as f:
    lines = f.readlines()

# Find manager dashboard rendering
for i, line in enumerate(lines):
    stripped = line.strip()
    if "role_dashboard" in stripped or "Manager" in stripped and "config" in stripped.lower():
        print(f"Line {i+1}: {stripped[:150]}")
