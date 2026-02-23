import { supabase } from '../config/supabase.js'; // Ajuste o caminho se necessário

export async function cadastrarFilho(nome: string, dataNasc: string, isento: boolean) {
  const { data, error } = await supabase
    .from('filhos')
    .insert([
      { 
        nome: nome, 
        data_nascimento: dataNasc, 
        isento: isento 
      }
    ])
    .select();

  if (error) {
    console.error('Erro ao cadastrar:', error.message);
    return;
  }

  console.log('Filho cadastrado com sucesso:', data);
}