import { useState, useEffect } from 'react'
import { supabase } from '../config/supabase'
import { Trash2, PlusCircle, History, Pencil, Save, X } from 'lucide-react'

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

// Pegar a data atual no fuso local sem bugar com UTC
const dataHojeBR = () => {
  const h = new Date()
  return `${String(h.getDate()).padStart(2, '0')}/${String(h.getMonth() + 1).padStart(2, '0')}/${h.getFullYear()}`
}

export function LancamentoFinanceiro({ mesFiltro }: { mesFiltro: string }) {
  const [filhos, setFilhos] = useState<any[]>([])
  const [historico, setHistorico] = useState<any[]>([])
  const [mensagem, setMensagem] = useState('')
  const [outraCategoria, setOutraCategoria] = useState('')
  const [idEdicao, setIdEdicao] = useState<number | null>(null)
  
  const [formData, setFormData] = useState({
    valor: '',
    tipo: 'ENTRADA',
    categoria: 'MENSALIDADE',
    mes_referencia: mesFiltro !== 'TODOS' ? mesFiltro : (() => {
      const h = new Date()
      return `${String(h.getMonth() + 1).padStart(2, '0')}/${h.getFullYear()}`
    })(),
    data_pagamento: dataHojeBR(),
    filho_id: ''
  })

  useEffect(() => {
    if (mesFiltro !== 'TODOS' && !idEdicao) {
      setFormData(prev => ({ ...prev, mes_referencia: mesFiltro }))
    }
  }, [mesFiltro, idEdicao])

  async function carregarDados() {
    const { data: dataFilhos } = await supabase.from('filhos').select('id, nome').order('nome')
    if (dataFilhos) setFilhos(dataFilhos)

    let query = supabase.from('financeiro').select('id, data_pagamento, mes_referencia, categoria, tipo, valor, filho_id').order('id', { ascending: false })
    if (mesFiltro !== 'TODOS') query = query.eq('mes_referencia', mesFiltro)

    const { data: dataFinanceiro } = await query.limit(15)
    if (dataFinanceiro) setHistorico(dataFinanceiro)
  }

  useEffect(() => {
    carregarDados()
  }, [mesFiltro])

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setMensagem('Processando...')

    if (formData.data_pagamento.length !== 10) {
      return setMensagem('❌ Digite uma data válida (DD/MM/AAAA)')
    }

    const categoriaFinal = formData.categoria === 'OUTROS' ? outraCategoria : formData.categoria
    const payload = {
      ...formData,
      categoria: categoriaFinal,
      valor: parseFloat(formData.valor),
      data_pagamento: paraDB(formData.data_pagamento),
      filho_id: formData.filho_id || null
    }

    if (idEdicao) {
      const { error } = await supabase.from('financeiro').update(payload).eq('id', idEdicao)
      if (error) setMensagem('Erro: ' + error.message)
      else finalizarAcao('Atualizado com sucesso!')
    } else {
      const { error } = await supabase.from('financeiro').insert([payload])
      if (error) setMensagem('Erro: ' + error.message)
      else finalizarAcao('Lançamento realizado com sucesso!')
    }
  }

  function finalizarAcao(msg: string) {
    setMensagem(`✅ ${msg}`)
    cancelarEdicao()
    carregarDados()
    setTimeout(() => setMensagem(''), 3000)
  }

  function editarLancamento(lanc: any) {
    const categoriasPadrao = ['MENSALIDADE', 'FESTA', 'BEBIDA_FUMO', 'VELA', 'OUTROS']
    const isOutros = !categoriasPadrao.includes(lanc.categoria)

    setFormData({
      valor: lanc.valor.toString(),
      tipo: lanc.tipo,
      categoria: isOutros ? 'OUTROS' : lanc.categoria,
      mes_referencia: lanc.mes_referencia,
      data_pagamento: paraBR(lanc.data_pagamento),
      filho_id: lanc.filho_id || ''
    })
    setOutraCategoria(isOutros ? lanc.categoria : '')
    setIdEdicao(lanc.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelarEdicao() {
    setIdEdicao(null)
    setOutraCategoria('')
    setFormData({
      valor: '',
      tipo: 'ENTRADA',
      categoria: 'MENSALIDADE',
      mes_referencia: mesFiltro !== 'TODOS' ? mesFiltro : new Date().toISOString().split('T')[0].substring(0, 7).split('-').reverse().join('/'),
      data_pagamento: dataHojeBR(),
      filho_id: ''
    })
  }

  async function deletarLancamento(id: number) {
    if (window.confirm("Tem certeza que deseja excluir este lançamento?")) {
      const { error } = await supabase.from('financeiro').delete().eq('id', id)
      if (!error) carregarDados()
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="dashboard-grid">
        <div className="table-container">
          <h3 style={{marginBottom: '1.5rem', borderLeft: `4px solid ${idEdicao ? '#f39c12' : '#27ae60'}`, paddingLeft: '15px', display: 'flex', alignItems: 'center', gap: '8px'}}>
            {idEdicao ? <Pencil size={20} color="#f39c12" /> : <PlusCircle size={20} color="#27ae60" />}
            {idEdicao ? 'Editar Lançamento' : 'Novo Lançamento'}
          </h3>
          <form onSubmit={salvar}>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
              <div className="form-group">
                <label>Data Pgto (DD/MM/AAAA)</label>
                <input type="text" placeholder="00/00/0000" value={formData.data_pagamento} onChange={(e) => setFormData({...formData, data_pagamento: maskData(e.target.value)})} required />
              </div>
              <div className="form-group">
                <label>Tipo de Operação</label>
                <select value={formData.tipo} onChange={(e) => setFormData({...formData, tipo: e.target.value})}>
                  <option value="ENTRADA">Entrada</option>
                  <option value="SAIDA">Saída</option>
                </select>
              </div>
            </div>

            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
              <div className="form-group">
                <label>Valor (R$)</label>
                <input type="number" step="0.01" value={formData.valor} onChange={(e) => setFormData({...formData, valor: e.target.value})} placeholder="0,00" required />
              </div>
              <div className="form-group">
                <label>Mês Referência (MM/AAAA)</label>
                <input type="text" value={formData.mes_referencia} onChange={(e) => setFormData({...formData, mes_referencia: e.target.value})} required />
              </div>
            </div>

            <div className="form-group">
              <label>Categoria</label>
              <select value={formData.categoria} onChange={(e) => setFormData({...formData, categoria: e.target.value})}>
                <option value="MENSALIDADE">Mensalidade</option>
                <option value="FESTA">Festa / Evento</option>
                <option value="BEBIDA_FUMO">Bebidas / Fumo</option>
                <option value="VELA">Velas</option>
                <option value="OUTROS">Outros</option>
              </select>
            </div>

            {formData.categoria === 'OUTROS' && (
              <div className="form-group">
                <label>Especifique</label>
                <input type="text" value={outraCategoria} onChange={(e) => setOutraCategoria(e.target.value)} required />
              </div>
            )}

            <div className="form-group">
              <label>Filho Associado (Opcional)</label>
              <select value={formData.filho_id} onChange={(e) => setFormData({...formData, filho_id: e.target.value})}>
                <option value="">Nenhum (Gasto Geral)</option>
                {filhos.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: idEdicao ? '#f39c12' : 'var(--primary)' }}>
                <Save size={18} /> {idEdicao ? 'Atualizar' : 'Confirmar'}
              </button>
              {idEdicao && (
                <button type="button" onClick={cancelarEdicao} style={{ background: '#e74c3c', width: 'auto', padding: '0 20px', borderRadius: '10px', color: 'white', border: 'none', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              )}
            </div>
            {mensagem && <p style={{marginTop: '15px', textAlign: 'center', fontWeight: 'bold'}}>{mensagem}</p>}
          </form>
        </div>

        <div className="table-container">
          <h3 style={{marginBottom: '1.5rem', borderLeft: '4px solid #3498db', paddingLeft: '15px', display: 'flex', alignItems: 'center', gap: '8px'}}>
            <History size={20} color="#3498db" /> {mesFiltro === 'TODOS' ? 'Visão Geral' : `Lançamentos: ${mesFiltro}`}
          </h3>
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Ref.</th>
                <th>Categoria</th>
                <th>Valor</th>
                <th style={{textAlign: 'center', width: '90px'}}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {historico.map(h => (
                <tr key={h.id}>
                  <td>{paraBR(h.data_pagamento)}</td>
                  <td style={{fontWeight: 'bold', color: '#636e72'}}>{h.mes_referencia}</td>
                  <td>{h.categoria}</td>
                  <td style={{color: h.tipo === 'ENTRADA' ? '#27ae60' : '#e74c3c', fontWeight: 'bold'}}>
                    R$ {h.valor.toFixed(2)}
                  </td>
                  <td style={{textAlign: 'center', display: 'flex', gap: '10px', justifyContent: 'center'}}>
                    <button onClick={() => editarLancamento(h)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><Pencil size={18} color="#f39c12" /></button>
                    <button onClick={() => deletarLancamento(h.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><Trash2 size={18} color="#e74c3c" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}