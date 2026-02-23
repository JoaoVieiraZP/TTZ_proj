import { useEffect, useState } from 'react'
import { obterInadimplentes } from './services/DashboardService'
import { supabase } from './config/supabase'
import { CadastroFilho } from './components/CadastroFilho'
import { LancamentoFinanceiro } from './components/LancamentoFinanceiro'
import { LayoutDashboard, Users, Wallet, AlertCircle, List, Clock, Trash2, CalendarDays, Pencil } from 'lucide-react'
import './App.css'

// Formatação manual imune à linguagem do navegador
const formatarData = (data: string) => {
  if (!data) return '--/--/----'
  const [ano, mes, dia] = data.split('T')[0].split('-')
  return `${dia}/${mes}/${ano}`
}

function App() {
  const [resumo, setResumo] = useState({ totalBruto: 0, gastos: 0, lucro: 0 })
  const [pendentes, setPendentes] = useState<any[]>([])
  const [todosFilhos, setTodosFilhos] = useState<any[]>([])
  const [telaAtiva, setTelaAtiva] = useState<'dashboard' | 'filhos' | 'financeiro'>('dashboard')
  const [mesesDisponiveis, setMesesDisponiveis] = useState<any[]>([])
  const [filhoEditando, setFilhoEditando] = useState<any>(null)

  const [mesReferencia, setMesReferencia] = useState(() => {
    const hoje = new Date()
    return `${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`
  })

  async function carregarDados() {
    let queryFinancas = supabase.from('financeiro').select('tipo, valor')
    if (mesReferencia !== 'TODOS') queryFinancas = queryFinancas.eq('mes_referencia', mesReferencia)

    const { data: financas } = await queryFinancas

    let bruto = 0
    let saidas = 0

    if (financas) {
      financas.forEach(item => {
        if (item.tipo === 'ENTRADA') bruto += item.valor
        if (item.tipo === 'SAIDA') saidas += item.valor
      })
    }
    setResumo({ totalBruto: bruto, gastos: saidas, lucro: bruto - saidas })
    
    let listaPendentes: any[] = []
    if (mesReferencia !== 'TODOS') listaPendentes = await obterInadimplentes(mesReferencia) || []
    setPendentes(listaPendentes)
    
    const { data: filhosData } = await supabase.from('filhos').select('*').order('id', { ascending: false })
    setTodosFilhos(filhosData || [])

    const { data: finData } = await supabase.from('financeiro').select('mes_referencia')
    const mesesSet = new Set<string>()

    const hoje = new Date()
    mesesSet.add(`${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`)

    if (finData) {
      finData.forEach(item => {
        if (item.mes_referencia && item.mes_referencia.includes('/')) mesesSet.add(item.mes_referencia)
      })
    }

    const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
    const opcoesFormatadas = Array.from(mesesSet).map(val => {
      const [m, a] = val.split('/')
      return { valor: val, label: `${nomesMeses[parseInt(m) - 1]} de ${a}`, ordem: parseInt(`${a}${m}`) }
    })
    opcoesFormatadas.push({ valor: 'TODOS', label: 'Todos os Meses / Visão Geral', ordem: 999999 })
    opcoesFormatadas.sort((a, b) => b.ordem - a.ordem)
    setMesesDisponiveis(opcoesFormatadas)
  }

  useEffect(() => {
    carregarDados()
  }, [telaAtiva, mesReferencia])

  async function deletarFilho(id: number, nome: string) {
    if (window.confirm(`Tem a certeza que deseja excluir o registo de ${nome}?`)) {
      const { error } = await supabase.from('filhos').delete().eq('id', id)
      if (!error) carregarDados()
    }
  }

  function iniciarEdicaoFilho(filho: any) {
    setTelaAtiva('filhos')
    setFilhoEditando(filho)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <h2>TTZ GESTÃO</h2>
        <nav>
          <button className={`nav-item ${telaAtiva === 'dashboard' ? 'active' : ''}`} onClick={() => {setTelaAtiva('dashboard'); setFilhoEditando(null)}}>
            <LayoutDashboard size={20} /> Dashboard
          </button>
          <button className={`nav-item ${telaAtiva === 'filhos' ? 'active' : ''}`} onClick={() => setTelaAtiva('filhos')}>
            <Users size={20} /> Filhos
          </button>
          <button className={`nav-item ${telaAtiva === 'financeiro' ? 'active' : ''}`} onClick={() => {setTelaAtiva('financeiro'); setFilhoEditando(null)}}>
            <Wallet size={20} /> Financeiro
          </button>
        </nav>
      </aside>

      <main className="main-content">
        <header style={{marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <h1 style={{fontSize: '2rem', fontWeight: 800}}>
            {telaAtiva === 'dashboard' ? 'Painel Geral' : telaAtiva === 'filhos' ? 'Gestão de Filhos' : 'Financeiro'}
          </h1>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#fff', padding: '10px 15px', borderRadius: '12px', border: '1px solid #edf2f7' }}>
            <CalendarDays size={20} color="#2d5a27" />
            <select 
              value={mesReferencia}
              onChange={(e) => setMesReferencia(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', outline: 'none', background: '#f8fafc', fontWeight: 'bold', cursor: 'pointer' }}
            >
              {mesesDisponiveis.map(mes => <option key={mes.valor} value={mes.valor}>{mes.label}</option>)}
            </select>
          </div>
        </header>

        {telaAtiva === 'dashboard' && (
          <div style={{width: '100%'}}>
            <section className="stats-grid">
              <div className="stat-card blue"><h3 style={{fontSize: '0.8rem', color: '#636e72'}}>BRUTO</h3><span className="stat-value">R$ {resumo.totalBruto.toFixed(2)}</span></div>
              <div className="stat-card red"><h3 style={{fontSize: '0.8rem', color: '#636e72'}}>SAÍDAS</h3><span className="stat-value">R$ {resumo.gastos.toFixed(2)}</span></div>
              <div className="stat-card green"><h3 style={{fontSize: '0.8rem', color: '#636e72'}}>LUCRO</h3><span className="stat-value">R$ {resumo.lucro.toFixed(2)}</span></div>
            </section>

            <div className="dashboard-grid">
              <div className="table-container">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><AlertCircle size={20} color="#f39c12" /> Pendentes</h3>
                <table>
                  <thead><tr><th>Nome</th><th>Status</th></tr></thead>
                  <tbody>
                    {mesReferencia === 'TODOS' ? <tr><td colSpan={2} style={{textAlign: 'center', padding: '15px'}}>Visão geral ativa.</td></tr> : pendentes.map(f => <tr key={f.id}><td>{f.nome}</td><td><span className="badge-warning">PENDENTE</span></td></tr>)}
                  </tbody>
                </table>
              </div>
              <div className="table-container">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><List size={20} color="#3498db" /> Corrente Completa</h3>
                <table>
                  <thead><tr><th>ID</th><th>Nome</th><th>Nascimento</th><th>Entrada</th><th style={{textAlign: 'center'}}>Ação</th></tr></thead>
                  <tbody>
                    {todosFilhos.map(f => (
                      <tr key={f.id}>
                        <td>#{f.id}</td><td>{f.nome}</td><td>{formatarData(f.data_nascimento)}</td><td>{formatarData(f.data_entrada)}</td>
                        <td style={{textAlign: 'center', display: 'flex', gap: '10px', justifyContent: 'center'}}>
                          <button onClick={() => iniciarEdicaoFilho(f)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><Pencil size={18} color="#f39c12" /></button>
                          <button onClick={() => deletarFilho(f.id, f.nome)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><Trash2 size={18} color="#e74c3c" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {telaAtiva === 'filhos' && (
          <div className="dashboard-grid">
            <div className="table-container">
              <CadastroFilho 
                filhoEditando={filhoEditando} 
                onSucesso={() => { setFilhoEditando(null); carregarDados() }} 
                onCancelar={() => setFilhoEditando(null)} 
              />
            </div>
            <div className="table-container">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Clock size={20} color="#3498db" /> Últimos Membros</h3>
              <table>
                <thead><tr><th>Nome</th><th>Entrada</th><th style={{textAlign: 'center'}}>Ação</th></tr></thead>
                <tbody>
                  {todosFilhos.slice(0, 10).map(f => (
                    <tr key={f.id}>
                      <td>{f.nome}</td><td>{formatarData(f.data_entrada)}</td>
                      <td style={{textAlign: 'center', display: 'flex', gap: '10px', justifyContent: 'center'}}>
                        <button onClick={() => iniciarEdicaoFilho(f)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><Pencil size={18} color="#f39c12" /></button>
                        <button onClick={() => deletarFilho(f.id, f.nome)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><Trash2 size={18} color="#e74c3c" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {telaAtiva === 'financeiro' && (
          <LancamentoFinanceiro mesFiltro={mesReferencia} />
        )}
      </main>
    </div>
  )
}

export default App