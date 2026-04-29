import fs from 'fs';
import ExcelJS from 'exceljs';

const API_URL = 'https://app.jobnimbus.com/api1';
const BEARER_TOKEN = 'mndllanw80z3eh6d';
const TARGET_CITY = 'bolingbrook';
const LIMIT_DATE = 1767225600; // 1 de Enero 2026

async function fetchAllJobs() {
    let jobsMap = new Map();
    let from = 0;
    const size = 1000;
    let hasMore = true;

    console.log('🚀 Descargando e indexando Jobs...');

    while (hasMore) {
        // Ordenamos por fecha ascendente para asegurar consistencia
        const url = `${API_URL}/jobs?size=${size}&from=${from}&sort_field=date_created&sort_direction=asc`;

        try {
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${BEARER_TOKEN}` }
            });
            const data = await res.json();
            const results = data.results || [];

            if (results.length === 0) break;

            results.forEach(job => {
                // Usamos el ID del primary (contacto) como llave
                const contactId = job.primary?.id;
                if (contactId) {
                    if (!jobsMap.has(contactId)) jobsMap.set(contactId, []);
                    jobsMap.get(contactId).push(job);
                }
            });

            process.stderr.write(`Jobs procesados: ${from + results.length}\r`);
            from += size;
            if (results.length < size) hasMore = false;
        } catch (e) {
            console.error('\n❌ Error cargando jobs:', e.message);
            hasMore = false;
        }
    }
    console.log(`\n✅ Jobs indexados correctamente.`);
    return jobsMap;
}

async function main() {
    // 1. Cargamos los Jobs primero
    const jobsByContact = await fetchAllJobs();

    // 2. Preparamos extracción de Contactos
    let finalData = [];
    let from = 0;
    const size = 100;
    let hasMore = true;

    const filterObj = {
        "must": [
            { "term": { "city": TARGET_CITY } },
            { "term": { "state_text": "il" } }
        ]
    };
    const encodedFilter = encodeURIComponent(JSON.stringify(filterObj));

    console.log(`🔍 Buscando contactos en ${TARGET_CITY.toUpperCase()}...`);

    while (hasMore) {
        const url = `${API_URL}/contacts?size=${size}&from=${from}&sort_field=date_created&sort_direction=asc&filter=${encodedFilter}`;

        try {
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${BEARER_TOKEN}` }
            });
            const data = await response.json();
            const results = data.results || [];

            if (results.length === 0) break;

            results.forEach(contact => {
                // Filtro de fecha para el contacto
                if (contact.date_created && contact.date_created <= LIMIT_DATE) {

                    // BUSCAR MATCH CON JOBS
                    const relatedJobs = jobsByContact.get(contact.jnid) || [];

                    // Filtramos solo jobs que también sean de la fecha requerida
                    const validJobs = relatedJobs.filter(j => j.date_created && j.date_created <= LIMIT_DATE);

                    if (validJobs.length > 0) {
                        // Tomamos el job más reciente dentro del rango permitido
                        const lastJob = validJobs.sort((a, b) => b.date_created - a.date_created)[0];

                        finalData.push({
                            contact_id: contact.jnid,
                            name: contact.display_name || `${contact.first_name} ${contact.last_name}`,
                            email: contact.email || 'N/A',
                            phone: contact.mobile_phone || contact.home_phone || 'N/A',
                            contact_date: new Date(contact.date_created * 1000).toLocaleDateString(),
                            job_type: lastJob.record_type_name || 'N/A',
                            job_created_by: lastJob.created_by_name || 'N/A',
                            job_date: new Date(lastJob.date_created * 1000).toLocaleDateString(),
                            job_url: `https://app.jobnimbus.com/job/${lastJob.jnid}`,
                            description: (lastJob.description || '').replace(/[\r\n]+/g, ' ')
                        });
                    }
                }
            });

            process.stderr.write(`Contactos analizados: ${from + results.length} | Matches con Jobs: ${finalData.length}\r`);

            from += size;
            if (results.length < size) hasMore = false;
        } catch (e) {
            console.error('\n❌ Error en contactos:', e.message);
            hasMore = false;
        }
    }

    if (finalData.length === 0) {
        console.log("\n\n⚠️ No se encontraron matches entre contactos y jobs para esos criterios.");
        return;
    }

    // --- Generación de Excel ---
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Bolingbrook Jobs History');

    sheet.columns = [
        { header: 'Contact ID', key: 'contact_id', width: 20 },
        { header: 'Customer Name', key: 'name', width: 25 },
        { header: 'Email', key: 'email', width: 25 },
        { header: 'Phone', key: 'phone', width: 15 },
        { header: 'Contact Created', key: 'contact_date', width: 15 },
        { header: 'Last Job Type', key: 'job_type', width: 20 },
        { header: 'Job Created By', key: 'job_created_by', width: 20 },
        { header: 'Job Date', key: 'job_date', width: 15 },
        { header: 'Job URL', key: 'job_url', width: 40 },
        { header: 'Job Description', key: 'description', width: 50 }
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2F5597' } };

    sheet.addRows(finalData);
    sheet.autoFilter = 'A1:J1';

    const fileName = `Outreach_Bolingbrook_Jobs_Archive.xlsx`;
    await workbook.xlsx.writeFile(fileName);

    console.log(`\n\n✅ Proceso completado.`);
    console.log(`📊 Total registros con Jobs: ${finalData.length}`);
    console.log(`📂 Archivo: ${fileName}`);
}

main();