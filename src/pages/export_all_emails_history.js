import fs from 'fs';
import ExcelJS from 'exceljs';

const API_URL = 'https://app.jobnimbus.com/api1/contacts';
const BEARER_TOKEN = 'mndllanw80z3eh6d';

async function exportAllContactsWithEmail() {
    let contacts = [];
    let from = 0;
    const size = 1000; // Aumentamos a 1000 para ir más rápido ya que es histórico
    let hasMore = true;

    // Filtro para traer solo contactos que tengan el campo email con datos
    const filterObj = {
        "must": [
            { "exists": { "field": "email" } }
        ]
    };
    const encodedFilter = encodeURIComponent(JSON.stringify(filterObj));

    console.log(`🚀 Iniciando extracción HISTÓRICA de todos los contactos con EMAIL...`);

    while (hasMore) {
        // Quitamos límites de fecha, traemos todo ordenado por fecha de creación
        const url = `${API_URL}?size=${size}&from=${from}&sort_field=date_created&sort_direction=asc&filter=${encodedFilter}`;

        try {
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${BEARER_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error(`Error API: ${response.status}`);

            const data = await response.json();
            const results = data.results || [];

            if (results.length === 0) break;

            results.forEach(record => {
                // Validación extra de seguridad por si 'exists' trae strings vacíos
                if (record.email && record.email.trim() !== "") {
                    contacts.push({
                        id: record.jnid,
                        name: record.display_name || `${record.first_name} ${record.last_name}`,
                        email: record.email.toLowerCase().trim(),
                        phone: record.mobile_phone || record.home_phone || 'N/A',
                        city: record.city || 'N/A',
                        state: record.state_text || 'N/A',
                        date: new Date(record.date_created * 1000).toLocaleDateString(),
                        status: record.status_name
                    });
                }
            });

            process.stderr.write(`Registros procesados: ${from + results.length} | Con Email: ${contacts.length}\r`);

            from += size;

            if (results.length < size) hasMore = false;

        } catch (error) {
            console.error('\n❌ Error en la descarga:', error.message);
            hasMore = false;
        }
    }

    if (contacts.length === 0) {
        console.log("\n\n⚠️ No se encontraron contactos con email.");
        return;
    }

    // --- Generación de Excel ---
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Historical Emails');

    sheet.columns = [
        { header: 'ID', key: 'id', width: 20 },
        { header: 'Full Name', key: 'name', width: 25 },
        { header: 'Email', key: 'email', width: 35 },
        { header: 'Phone', key: 'phone', width: 15 },
        { header: 'City', key: 'city', width: 15 },
        { header: 'State', key: 'state', width: 10 },
        { header: 'Created Date', key: 'date', width: 15 },
        { header: 'Status', key: 'status', width: 15 }
    ];

    // Estilo profesional
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '00B050' } }; // Verde para diferenciarlo

    sheet.addRows(contacts);
    sheet.autoFilter = 'A1:H1';

    const fileName = `Full_Historical_Emails.xlsx`;
    await workbook.xlsx.writeFile(fileName);

    console.log(`\n\n✅ ¡Finalizado!`);
    console.log(`📊 Total contactos con email: ${contacts.length}`);
    console.log(`📂 Archivo generado: ${fileName}`);
}

exportAllContactsWithEmail();