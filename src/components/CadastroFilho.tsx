import { useState, useEffect } from 'react'
import { supabase } from '../config/supabase'
import { UserPlus, Save, X } from 'lucide-react'

// Funções para Mascarar e Converter Datas
const maskData = (v: string) => {
  let r = v.replace(/\D/g, '').slice(0, 8)
  if (r.length > 4) return `${r.slice(0, 2)}/${r.slice(2, 4)}/${r.slice(4)}`
  if (r.length > 2) return `${r.slice(0, 2)}/${r.slice(2)}`
  return r
}

const paraDB = (br: string) => {
  if (!br || br.length !== 10) return null
  const [d, m, y] = br.split('/')
  return `${y}-${m}-${d}`
}

const paraBR = (db: string) => {
  if (!db) return ''
  const [y, m, d] = db.split('T')[0].split('-')
  return `${d}/${m}/${y}`
}

export function CadastroFilho({ filhoEditando, onSucesso, onCancelar }: any) {
  const [mensagem, setMensagem] = useState('')
  const [formData, setFormData] = useState({
    nome: '',
    data_nascimento: '',
    data_entrada: ''
  })

  useEffect(() => {
    if (filhoEditando) {
      setFormData({
        nome: filhoEditando.nome,
        data_nascimento: paraBR(filhoEditando.data_nascimento),
        data_entrada: paraBR(filhoEditando.data_entrada)
      })
    } else {
      setFormData({ nome: '', data_nascimento: '', data_entrada: '' })
    }
  }, [filhoEditando])

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setMensagem('Processando...')

    // Converte de DD/MM/AAAA para YYYY-MM-DD antes de salvar
    const payload = {
      nome: formData.nome,
      data_nascimento: formData.data_nascimento.length === 10 ? paraDB(formData.data_nascimento) : null,
      data_entrada: formData.data_entrada.length === 10 ? paraDB(formData.data_entrada) : null
    }

    if (filhoEditando) {
      const { error } = await supabase.from('filhos').update(payload).eq('id', filhoEditando.id)
      if (error) setMensagem('Erro: ' + error.message)
      else { setMensagem('✅ Atualizado!'); onSucesso() }
    } else {
      const { error } = await supabase.from('filhos').insert([payload])
      if (error) setMensagem('Erro: ' + error.message)
      else {
        setMensagem('✅ Cadastrado!')
        setFormData({ nome: '', data_nascimento: '', data_entrada: '' })
        onSucesso()
      }
    }
    setTimeout(() => setMensagem(''), 3000)
  }

  return (
    <div>
      <h3 style={{marginBottom: '1.5rem', borderLeft: '4px solid #3498db', paddingLeft: '15px', display: 'flex', alignItems: 'center', gap: '8px'}}>
        <UserPlus size={20} color="#3498db" /> {filhoEditando ? 'Editar Membro' : 'Novo Membro'}
      </h3>
      <form onSubmit={salvar}>
        <div className="form-group">
          <label>Nome Completo</label>
          <input type="text" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} required />
        </div>
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
          <div className="form-group">
            <label>Nascimento (DD/MM/AAAA)</label>
            <input type="text" placeholder="00/00/0000" value={formData.data_nascimento} onChange={(e) => setFormData({...formData, data_nascimento: maskData(e.target.value)})} />
          </div>
          <div className="form-group">
            <label>Data de Entrada (DD/MM/AAAA)</label>
            <input type="text" placeholder="00/00/0000" value={formData.data_entrada} onChange={(e) => setFormData({...formData, data_entrada: maskData(e.target.value)})} required />
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="submit" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: filhoEditando ? '#f39c12' : 'var(--primary)' }}>
            <Save size={18} /> {filhoEditando ? 'Atualizar' : 'Cadastrar'}
          </button>
          
          {filhoEditando && (
            <button type="button" onClick={onCancelar} style={{ background: '#e74c3c', width: 'auto', padding: '0 20px', borderRadius: '10px', color: 'white', border: 'none', cursor: 'pointer' }}>
              <X size={18} />
            </button>
          )}
        </div>
        {mensagem && <p style={{marginTop: '15px', textAlign: 'center', fontWeight: 'bold'}}>{mensagem}</p>}
      </form>
    </div>
  )
}