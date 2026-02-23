import { obterInadimplentes } from './src/services/DashboardService.js';

async function rodarTeste() {
  console.log('--- Relatório de Pendências ---');
  
  const lista = await obterInadimplentes('03/2026');

  if (lista && lista.length > 0) {
    console.log('⚠️ Filhos com mensalidade pendente:');
    console.table(lista);
  } else {
    console.log('✅ Tudo em dia! Todos os filhos pagaram.');
  }
}

rodarTeste();