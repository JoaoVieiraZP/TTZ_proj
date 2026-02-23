import { useState, useEffect } from 'react'
import { supabase } from '../config/supabase'
import { Trash2, PlusCircle, History, Pencil, Save, X } from 'lucide-react'

const maskData = (v: string) => {
  let r = v.replace(/\D/g, '').slice(0, 8)
  if (r.length > 4) return `${r.slice(0, 2)}/${r.slice(2, 4)}/${r.slice(4)}`
  if (r.length > 2) return `${r.slice(0, 2)}/${r.slice(2)}`
  return r
}

export function LancamentoFinanceiro({ mesFiltro }: { mesFiltro: string }) {
  const [filhos, setFilhos] = useState<any[]>([])
  const [historico, setHistorico] = useState<any[]>([])
  const [idEdicao, setIdEdicao] = useState<number | null>(null)
  const [outraCat, setOutraCat] = useState('')
  const [formData, setFormData] = useState({ 
    valor: '', 
    tipo: 'ENTRADA', 
    categoria: 'MENSALIDADE', 
    mes_referencia: mesFiltro === 'TODOS' ? '' : mesFiltro, 
    data_pagamento: '', 
    filho_id: '' 
  })

  async function carregar() {
    const { data: f } = await supabase.from('filhos').select('id, nome').order('nome')
    setFilhos(f || [])
    
    let q = supabase.from('financeiro').select('*').order('id', { ascending: false })
    if (mesFiltro !== 'TODOS') q = q.eq('mes_referencia', mesFiltro)
    const { data: h } = await q.limit(20)
    setHistorico(h || [])
  }

  useEffect(() => { carregar() }, [mesFiltro])

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    const [d, m, y] = formData.data_pagamento.split('/')
    const payload = { 
      ...formData, 
      valor: parseFloat(formData.valor), 
      data_pagamento: `${y}-${m}-${d}`,
      categoria: formData.categoria === 'OUTROS' ? outraCat : formData.categoria,
      filho_id: formData.filho_id || null 
    }
    
    if (idEdicao) {
      await supabase.from('financeiro').update(payload).eq('id', idEdicao)
    } else {
      await supabase.from('financeiro').insert([payload])
    }
    
    setFormData({ valor: '', tipo: 'ENTRADA', categoria: 'MENSALIDADE', mes_referencia: mesFiltro === 'TODOS' ? '' : mesFiltro, data_pagamento: '', filho_id: '' })
    setIdEdicao(null)
    setOutraCat('')
    carregar()
  }

  return (
    <div className="dashboard-grid">
      <div className="table-container">
        <h3>
          {idEdicao ? <Pencil size={22} color="var(--warning)"/> : <PlusCircle size={22} color="var(--success)"/>} 
          {idEdicao ? 'Editar Lançamento' : 'Novo Lançamento'}
        </h3>
        <form onSubmit={salvar}>
          <div className="form-row">
            <div className="form-group">
              <label>Valor da Operação (R$)</label>
              <input type="number" step="0.01" value={formData.valor} onChange={e => setFormData({...formData, valor: e.target.value})} placeholder="Ex: 50,00" required />
            </div>
            <div className="form-group">
              <label>Data do Pagamento</label>
              <input type="text" placeholder="DD/MM/AAAA" value={formData.data_pagamento} onChange={e => setFormData({...formData, data_pagamento: maskData(e.target.value)})} required />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Tipo de Operação</label>
              <select value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value})}>
                <option value="ENTRADA">Entrada de Dinheiro</option>
                <option value="SAIDA">Saída de Dinheiro</option>
              </select>
            </div>
            <div className="form-group">
              <label>Mês de Referência</label>
              <input type="text" placeholder="MM/AAAA" value={formData.mes_referencia} onChange={e => setFormData({...formData, mes_referencia: e.target.value})} required />
            </div>
          </div>

          <div className="form-group">
            <label>Categoria do Lançamento</label>
            <select value={formData.categoria} onChange={e => setFormData({...formData, categoria: e.target.value})}>
              <option value="MENSALIDADE">Mensalidade da Corrente</option>
              <option value="FESTA">Festa / Evento / Saída</option>
              <option value="BEBIDA_FUMO">Bebidas e Fumos</option>
              <option value="VELA">Compra de Velas</option>
              <option value="OUTROS">Outras Despesas/Receitas</option>
            </select>
          </div>

          {formData.categoria === 'OUTROS' && (
            <div className="form-group">
              <label>Especifique a Categoria</label>
              <input type="text" value={outraCat} placeholder="Ex: Material de Limpeza" onChange={e => setOutraCat(e.target.value)} required />
            </div>
          )}

          <div className="form-group">
            <label>Vincular a um Membro (Opcional)</label>
            <select value={formData.filho_id} onChange={e => setFormData({...formData, filho_id: e.target.value})}>
              <option value="">Lançamento Geral da Casa (Sem Vínculo)</option>
              {filhos.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </div>

          <div style={{display: 'flex', gap: '15px', marginTop: '20px'}}>
            <button type="submit" className="btn-primary" style={{flex: 1, background: idEdicao ? 'var(--warning)' : 'var(--primary)'}}>
              <Save size={20}/> {idEdicao ? 'Atualizar Registro' : 'Salvar no Caixa'}
            </button>
            {idEdicao && (
              <button type="button" onClick={() => {setIdEdicao(null); setFormData({ ...formData, valor: '', data_pagamento: '' })}} className="btn-primary" style={{background: 'var(--danger)', width: 'auto'}}>
                <X size={20}/> Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="table-container">
        <h3><History size={22} color="var(--secondary)"/> Últimas Movimentações ({mesFiltro})</h3>
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Mês Ref.</th>
                <th>Categoria</th>
                <th>Valor</th>
                <th style={{textAlign:'center'}}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {historico.length === 0 ? (
                <tr><td colSpan={4} style={{textAlign: 'center', padding: '20px'}}>Nenhum lançamento encontrado.</td></tr>
              ) : (
                historico.map(h => (
                  <tr key={h.id}>
                    <td data-label="Mês Ref."><strong>{h.mes_referencia}</strong></td>
                    <td data-label="Categoria">{h.categoria}</td>
                    <td data-label="Valor" style={{color: h.tipo === 'ENTRADA' ? 'var(--success)' : 'var(--danger)', fontWeight: 800}}>
                      {h.tipo === 'ENTRADA' ? '+ ' : '- '}R$ {h.valor.toFixed(2)}
                    </td>
                    <td data-label="Ação" className="action-cell">
                      <div style={{display: 'flex', gap: '15px', justifyItems: 'center', justifyContent: 'center'}}>
                        <button onClick={() => {
                           setFormData({ valor: h.valor.toString(), tipo: h.tipo, categoria: ['MENSALIDADE', 'FESTA', 'BEBIDA_FUMO', 'VELA'].includes(h.categoria) ? h.categoria : 'OUTROS', mes_referencia: h.mes_referencia, data_pagamento: h.data_pagamento.split('-').reverse().join('/'), filho_id: h.filho_id || '' });
                           if(!['MENSALIDADE', 'FESTA', 'BEBIDA_FUMO', 'VELA'].includes(h.categoria)) setOutraCat(h.categoria);
                           setIdEdicao(h.id);
                           window.scrollTo({ top: 0, behavior: 'smooth' });
                        }} style={{background:'none', border:'none', cursor:'pointer'}}><Pencil size={20} color="var(--warning)"/></button>
                        <button onClick={async () => { if(window.confirm('Tem certeza que deseja excluir este lançamento?')) { await supabase.from('financeiro').delete().eq('id', h.id); carregar(); }}} style={{background:'none', border:'none', cursor:'pointer'}}><Trash2 size={20} color="var(--danger)"/></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}