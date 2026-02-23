import { supabase } from '../config/supabase';

export async function obterResumoPorCategoria(mesReferencia: string, categoria: string = 'MENSALIDADE') {
  console.log(`Calculando dashboard de ${categoria} para: ${mesReferencia}...`);

  const { data: movimentacoes, error } = await supabase
    .from('financeiro')
    .select('*')
    .eq('mes_referencia', mesReferencia)
    .eq('categoria', categoria); // Novo filtro por categoria

  if (error) {
    console.error('Erro ao buscar dados:', error.message);
    return;
  }

  let totalBruto = 0;
  let gastos = 0;

  movimentacoes?.forEach((mov: any) => {
    if (mov.tipo === 'ENTRADA') {
      totalBruto += Number(mov.valor);
    } else if (mov.tipo === 'SAIDA') {
      gastos += Number(mov.valor);
    }
  });

  const lucro = totalBruto - gastos;

  return {
    mes: mesReferencia,
    categoria,
    totalBruto,
    gastos,
    lucro,
    porcentagemLucro: totalBruto > 0 ? ((lucro / totalBruto) * 100).toFixed(2) + '%' : '0%'
  };
}

export async function obterInadimplentes(mesReferencia: string) {
  console.log(`Buscando inadimplentes de: ${mesReferencia}...`);

  // 1. Buscar todos os filhos que devem pagar (isento = false)
  const { data: filhos, error: erroFilhos } = await supabase
    .from('filhos')
    .select('id, nome')
    .eq('isento', false);

  if (erroFilhos) {
    console.error('Erro ao buscar filhos:', erroFilhos.message);
    return;
  }

  // 2. Buscar todos os IDs de filhos que JÁ PAGARAM este mês (categoria MENSALIDADE)
  const { data: pagamentos, error: erroPagamentos } = await supabase
    .from('financeiro')
    .select('filho_id')
    .eq('mes_referencia', mesReferencia)
    .eq('categoria', 'MENSALIDADE')
    .eq('tipo', 'ENTRADA');

  if (erroPagamentos) {
    console.error('Erro ao buscar pagamentos:', erroPagamentos.message);
    return;
  }

  // Criamos um Set (conjunto) com os IDs de quem pagou para facilitar a busca
  const idsQuePagaram = new Set(pagamentos?.map(p => p.filho_id));

  // 3. Filtrar: Quem está na lista de filhos mas NÃO está na lista de quem pagou?
  const inadimplentes = filhos?.filter(filho => !idsQuePagaram.has(filho.id));

  return inadimplentes;
}