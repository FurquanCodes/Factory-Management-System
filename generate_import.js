const fs = require('fs');

const orgId = "00000000-0000-0000-0000-0000000000a1";
const sql = [];

// Customers (Strip carriage returns for Windows)
const customersCsv = fs.readFileSync('docs/data/customers-import.csv', 'utf-8').replace(/\r/g, '').trim().split('\n').slice(1);
for (const line of customersCsv) {
  if (!line) continue;
  let [name, phone, city, address, type, ob] = line.split(',');
  name = name.replace(/'/g, "''");
  phone = phone ? `'${phone}'` : 'null';
  city = city ? `'${city}'` : 'null';
  address = address ? `'${address}'` : 'null';
  type = type ? `'${type}'` : "'customer'";
  ob = ob || '0';
  sql.push(`INSERT INTO public.parties (organization_id, name, phone, city, address, type, opening_balance) VALUES ('${orgId}', '${name}', ${phone}, ${city}, ${address}, ${type}, ${ob}) ON CONFLICT DO NOTHING;`);
}

// Products (Strip carriage returns for Windows)
const productsText = fs.readFileSync('docs/data/products-import.csv', 'utf-8').replace(/\r/g, '').trim().split('\n').slice(1);
for (const line of productsText) {
  if (!line) continue;
  const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
  let prod = parts[0].replace(/'/g, "''").replace(/"/g, '');
  let qual = parts[1].replace(/'/g, "''").replace(/"/g, '');
  let size = parts[2].replace(/'/g, "''").replace(/"/g, '');
  let price = parts[3];
  let unit = parts[4].replace(/"/g, '').trim(); // Just extra safe trim here

  sql.push(`INSERT INTO public.products (organization_id, name) VALUES ('${orgId}', '${prod}') ON CONFLICT (organization_id, lower(name)) WHERE deleted_at IS NULL DO NOTHING;`);
  sql.push(`INSERT INTO public.grades (organization_id, product_id, name) SELECT '${orgId}', id, '${qual}' FROM public.products WHERE name = '${prod}' AND organization_id = '${orgId}' ON CONFLICT (product_id, lower(name)) WHERE deleted_at IS NULL DO NOTHING;`);
  sql.push(`INSERT INTO public.sizes (organization_id, product_id, label) SELECT '${orgId}', id, '${size}' FROM public.products WHERE name = '${prod}' AND organization_id = '${orgId}' ON CONFLICT (product_id, label) WHERE deleted_at IS NULL DO NOTHING;`);
  
  sql.push(`
INSERT INTO public.rates (organization_id, variant_id, rate, rate_unit)
SELECT '${orgId}', v.id, ${price}, '${unit}'
FROM public.variants v
JOIN public.products p ON p.id = v.product_id
JOIN public.grades g ON g.id = v.grade_id
JOIN public.sizes s ON s.id = v.size_id
WHERE p.name = '${prod}' AND g.name = '${qual}' AND s.label = '${size}' AND v.organization_id = '${orgId}';
  `.trim());
}

fs.writeFileSync('supabase/import_data.sql', sql.join('\n\n'));
