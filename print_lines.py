with open('temp_script_3.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(5968, min(len(lines), 6040)):
    print(f"{i+1}: {lines[i].rstrip()}")
