import json

with open(r'C:\Users\kevin\Desktop\kNIHexplorer040526\data\analytics.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

errors = [x for x in d if x.get('error') or x.get('status') != 200 or x.get('has_data') == 0]
print(f'Total: {len(d)}, Errors/empty: {len(errors)}')
for e in sorted(errors, key=lambda x: x.get('source', '')):
    src = e['source']
    status = e['status']
    has_data = e['has_data']
    items = e.get('items_count', 0)
    err = str(e.get('error', ''))[:100]
    print(f'  {src} | status={status} | has_data={has_data} | items={items} | err={err}')