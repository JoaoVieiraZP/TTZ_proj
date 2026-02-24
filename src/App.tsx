import React, { useEffect, useState } from 'react'
import { obterInadimplentes } from './services/DashboardService'
import { supabase } from './config/supabase'
import { CadastroFilho } from './components/CadastroFilho'
import { LancamentoFinanceiro } from './components/LancamentoFinanceiro'
import { Login } from './components/Login'
import { 
  LayoutDashboard, Users, Wallet, AlertCircle, List, Clock, 
  Trash2, CalendarDays, Pencil, UserPlus, ChevronDown, 
  ChevronUp, Camera, CheckCircle2, XCircle, FastForward,
  Moon, Sun, LogOut, Search
} from 'lucide-react'
import './App.css'

const formatarData = (data: string) => {
  if (!data) return '--/--/----'
  const [ano, mes, dia] = data.split('T')[0].split('-')
  return `${dia}/${mes}/${ano}`
}

export default function App() {
  const [session, setSession] = useState<any>(null)
  const [resumo, setResumo] = useState({ totalBruto: 0, gastos: 0, lucro: 0 })
  const [pendentes, setPendentes] = useState<any[]>([])
  const [todosFilhos, setTodosFilhos] = useState<any[]>([])
  const [telaAtiva, setTelaAtiva] = useState<'dashboard' | 'filhos' | 'financeiro'>('dashboard')
  const [mesesDisponiveis, setMesesDisponiveis] = useState<any[]>([])
  
  const [mostrarFormFilho, setMostrarFormFilho] = useState(false)
  const [filhoEditando, setFilhoEditando] = useState<any>(null)
  const [filhoExpandido, setFilhoExpandido] = useState<number | null>(null)
  const [historicoMensalidades, setHistoricoMensalidades] = useState<any[]>([])
  const [termoBusca, setTermoBusca] = useState('')

  const [tema, setTema] = useState(localStorage.getItem('ttz-tema') || 'dark')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', tema)
    localStorage.setItem('ttz-tema', tema)
  }, [tema])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const alternarTema = () => {
    setTema(temaAntigo => temaAntigo === 'light' ? 'dark' : 'light')
  }

  const [mesReferencia, setMesReferencia] = useState(() => {
    const hoje = new Date()
    return `${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`
  })

  async function carregarDados() {
    let qFin = supabase.from('financeiro').select('tipo, valor')
    if (mesReferencia !== 'TODOS') qFin = qFin.eq('mes_referencia', mesReferencia)
    const { data: fin } = await qFin
    let b = 0, s = 0
    fin?.forEach(i => i.tipo === 'ENTRADA' ? b += i.valor : s += i.valor)
    setResumo({ totalBruto: b, gastos: s, lucro: b - s })

    // Busca todos os filhos e armazena
    const { data: f } = await supabase.from('filhos').select('*').order('nome', { ascending: true })
    const filhosData = f || []
    setTodosFilhos(filhosData)

    if (mesReferencia !== 'TODOS') {
      const p = await obterInadimplentes(mesReferencia)
      // Remove os isentos da lista de pendências
      const pendentesReais = p?.filter(devedor => {
        const filhoDb = filhosData.find(x => x.id === devedor.id)
        return filhoDb && !filhoDb.isento
      })
      setPendentes(pendentesReais || [])
    } else {
      setPendentes([])
    }

    const { data: mData } = await supabase.from('financeiro').select('mes_referencia')
    const mSet = new Set<string>()
    mSet.add(`${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`)
    mData?.forEach(i => i.mes_referencia && mSet.add(i.mes_referencia))
    
    const opcoes = Array.from(mSet).map(v => {
      const [m, a] = v.split('/')
      const nomes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
      return { valor: v, label: `${nomes[parseInt(m)-1]} de ${a}`, ordem: parseInt(`${a}${m}`) }
    }).sort((a,b) => b.ordem - a.ordem)
    
    opcoes.push({ valor: 'TODOS', label: 'Visão Geral / Histórico', ordem: 0 })
    setMesesDisponiveis(opcoes)
  }

  useEffect(() => { 
    if (session) carregarDados() 
  }, [telaAtiva, mesReferencia, session])

  async function toggleExpandir(filho: any) {
    if (filhoExpandido === filho.id) return setFilhoExpandido(null)
    setFilhoExpandido(filho.id)
    
    const { data: pagamentos } = await supabase.from('financeiro').select('*').eq('filho_id', filho.id).eq('categoria', 'MENSALIDADE')
    const histGerado: any[] = []
    const dataAtual = new Date()

    if (filho.data_entrada) {
      const [anoE, mesE] = filho.data_entrada.split('T')[0].split('-')
      let dataIter = new Date(parseInt(anoE), parseInt(mesE) - 1, 1)
      
      while (dataIter <= dataAtual || (dataIter.getMonth() === dataAtual.getMonth() && dataIter.getFullYear() === dataAtual.getFullYear())) {
        const ref = `${String(dataIter.getMonth() + 1).padStart(2, '0')}/${dataIter.getFullYear()}`
        const pagou = pagamentos?.find(p => p.mes_referencia === ref)
        
        // MÁGICA DO STATUS (Considera o Isento)
        let statusMensalidade = 'PENDENTE'
        if (pagou) statusMensalidade = 'PAGO'
        else if (filho.isento) statusMensalidade = 'ISENTO'

        histGerado.push({ ref, status: statusMensalidade, dt: pagou ? pagou.data_pagamento : null })
        dataIter.setMonth(dataIter.getMonth() + 1)
      }
    }
    
    pagamentos?.forEach(p => {
      if (!histGerado.find(h => h.ref === p.mes_referencia)) {
        histGerado.push({ ref: p.mes_referencia, status: 'ADIANTADO', dt: p.data_pagamento })
      }
    })

    setHistoricoMensalidades(histGerado.sort((a,b) => {
      const [mA, aA] = a.ref.split('/'), [mB, aB] = b.ref.split('/')
      return parseInt(`${aB}${mB}`) - parseInt(`${aA}${mA}`)
    }))
  }

  const filhosFiltrados = todosFilhos.filter(f => 
    f.nome.toLowerCase().includes(termoBusca.toLowerCase())
  )

  if (!session) {
    return <Login />
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand-container">
          <img src="/logo.png" alt="Logo TTZ" className="brand-logo" onError={(e) => (e.currentTarget.style.display = 'none')} />
          <h2>TTZ GESTÃO</h2>
          <h5>Terreiro de Umbanda <br /> Baiana Terezinha e Zé Pelintra</h5>
        </div>
        <nav>
          <button className={`nav-item ${telaAtiva === 'dashboard' ? 'active' : ''}`} onClick={() => setTelaAtiva('dashboard')}>
            <LayoutDashboard size={24}/> Início
          </button>
          <button className={`nav-item ${telaAtiva === 'filhos' ? 'active' : ''}`} onClick={() => {setTelaAtiva('filhos'); setMostrarFormFilho(false)}}>
            <Users size={24}/> Membros
          </button>
          <button className={`nav-item ${telaAtiva === 'financeiro' ? 'active' : ''}`} onClick={() => setTelaAtiva('financeiro')}>
            <Wallet size={24}/> Caixa
          </button>
        </nav>
      </aside>

      <main className="main-content">
        <header className="page-header">
          <div className="header-top">
            <h1>
              {telaAtiva === 'dashboard' ? 'Painel Geral' : telaAtiva === 'filhos' ? 'Gestão da Corrente' : 'Fluxo de Caixa'}
            </h1>
            <div style={{display: 'flex', gap: '10px'}}>
              <button className="theme-toggle-btn" onClick={alternarTema} title="Mudar Tema">
                {tema === 'light' ? <Moon size={22} /> : <Sun size={22} />}
              </button>
              <button className="theme-toggle-btn" onClick={() => supabase.auth.signOut()} title="Sair do Sistema" style={{color: 'var(--danger)'}}>
                <LogOut size={22} />
              </button>
            </div>
          </div>
          
          <div className="header-actions">
            {telaAtiva === 'filhos' && (
              <button className="btn-primary" onClick={() => { setMostrarFormFilho(!mostrarFormFilho); setFilhoEditando(null); }}>
                {mostrarFormFilho ? <List size={20}/> : <UserPlus size={20}/>}
                {mostrarFormFilho ? 'Ver Lista Completa' : 'Adicionar Novo Filho'}
              </button>
            )}
            <div className="filter-box">
              <CalendarDays size={20} color="var(--primary)" />
              <select value={mesReferencia} onChange={e => setMesReferencia(e.target.value)}>
                {mesesDisponiveis.map(m => <option key={m.valor} value={m.valor}>{m.label}</option>)}
              </select>
            </div>
          </div>
        </header>

        {telaAtiva === 'dashboard' && (
          <div style={{width: '100%'}}>
            <section className="stats-grid">
              <div className="stat-card blue">
                <h3>Total Entradas ({mesReferencia})</h3>
                <div className="stat-value">R$ {resumo.totalBruto.toFixed(2)}</div>
              </div>
              <div className="stat-card red">
                <h3>Total Saídas ({mesReferencia})</h3>
                <div className="stat-value">R$ {resumo.gastos.toFixed(2)}</div>
              </div>
              <div className="stat-card green">
                <h3>Saldo Líquido ({mesReferencia})</h3>
                <div className="stat-value">R$ {resumo.lucro.toFixed(2)}</div>
              </div>
            </section>
            
            <div className="dashboard-grid">
              <div className="table-container">
                <h3><AlertCircle size={22} color="var(--warning)"/> Mensalidades Pendentes</h3>
                <div className="table-responsive">
                  <table>
                    <thead>
                      <tr><th>Nome do Membro</th><th>Situação</th></tr>
                    </thead>
                    <tbody>
                      {mesReferencia === 'TODOS' ? (
                        <tr><td colSpan={2} style={{textAlign:'center', padding:'20px'}}>Filtre por um mês específico acima.</td></tr>
                      ) : pendentes.length === 0 ? (
                        <tr><td colSpan={2} style={{textAlign:'center', color:'var(--success)', fontWeight:'bold', padding:'20px'}}>Nenhuma pendência encontrada.</td></tr>
                      ) : (
                        pendentes.map(p => (
                          <tr key={p.id}>
                            <td data-label="Membro"><strong>{p.nome}</strong></td>
                            <td data-label="Situação"><span className="badge-status badge-pendente">PENDENTE</span></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="table-container">
                <h3><Clock size={22} color="var(--secondary)"/> Entradas Recentes</h3>
                <div className="table-responsive">
                  <table>
                    <thead>
                      <tr><th>Nome</th><th>Data de Entrada</th></tr>
                    </thead>
                    <tbody>
                      {todosFilhos.slice(0, 5).map(f => (
                        <tr key={f.id}>
                          <td data-label="Nome"><strong>{f.nome}</strong></td>
                          <td data-label="Entrada">{formatarData(f.data_entrada)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {telaAtiva === 'filhos' && (
          <div style={{width: '100%'}}>
            {mostrarFormFilho ? (
              <div className="table-container" style={{maxWidth: '850px', margin: '0 auto'}}>
                <CadastroFilho 
                  filhoEditando={filhoEditando} 
                  onSucesso={() => {setMostrarFormFilho(false); carregarDados()}} 
                  onCancelar={() => setMostrarFormFilho(false)}
                />
              </div>
            ) : (
              <div className="table-container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '20px' }}>
                  <h3 style={{ margin: 0 }}><Users size={22} color="var(--primary)"/> Lista Completa de Filhos</h3>
                  
                  <div className="input-with-icon" style={{ maxWidth: '300px' }}>
                    <Search size={20} className="input-icon" style={{ color: 'var(--primary)' }} />
                    <input 
                      type="text" 
                      placeholder="Buscar membro..." 
                      value={termoBusca}
                      onChange={(e) => setTermoBusca(e.target.value)}
                      style={{ borderRadius: '20px' }}
                    />
                  </div>
                </div>

                <div className="table-responsive">
                  <table>
                    <thead>
                      <tr>
                        <th style={{width: '60px'}}></th>
                        <th style={{width: '40%'}}>Nome Completo</th>
                        <th style={{width: '30%'}}>Data de Entrada</th>
                        <th style={{textAlign: 'center', width: '30%'}}>Gestão</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filhosFiltrados.length === 0 ? (
                         <tr><td colSpan={4} style={{textAlign: 'center', padding: '30px', color: 'var(--text-muted)'}}>Nenhum membro encontrado com "{termoBusca}"</td></tr>
                      ) : (
                        filhosFiltrados.map(f => (
                          <React.Fragment key={f.id}>
                            <tr 
                              className={`main-row ${filhoExpandido === f.id ? 'is-expanded' : ''}`}
                              onClick={() => toggleExpandir(f)} 
                              style={{cursor: 'pointer'}}
                            >
                              <td style={{textAlign: 'center'}}>{filhoExpandido === f.id ? <ChevronUp size={22} color="var(--text-muted)"/> : <ChevronDown size={22} color="var(--text-muted)"/>}</td>
                              <td data-label="Nome" style={{fontWeight: 700}}>{f.nome}</td>
                              <td data-label="Entrada">{formatarData(f.data_entrada)}</td>
                              <td data-label="Ações" className="action-cell" onClick={e => e.stopPropagation()}>
                                <div style={{display: 'flex', gap: '20px', justifyContent: 'center'}}>
                                  <button onClick={() => {setFilhoEditando(f); setMostrarFormFilho(true)}} style={{background:'none', border:'none', cursor:'pointer'}}><Pencil size={20} color="var(--warning)"/></button>
                                  <button onClick={() => { if(window.confirm(`Excluir definitivamente ${f.nome}?`)) supabase.from('filhos').delete().eq('id', f.id).then(() => carregarDados())}} style={{background:'none', border:'none', cursor:'pointer'}}><Trash2 size={20} color="var(--danger)"/></button>
                                </div>
                              </td>
                            </tr>
                            
                            {filhoExpandido === f.id && (
                              <tr className="expanded-crm-row">
                                <td colSpan={4}>
                                  <div className="crm-box">
                                    <div className="crm-grid">
                                      <div className="crm-profile">
                                        <div className="crm-avatar"><Camera size={35} /></div>
                                        <h4 style={{fontSize:'1.2rem', fontWeight:800, marginBottom: '5px'}}>{f.nome}</h4>
                                        
                                        {/* AVALIA SE É ISENTO PARA MOSTRAR O SELO DEBAIXO DA FOTO */}
                                        {f.isento ? (
                                          <span className="badge-status badge-isento">ISENTO DE MENSALIDADE</span>
                                        ) : (
                                          <span className="badge-status badge-pago">ATIVO NA CORRENTE</span>
                                        )}

                                        <div style={{marginTop: '20px', textAlign: 'left'}}>
                                          <div className="crm-info-item"><span>ID de Registro:</span> <strong>#{f.id}</strong></div>
                                          <div className="crm-info-item"><span>Data de Nascimento:</span> <strong>{formatarData(f.data_nascimento)}</strong></div>
                                          <div className="crm-info-item"><span>Entrou na Casa em:</span> <strong>{formatarData(f.data_entrada)}</strong></div>
                                        </div>
                                      </div>
                                      <div className="crm-history">
                                        <h4 style={{marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px'}}><Wallet size={20} color="var(--success)"/> Histórico Financeiro</h4>
                                        <div className="history-scroll">
                                          <table style={{minWidth: '100%'}}>
                                            <thead>
                                              <tr><th>Mês Ref.</th><th>Status</th><th>Data Pagamento</th></tr>
                                            </thead>
                                            <tbody>
                                              {historicoMensalidades.map((h, i) => (
                                                <tr key={i} style={{marginBottom: '0', padding: '10px', boxShadow: 'none', borderBottom: '1px solid var(--border)', borderRadius: '0'}}>
                                                  <td data-label="Mês Ref."><strong>{h.ref}</strong></td>
                                                  <td data-label="Status">
                                                    {h.status === 'PAGO' && <span className="badge-status badge-pago"><CheckCircle2 size={14}/> PAGO</span>}
                                                    {h.status === 'PENDENTE' && <span className="badge-status badge-pendente"><XCircle size={14}/> PENDENTE</span>}
                                                    {h.status === 'ADIANTADO' && <span className="badge-status badge-adiantado"><FastForward size={14}/> ADIANTADO</span>}
                                                    {h.status === 'ISENTO' && <span className="badge-status badge-isento">ISENTO</span>}
                                                  </td>
                                                  <td data-label="Data Pgto">{formatarData(h.dt)}</td>
                                                </tr>
                                              ))}
                                              {historicoMensalidades.length === 0 && (
                                                <tr><td colSpan={3} style={{textAlign: 'center', padding: '20px'}}>Sem histórico gerado.</td></tr>
                                              )}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {telaAtiva === 'financeiro' && <LancamentoFinanceiro mesFiltro={mesReferencia}/>}
      </main>
    </div>
  )
}