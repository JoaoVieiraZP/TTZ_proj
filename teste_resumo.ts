// O nome dentro das chaves { } deve ser exatamente igual ao exportado
import { obterResumoPorCategoria } from './src/services/DashboardService.js';

async function rodarTeste() {
  // Agora você chama o novo nome
  const resumo = await obterResumoPorCategoria('03/2026', 'FESTA');
  console.table(resumo);
}

rodarTeste();