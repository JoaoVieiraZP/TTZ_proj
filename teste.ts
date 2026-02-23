import { supabase } from './src/config/supabase.js'; // Verifique se o caminho do seu arquivo de conexão está correto

async function testarInsercao() {
  console.log('Tentando inserir um novo filho...');

  const { data, error } = await supabase
    .from('filhos')
    .insert([
      { 
        nome: 'João Pedro', 
        data_nascimento: '2005-01-25', // Pode colocar sua data real depois
        isento: true 
      }
    ])
    .select(); // O .select() serve para o Supabase nos devolver o que ele acabou de criar

  if (error) {
    console.error('❌ Erro na inserção:', error.message);
    if (error.message.includes('row-level security')) {
      console.log('💡 Dica: O RLS ainda parece estar ativo no Supabase!');
    }
  } else {
    console.log('✅ Sucesso! Filho inserido:', data);
  }
}

testarInsercao();