import { supabase } from './src/config/supabase.js';

async function pagarMesAtualEProximo() {
  console.log('Processando pagamento duplo...');

  // Criamos um array com os dois meses que o filho está pagando
  const pagamentos = [
    { 
      tipo: 'ENTRADA', 
      descricao: 'Mensalidade - Março', 
      valor: 50.00, 
      data_pagamento: '2026-02-23', // Data de hoje
      meio_pagamento: 'Pix',
      mes_referencia: '03/2026', 
      filho_id: 3 
    },
    { 
      tipo: 'ENTRADA', 
      descricao: 'Mensalidade - Abril (Antecipado)', 
      valor: 50.00, 
      data_pagamento: '2026-02-23', // Mesma data do Pix
      meio_pagamento: 'Pix',
      mes_referencia: '04/2026', 
      filho_id: 3 
    }
  ];

  // O Supabase aceita inserir um Array de objetos de uma vez só!
  const { data, error } = await supabase
    .from('financeiro')
    .insert(pagamentos)
    .select();

  if (error) {
    console.error('❌ Erro ao processar pagamento duplo:', error.message);
  } else {
    console.log('✅ Dois meses registrados com sucesso!', data);
  }
}

pagarMesAtualEProximo();