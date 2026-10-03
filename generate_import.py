import csv
import uuid

org_id = "00000000-0000-0000-0000-0000000000a1"
sql = []

# Customers
with open('docs/data/customers-import.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        name = row['name'].replace("'", "''")
        phone = f"'{row['phone']}'" if row['phone'] else 'null'
        city = f"'{row['city']}'" if row['city'] else 'null'
        addr = f"'{row['address']}'" if row['address'] else 'null'
        typ = f"'{row['type']}'" if row['type'] else "'customer'"
        ob = row['opening_balance'] or '0'
        sql.append(f"INSERT INTO public.parties (organization_id, name, phone, city, address, type, opening_balance) VALUES ('{org_id}', '{name}', {phone}, {city}, {addr}, {typ}, {ob}) ON CONFLICT DO NOTHING;")

# Products
with open('docs/data/products-import.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        prod = row['product'].replace("'", "''")
        qual = row['quality'].replace("'", "''")
        size = row['size'].replace("'", "''")
        price = row['price']
        unit = row['unit']

        # insert product
        sql.append(f"INSERT INTO public.products (organization_id, name) VALUES ('{org_id}', '{prod}') ON CONFLICT (organization_id, lower(name)) DO NOTHING;")
        # insert grade
        sql.append(f"INSERT INTO public.grades (organization_id, product_id, name) SELECT '{org_id}', id, '{qual}' FROM public.products WHERE name = '{prod}' AND organization_id = '{org_id}' ON CONFLICT (product_id, lower(name)) DO NOTHING;")
        # insert size
        sql.append(f"INSERT INTO public.sizes (organization_id, product_id, label) SELECT '{org_id}', id, '{size}' FROM public.products WHERE name = '{prod}' AND organization_id = '{org_id}' ON CONFLICT (product_id, label) DO NOTHING;")
        
        # variants are auto-created by triggers! We just need to insert the rate.
        sql.append(f"""
INSERT INTO public.rates (organization_id, variant_id, rate, rate_unit)
SELECT '{org_id}', v.id, {price}, '{unit}'
FROM public.variants v
JOIN public.products p ON p.id = v.product_id
JOIN public.grades g ON g.id = v.grade_id
JOIN public.sizes s ON s.id = v.size_id
WHERE p.name = '{prod}' AND g.name = '{qual}' AND s.label = '{size}' AND v.organization_id = '{org_id}';
""")

with open('supabase/import_data.sql', 'w', encoding='utf-8') as f:
    f.write('\n'.join(sql))
