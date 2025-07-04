#!/usr/bin/env node

/**
 * Script para probar los cron jobs localmente
 * Uso: node test-cron.mjs [puerto] [job-type]
 * Ejemplo: node test-cron.mjs 3000 reset-classes
 */

import { config } from 'dotenv';

// Cargar variables de entorno
config({ path: '.env.local' });

const port = process.argv[2] || '3000';
const jobType = process.argv[3] || 'reset-classes';
const baseUrl = `http://localhost:${port}`;

const CRON_SECRET = process.env.CRON_SECRET || 'mi-secreto-super-seguro';

const endpoints = {
  'reset-classes': '/api/cron/reset-classes',
  'process-payments': '/api/cron/process-payments',
  'cleanup-announcements': '/api/cron/cleanup-announcements'
};

async function testCronJob(endpoint) {
  const url = `${baseUrl}${endpoint}`;
  
  console.log(`🚀 Probando cron job: ${endpoint}`);
  console.log(`📍 URL: ${url}`);
  console.log(`🔑 Secret: ${CRON_SECRET.substring(0, 5)}...`);
  console.log('');

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Respuesta exitosa:');
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log('❌ Error en la respuesta:');
      console.log(JSON.stringify(data, null, 2));
    }
    
  } catch (error) {
    console.log('💥 Error de conexión:');
    console.error(error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Asegúrate de que el servidor esté corriendo:');
      console.log(`   pnpm dev`);
    }
  }
}

async function main() {
  console.log('🧪 Test de Cron Jobs - Siam May');
  console.log('================================\n');

  if (jobType === 'all') {
    console.log('🔄 Probando todos los cron jobs...\n');
    
    for (const [, endpoint] of Object.entries(endpoints)) {
      await testCronJob(endpoint);
      console.log('\n' + '-'.repeat(50) + '\n');
    }
  } else if (endpoints[jobType]) {
    await testCronJob(endpoints[jobType]);
  } else {
    console.log('❌ Tipo de trabajo no válido.');
    console.log('Tipos disponibles:', Object.keys(endpoints).join(', '), 'all');
    process.exit(1);
  }
}

main().catch(console.error); 