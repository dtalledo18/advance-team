/*const API_URL = 'https://app.jobnimbus.com/api1/contacts';
const BEARER_TOKEN = 'mndllanw80z3eh6d'; // Reemplaza con tu token real
const LIMIT = 100;

async function getZipCounts() {
    let zipCounts = {};
    let offset = 0;
    let hasMore = true;

    console.error('⏳ Descargando registros... Por favor espera.');

    while (hasMore) {
        try {
            // Filtramos por IL para reducir la carga
            const response = await fetch(`${API_URL}?state_text=IL&limit=${LIMIT}&offset=${offset}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${BEARER_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error(`Error: ${response.status}`);

            const data = await response.json();
            const results = data.results || [];

            if (results.length === 0) break;

            results.forEach(record => {
                const zip = record.zip;
                if (zip) {
                    zipCounts[zip] = (zipCounts[zip] || 0) + 1;
                }
            });

            // Usamos console.error para los mensajes de progreso para que no se mezclen con el JSON final
            process.stderr.write(`Procesados: ${offset + results.length} / ${data.count}\r`);

            offset += LIMIT;
            if (offset >= data.count) hasMore = false;

        } catch (error) {
            console.error('\n❌ Error:', error.message);
            hasMore = false;
        }
    }

    // Imprimimos solo el JSON final en la consola
    console.log('\n--- COPIA DESDE AQUÍ ---');
    console.log(JSON.stringify(zipCounts, null, 2));
    console.log('--- HASTA AQUÍ ---');
}

getZipCounts();*/

import fs from 'fs';
const API_URL = 'https://app.jobnimbus.com/api1/contacts';
const BEARER_TOKEN = 'mndllanw80z3eh6d'; // Tu token
const LIMIT = 100;
const TARGET_CITY = 'Bolingbrook';

async function exportBolingbrookContacts() {
    let contacts = [];
    let offset = 0;
    let hasMore = true;

    console.error(`🔍 Buscando contactos en ${TARGET_CITY}...`);

    while (hasMore) {
        try {
            // Filtramos inicialmente por IL para optimizar la respuesta
            const response = await fetch(`${API_URL}?state_text=IL&limit=${LIMIT}&offset=${offset}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${BEARER_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error(`Error API: ${response.status}`);

            const data = await response.json();
            const results = data.results || [];

            if (results.length === 0) break;

            // Filtro local estricto por ciudad
            const filtered = results.filter(record =>
                record.city && record.city.toLowerCase() === TARGET_CITY.toLowerCase()
            );

            // Solo guardamos los campos necesarios para el outreach
            filtered.forEach(record => {
                contacts.push({
                    'First Name': record.first_name || '',
                    'Last Name': record.last_name || '',
                    'Email': record.email || '',
                    'Phone': record.mobile_phone || record.home_phone || '',
                    'Address': record.address_line1 || '',
                    'Zip': record.zip || '',
                    'Status': record.status_name || ''
                });
            });

            process.stderr.write(`Procesados: ${offset + results.length} | Encontrados en ${TARGET_CITY}: ${contacts.length}\r`);

            offset += LIMIT;
            if (offset >= data.count) hasMore = false;

        } catch (error) {
            console.error('\n❌ Error durante la descarga:', error.message);
            hasMore = false;
        }
    }

    // Generar archivo CSV (que se abre directamente en Excel)
    const csvHeader = Object.keys(contacts[0]).join(',') + '\n';
    const csvRows = contacts.map(c =>
        Object.values(c).map(v => `"${v}"`).join(',')
    ).join('\n');

    const fileName = `Contacts_${TARGET_CITY}.csv`;
    fs.writeFileSync(fileName, csvHeader + csvRows);

    console.log(`\n\n✅ ¡Éxito! Se han exportado ${contacts.length} contactos.`);
    console.log(`📂 Archivo guardado como: ${fileName}`);
}

exportBolingbrookContacts();