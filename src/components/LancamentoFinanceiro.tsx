import React, { useState, useEffect } from 'react'
import { supabase } from '../config/supabase'
import { Trash2, PlusCircle, History, Pencil, Save, X, Lock, ChevronDown, ChevronUp, User, CalendarDays, Tag } from 'lucide-react'

const maskData = (v: string) => {
  let r = v.replace(/\D/g, '').slice(0, 8)
  if (r.length > 4) return `${r.slice(0, 2)}/${r.slice(2, 4)}/${r.slice(4)}`
  if (r.length > 2) return `${r.slice(0, 2)}/${r.slice(2)}`
  return r
}

export function LancamentoFinanceiro({ mesFiltro, isAdmin }: { mesFiltro: string, isAdmin: boolean }) {
  const [filhos, setFilhos] = useState<any[]>([])
  const [historico, setHistorico] = useState<any[]>([])
  const [idEdicao, setIdEdicao] = useState<number | null>(null)
  const [outraCat, setOutraCat] = useState('')
  
  // O NOVO ESTADO DA GAVETA
  const [lancamentoExpandido, setLancamentoExpandido] = useState<number | null>(null)
  
  const [formData, setFormData] = useState({ 
    valor: '', 
    tipo: 'ENTRADA', 
    categoria: 'MENSALIDADE', 
    mes_referencia: mesFiltro === 'TODOS' ? '' : mesFiltro, 
    data_pagamento: '', 
    filho_id: '' 
  })

  async function carregar() {
    const { data: f } = await supabase.from('filhos').select('id, nome').eq('ativo', true).order('nome')
    setFilhos(f || [])
    
    let q = supabase.from('financeiro').select('*').order('id', { ascending: false })
    if (mesFiltro !== 'TODOS') q = q.eq('mes_referencia', mesFiltro)
    const { data: h } = await q.limit(50) // Aumentei um pouco o limite para você ver mais histórico
    setHistorico(h || [])
  }

  useEffect(() => { carregar() }, [mesFiltro])

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    if (!isAdmin) return 

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

  // FUNÇÃO PARA ABRIR/FECHAR A GAVETA
  function toggleExpandir(id: number) {
    if (lancamentoExpandido === id) return setLancamentoExpandido(null)
    setLancamentoExpandido(id)
  }

  return (
    <div className="dashboard-grid">
      <div className="table-container">
        <h3>
          {idEdicao ? <Pencil size={22} color="var(--warning)"/> : <PlusCircle size={22} color="var(--success)"/>} 
          {idEdicao ? 'Editar Lançamento' : 'Novo Lançamento'}
        </h3>
        
        {isAdmin ? (
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
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--bg-sub)', borderRadius: '12px', color: 'var(--text-muted)' }}>
            <Lock size={40} style={{ marginBottom: '15px', opacity: 0.5 }} />
            <h4 style={{ fontSize: '1.1rem', marginBottom: '5px' }}>Cofre Trancado</h4>
            <p style={{ fontSize: '0.9rem' }}>Modo Leitura: Apenas administradores do Terreiro podem registrar ou alterar lançamentos financeiros.</p>
          </div>
        )}
      </div>

      <div className="table-container">
        <h3><History size={22} color="var(--secondary)"/> Últimas Movimentações ({mesFiltro})</h3>
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th style={{width: '60px'}}></th> {/* Espaço da setinha */}
                <th>Mês Ref.</th>
                <th>Categoria</th>
                <th>Valor</th>
                <th style={{textAlign:'center'}}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {historico.length === 0 ? (
                <tr><td colSpan={5} style={{textAlign: 'center', padding: '20px'}}>Nenhum lançamento encontrado.</td></tr>
              ) : (
                historico.map(h => {
                  // Procura o nome do filho associado a este pagamento
                  const filhoVinculado = filhos.find(f => f.id === h.filho_id)
                  
                  return (
                    <React.Fragment key={h.id}>
                      <tr 
                        className={`main-row ${lancamentoExpandido === h.id ? 'is-expanded' : ''}`}
                        onClick={() => toggleExpandir(h.id)}
                        style={{cursor: 'pointer'}}
                      >
                        <td style={{textAlign: 'center'}}>
                          {lancamentoExpandido === h.id ? <ChevronUp size={22} color="var(--text-muted)"/> : <ChevronDown size={22} color="var(--text-muted)"/>}
                        </td>
                        <td data-label="Mês Ref."><strong>{h.mes_referencia}</strong></td>
                        <td data-label="Categoria">{h.categoria}</td>
                        <td data-label="Valor" style={{color: h.tipo === 'ENTRADA' ? 'var(--success)' : 'var(--danger)', fontWeight: 800}}>
                          {h.tipo === 'ENTRADA' ? '+ ' : '- '}R$ {h.valor.toFixed(2)}
                        </td>
                        
                        <td data-label="Ação" className="action-cell" onClick={e => e.stopPropagation()}>
                          {isAdmin ? (
                            <div style={{display: 'flex', gap: '15px', justifyItems: 'center', justifyContent: 'center'}}>
                              <button onClick={() => {
                                 setFormData({ valor: h.valor.toString(), tipo: h.tipo, categoria: ['MENSALIDADE', 'FESTA', 'BEBIDA_FUMO', 'VELA'].includes(h.categoria) ? h.categoria : 'OUTROS', mes_referencia: h.mes_referencia, data_pagamento: h.data_pagamento.split('-').reverse().join('/'), filho_id: h.filho_id || '' });
                                 if(!['MENSALIDADE', 'FESTA', 'BEBIDA_FUMO', 'VELA'].includes(h.categoria)) setOutraCat(h.categoria);
                                 setIdEdicao(h.id);
                                 window.scrollTo({ top: 0, behavior: 'smooth' });
                              }} style={{background:'none', border:'none', cursor:'pointer'}} title="Editar"><Pencil size={20} color="var(--warning)"/></button>
                              
                              <button onClick={async () => { 
                                if(window.confirm('Tem certeza que deseja excluir este lançamento do caixa?')) { 
                                  await supabase.from('financeiro').delete().eq('id', h.id); carregar(); 
                                }
                              }} style={{background:'none', border:'none', cursor:'pointer'}} title="Excluir"><Trash2 size={20} color="var(--danger)"/></button>
                            </div>
                          ) : (
                             <div style={{textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 'bold'}}>--</div>
                          )}
                        </td>
                      </tr>

                      {/* A GAVETA DE DETALHES QUE ABRE AO CLICAR */}
                      {lancamentoExpandido === h.id && (
                        <tr className="expanded-crm-row">
                          <td colSpan={5}>
                            <div className="crm-box" style={{ background: 'var(--bg-main)' }}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '25px', padding: '10px' }}>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <CalendarDays size={16}/> Data do Registro:
                                  </span>
                                  <div style={{ fontWeight: 800, color: 'var(--text-dark)' }}>
                                    {h.data_pagamento.split('-').reverse().join('/')}
                                  </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <User size={16}/> Vínculo / Origem:
                                  </span>
                                  <div style={{ fontWeight: 800, color: filhoVinculado ? 'var(--primary)' : 'var(--text-dark)' }}>
                                    {filhoVinculado ? filhoVinculado.nome : 'Lançamento Geral (Sem Vínculo)'}
                                  </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <Tag size={16}/> Natureza:
                                  </span>
                                  <div>
                                    {h.tipo === 'ENTRADA' ? (
                                      <span className="badge-status badge-pago">ENTRADA (RECEITA)</span>
                                    ) : (
                                      <span className="badge-status badge-pendente">SAÍDA (DESPESA)</span>
                                    )}
                                  </div>
                                </div>

                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}