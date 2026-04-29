import fs from 'fs';
import ExcelJS from 'exceljs';

const API_URL = 'https://app.jobnimbus.com/api1/contacts';
const BEARER_TOKEN = 'mndllanw80z3eh6d';
const TARGET_CITY = 'bolingbrook'; // En minúsculas para el filtro term
const LIMIT_DATE = 1798761600

async function exportOldBolingbrookContacts() {
    let contacts = [];
    let from = 0;
    const size = 100; // Tamaño de página estable
    let hasMore = true;

    // El filtro que probaste y funcionó
    const filterObj = {
        "must": [
            { "term": { "city": TARGET_CITY } },
            { "term": { "state_text": "il" } }
        ]
    };
    const encodedFilter = encodeURIComponent(JSON.stringify(filterObj));

    console.log(`🚀 Iniciando extracción filtrada para ${TARGET_CITY.toUpperCase()}...`);

    while (hasMore) {
        const url = `${API_URL}?size=${size}&from=${from}&sort_field=date_created&sort_direction=asc&filter=${encodedFilter}`;

        try {
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${BEARER_TOKEN}` }
            });

            if (!response.ok) throw new Error(`Error API: ${response.status}`);

            const data = await response.json();
            const results = data.results || [];

            if (results.length === 0) break;

            results.forEach(record => {
                // Filtro de fecha estricto (2025 para atrás)
                if (record.date_created && record.date_created <= LIMIT_DATE) {
                    contacts.push({
                        id: record.jnid,
                        name: record.display_name || `${record.first_name} ${record.last_name}`,
                        email: record.email || 'N/A',
                        phone: record.mobile_phone || record.home_phone || 'N/A',
                        address: record.address_line1 || 'N/A',
                        date: new Date(record.date_created * 1000).toLocaleDateString(),
                        status: record.status_name
                    });
                }
            });

            process.stderr.write(`Analizados en Bolingbrook: ${from + results.length} | Válidos (<2025): ${contacts.length}\r`);

            // Paginación oficial
            from += size;

            // Si la página actual es menor al size, llegamos al final de Bolingbrook
            if (results.length < size) hasMore = false;

        } catch (error) {
            console.error('\n❌ Error en la descarga:', error.message);
            hasMore = false;
        }
    }

    if (contacts.length === 0) {
        console.log("\n\n⚠️ No se encontraron contactos antiguos con esos filtros.");
        return;
    }

    // --- Generación de Excel Profesional ---
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Outreach Bolingbrook');

    sheet.columns = [
        { header: 'ID', key: 'id', width: 25 },
        { header: 'Full Name', key: 'name', width: 25 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Phone', key: 'phone', width: 15 },
        { header: 'Address', key: 'address', width: 35 },
        { header: 'Created Date', key: 'date', width: 15 },
        { header: 'Status', key: 'status', width: 15 }
    ];

    // Estilo de encabezado
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2F5597' } };

    sheet.addRows(contacts);
    sheet.autoFilter = 'A1:G1';

    const fileName = `Outreach_${TARGET_CITY.toUpperCase()}_Archive.xlsx`;
    await workbook.xlsx.writeFile(fileName);

    console.log(`\n\n✅ ¡Éxito! Se exportaron ${contacts.length} contactos únicos.`);
    console.log(`📂 Archivo: ${fileName}`);
}

exportOldBolingbrookContacts();