import React, { useState, useEffect } from 'react'
import { supabase } from '../config/supabase'
import { Save, X } from 'lucide-react'

export function CadastroFilho({ filhoEditando, onSucesso, onCancelar }: any) {
  const [nome, setNome] = useState('')
  const [dataNascimento, setDataNascimento] = useState('')
  const [dataEntrada, setDataEntrada] = useState('')
  const [isento, setIsento] = useState(false)
  const [loading, setLoading] = useState(false)

  // Se estiver editando, preenche os campos com os dados do filho
  useEffect(() => {
    if (filhoEditando) {
      setNome(filhoEditando.nome)
      setDataNascimento(filhoEditando.data_nascimento?.split('T')[0] || '')
      setDataEntrada(filhoEditando.data_entrada?.split('T')[0] || '')
      setIsento(filhoEditando.isento || false)
    }
  }, [filhoEditando])

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    
    const dados = { 
      nome, 
      data_nascimento: dataNascimento, 
      data_entrada: dataEntrada,
      isento 
    }

    if (filhoEditando) {
      await supabase.from('filhos').update(dados).eq('id', filhoEditando.id)
    } else {
      await supabase.from('filhos').insert([dados])
    }
    
    setLoading(false)
    onSucesso() // Fecha o formulário e recarrega a lista
  }

  return (
    <form onSubmit={salvar} style={{ padding: '10px' }}>
      <div className="form-group">
        <label>Nome Completo do Membro</label>
        <input 
          type="text" 
          required 
          value={nome} 
          onChange={e => setNome(e.target.value)} 
          placeholder="Ex: João Pedro Vieira"
        />
      </div>
      
      <div className="form-row">
        <div className="form-group">
          <label>Data de Nascimento</label>
          <input 
            type="date" 
            required 
            value={dataNascimento} 
            onChange={e => setDataNascimento(e.target.value)} 
          />
        </div>
        <div className="form-group">
          <label>Data de Entrada na Casa</label>
          <input 
            type="date" 
            required 
            value={dataEntrada} 
            onChange={e => setDataEntrada(e.target.value)} 
          />
        </div>
      </div>

      {/* CHECKBOX DE ISENÇÃO */}
      <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '15px', justifyContent: 'center', background: 'var(--bg-sub)', padding: '15px', borderRadius: '10px', border: '1px solid var(--border)' }}>
        <input 
          type="checkbox" 
          id="isento" 
          checked={isento} 
          onChange={e => setIsento(e.target.checked)} 
          style={{ width: '22px', height: '22px', cursor: 'pointer' }}
        />
        <label htmlFor="isento" style={{ margin: 0, cursor: 'pointer', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-dark)' }}>
          Membro Isento de Mensalidade
        </label>
      </div>
      
      <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
        <button type="button" onClick={onCancelar} className="btn-primary" style={{ background: 'var(--text-muted)' }}>
          <X size={20}/> Cancelar
        </button>
        <button type="submit" disabled={loading} className="btn-primary">
          <Save size={20}/> {loading ? 'Salvando...' : 'Salvar Ficha'}
        </button>
      </div>
    </form>
  )
}