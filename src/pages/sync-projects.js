const API_URL = 'https://app.jobnimbus.com/api1/contacts';
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

getZipCounts();