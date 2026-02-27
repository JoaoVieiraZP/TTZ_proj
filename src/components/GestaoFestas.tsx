import React, { useState, useEffect } from "react";
import { supabase } from "../config/supabase";
import { 
  PlusCircle, Save, X, CalendarDays, Target, PartyPopper, 
  Pencil, ChevronDown, ChevronUp, Wallet, CheckCircle2, Clock, 
  TrendingDown, TrendingUp, Trash2, Archive, RotateCcw
} from "lucide-react";

const maskData = (v: string) => {
  let r = v.replace(/\D/g, "").slice(0, 8);
  if (r.length > 4) return `${r.slice(0, 2)}/${r.slice(2, 4)}/${r.slice(4)}`;
  if (r.length > 2) return `${r.slice(0, 2)}/${r.slice(2)}`;
  return r;
};

const formatarData = (data: string) => {
  if (!data) return '--/--/----';
  const [ano, mes, dia] = data.split('T')[0].split('-');
  return `${dia}/${mes}/${ano}`;
};

export function GestaoFestas({ isAdmin }: { isAdmin: boolean }) {
  const [festas, setFestas] = useState<any[]>([]);
  const [membros, setMembros] = useState<any[]>([]);
  const [caixaFesta, setCaixaFesta] = useState<any[]>([]);
  
  const [mostrarForm, setMostrarForm] = useState(false);
  const [idEdicao, setIdEdicao] = useState<number | null>(null);
  const [festaExpandida, setFestaExpandida] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    nome: "",
    data_evento: "",
    meta_valor: "",
    ativa: true,
  });

  async function carregarDadosIniciais() {
    const { data: f } = await supabase.from("festas").select("*").order("data_evento", { ascending: false });
    setFestas(f || []);

    const { data: m } = await supabase.from("filhos").select("id, nome, ativo").order("nome");
    setMembros(m || []);
  }

  useEffect(() => {
    carregarDadosIniciais();
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;

    if (formData.data_evento.length !== 10) {
      alert("Preencha a data completa no formato DD/MM/AAAA");
      return;
    }

    const [d, m, y] = formData.data_evento.split("/");
    const payload = {
      nome: formData.nome,
      data_evento: `${y}-${m}-${d}`,
      meta_valor: parseFloat(formData.meta_valor),
      ativa: formData.ativa,
    };

    if (idEdicao) {
      await supabase.from("festas").update(payload).eq("id", idEdicao);
    } else {
      await supabase.from("festas").insert([payload]);
    }

    setFormData({ nome: "", data_evento: "", meta_valor: "", ativa: true });
    setIdEdicao(null);
    setMostrarForm(false);
    carregarDadosIniciais();
  }

  async function toggleExpandir(festaId: number) {
    if (festaExpandida === festaId) {
      setFestaExpandida(null);
      return;
    }
    setFestaExpandida(festaId);
    
    const { data: fin } = await supabase
      .from("financeiro")
      .select("*")
      .eq("festa_id", festaId);
    setCaixaFesta(fin || []);
  }

  return (
    <div style={{ width: "100%" }}>
      {mostrarForm && isAdmin ? (
        <div className="table-container" style={{ maxWidth: "800px", margin: "0 auto 30px auto" }}>
          <h3 style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {idEdicao ? <Pencil size={22} color="var(--warning)" /> : <PlusCircle size={22} color="var(--success)" />}
            {idEdicao ? "Editar Festa" : "Cadastrar Nova Festa"}
          </h3>
          <form onSubmit={salvar}>
            <div className="form-group">
              <label>Nome da Festa / Evento</label>
              <input type="text" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} placeholder="Ex: Festa de Baiano / Malandro" required />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Data do Evento</label>
                <input type="text" value={formData.data_evento} onChange={(e) => setFormData({ ...formData, data_evento: maskData(e.target.value) })} placeholder="DD/MM/AAAA" maxLength={10} required />
              </div>
              <div className="form-group">
                <label>Meta de Arrecadação (Por Filho - R$)</label>
                <input type="number" step="0.01" value={formData.meta_valor} onChange={(e) => setFormData({ ...formData, meta_valor: e.target.value })} placeholder="Ex: 30,00" required />
              </div>
            </div>

            <div className="form-group" style={{ display: "flex", alignItems: "center", gap: "10px", background: "var(--bg-sub)", padding: "12px", borderRadius: "8px", border: "1px solid var(--border)" }}>
              <input type="checkbox" id="festaAtiva" checked={formData.ativa} onChange={(e) => setFormData({ ...formData, ativa: e.target.checked })} style={{ width: "22px", height: "22px", cursor: "pointer" }} />
              <label htmlFor="festaAtiva" style={{ margin: 0, cursor: "pointer", fontWeight: "bold", color: "var(--text-dark)" }}>Festa Ativa (Arrecadação Aberta)</label>
            </div>

            <div style={{ display: "flex", gap: "15px", marginTop: "20px" }}>
              <button type="button" onClick={() => { setMostrarForm(false); setIdEdicao(null); }} className="btn-primary" style={{ background: "var(--danger)" }}><X size={20} /> Cancelar</button>
              <button type="submit" className="btn-primary" style={{ flex: 1, background: "var(--primary)" }}><Save size={20} /> Salvar Festa</button>
            </div>
          </form>
        </div>
      ) : (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "20px" }}>
          {isAdmin && (
            <button className="btn-primary" onClick={() => { setFormData({ nome: "", data_evento: "", meta_valor: "", ativa: true }); setMostrarForm(true); }}>
              <PlusCircle size={20} /> Cadastrar Nova Festa
            </button>
          )}
        </div>
      )}

      <div className="table-container">
        <h3><PartyPopper size={22} color="var(--primary)" /> Painel de Eventos</h3>
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th style={{width: '60px'}}></th>
                <th>Nome da Festa</th>
                <th>Data</th>
                <th>Cota por Filho</th>
                <th>Status</th>
                <th style={{ textAlign: "center" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {festas.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: "20px" }}>Nenhuma festa cadastrada.</td></tr>
              ) : (
                festas.map((f) => {
                  
                  let totalArrecadado = 0;
                  let totalGasto = 0;
                  let pagantesIds: number[] = [];
                  let gastosMapeados: any[] = [];

                  if (festaExpandida === f.id) {
                    caixaFesta.forEach(mov => {
                      if (mov.tipo === 'ENTRADA') {
                        totalArrecadado += mov.valor;
                        if (mov.filho_id) pagantesIds.push(mov.filho_id);
                      } else {
                        totalGasto += mov.valor;
                        gastosMapeados.push(mov);
                      }
                    });
                  }

                  const membrosAtivos = membros.filter(m => m.ativo !== false);
                  const pagantes = membrosAtivos.filter(m => pagantesIds.includes(m.id));
                  const pendentes = membrosAtivos.filter(m => !pagantesIds.includes(m.id));
                  const saldoFesta = totalArrecadado - totalGasto;

                  return (
                    <React.Fragment key={f.id}>
                      <tr 
                        className={`main-row ${festaExpandida === f.id ? 'is-expanded' : ''}`}
                        onClick={() => toggleExpandir(f.id)}
                        style={{ cursor: "pointer", opacity: f.ativa ? 1 : 0.7 }}
                      >
                        <td style={{textAlign: 'center'}}>{festaExpandida === f.id ? <ChevronUp size={22} color="var(--text-muted)"/> : <ChevronDown size={22} color="var(--text-muted)"/>}</td>
                        <td data-label="Festa" style={{fontWeight: 700}}><strong>{f.nome}</strong></td>
                        <td data-label="Data"><CalendarDays size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: "5px", color: "var(--text-muted)" }}/>{formatarData(f.data_evento)}</td>
                        <td data-label="Cota"><Target size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: "5px", color: "var(--warning)" }}/>R$ {f.meta_valor.toFixed(2)}</td>
                        <td data-label="Status">
                          {f.ativa ? <span className="badge-status badge-pago">ATIVA</span> : <span className="badge-status" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid var(--border)' }}>CONCLUÍDA</span>}
                        </td>
                        <td data-label="Ações" className="action-cell" onClick={e => e.stopPropagation()}>
                          {isAdmin ? (
                            <div style={{ display: "flex", gap: "15px", justifyContent: "center" }}>
                              
                              {/* BOTÃO EDITAR */}
                              <button onClick={() => {
                                  setFormData({ nome: f.nome, data_evento: f.data_evento.split("-").reverse().join("/"), meta_valor: f.meta_valor.toString(), ativa: f.ativa });
                                  setIdEdicao(f.id);
                                  setMostrarForm(true);
                                  window.scrollTo({ top: 0, behavior: "smooth" });
                                }}
                                style={{ background: "none", border: "none", cursor: "pointer" }} title="Editar Festa"
                              ><Pencil size={20} color="var(--warning)" /></button>

                              {/* BOTÃO DESATIVAR/ATIVAR RÁPIDO */}
                              <button onClick={async () => {
                                  if (window.confirm(f.ativa ? `Encerrar a arrecadação da festa "${f.nome}"?` : `Reabrir a festa "${f.nome}"?`)) {
                                    await supabase.from("festas").update({ ativa: !f.ativa }).eq("id", f.id);
                                    carregarDadosIniciais();
                                  }
                                }}
                                style={{ background: "none", border: "none", cursor: "pointer" }} 
                                title={f.ativa ? "Concluir/Arquivar Festa" : "Reabrir Festa"}
                              >
                                {f.ativa ? <Archive size={20} color="var(--text-muted)" /> : <RotateCcw size={20} color="var(--success)" />}
                              </button>

                              {/* BOTÃO EXCLUIR */}
                              <button onClick={async () => {
                                  if (window.confirm(`ATENÇÃO: Tem certeza que deseja apagar a festa "${f.nome}" do sistema?`)) {
                                    const { error } = await supabase.from("festas").delete().eq("id", f.id);
                                    if (error) {
                                      alert("🚨 Não é possível excluir esta festa pois já existem pagamentos ou gastos vinculados a ela no Caixa!\n\nSe a festa já passou, use o botão de ARQUIVAR (Caixinha) ao lado para inativá-la e não perder o histórico contábil.");
                                    } else {
                                      carregarDadosIniciais();
                                    }
                                  }
                                }}
                                style={{ background: "none", border: "none", cursor: "pointer" }} title="Excluir Festa"
                              ><Trash2 size={20} color="var(--danger)" /></button>

                            </div>
                          ) : (
                            <span style={{ color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: "bold", textAlign: "center", display: "block" }}>--</span>
                          )}
                        </td>
                      </tr>

                      {festaExpandida === f.id && (
                        <tr className="expanded-crm-row">
                          <td colSpan={6} style={{ padding: 0 }}>
                            <div className="crm-box" style={{ background: 'var(--bg-main)', border: 'none', borderBottom: '1px solid var(--border)' }}>
                              
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '25px' }}>
                                <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)', padding: '15px', borderRadius: '8px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)', fontWeight: 'bold', marginBottom: '5px' }}><TrendingUp size={20}/> Total Arrecadado</div>
                                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-dark)' }}>R$ {totalArrecadado.toFixed(2)}</div>
                                </div>
                                
                                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', padding: '15px', borderRadius: '8px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger)', fontWeight: 'bold', marginBottom: '5px' }}><TrendingDown size={20}/> Total Gasto</div>
                                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-dark)' }}>R$ {totalGasto.toFixed(2)}</div>
                                </div>
                                
                                <div style={{ background: 'var(--bg-sub)', border: '1px solid var(--border)', padding: '15px', borderRadius: '8px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontWeight: 'bold', marginBottom: '5px' }}><Wallet size={20}/> Saldo Restante</div>
                                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: saldoFesta >= 0 ? 'var(--primary)' : 'var(--danger)' }}>R$ {saldoFesta.toFixed(2)}</div>
                                </div>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '25px' }}>
                                
                                <div>
                                  <h4 style={{ marginBottom: '15px', borderBottom: '1px solid var(--border)', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                                    <span>Arrecadação na Corrente</span>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{pagantes.length} de {membrosAtivos.length} pagaram</span>
                                  </h4>
                                  
                                  <div style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '15px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                      
                                      {pendentes.map(p => (
                                        <div key={`pend-${p.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
                                          {/* flex: 1 força o nome a ocupar o espaço, mas respeitando o limite */}
                                          <div style={{ color: 'var(--text-dark)', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '10px', flex: 1 }} title={p.nome}>
                                            {p.nome}
                                          </div>
                                          {/* width fixa e flexShrink: 0 impedem que o crachá seja esmagado */}
                                          <div style={{ color: 'var(--warning)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem', flexShrink: 0, width: '85px', justifyContent: 'flex-end' }}>
                                            <Clock size={16}/> Pendente
                                          </div>
                                        </div>
                                      ))}

                                      {pagantes.map(p => (
                                        <div key={`pag-${p.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid var(--border)', opacity: 0.7 }}>
                                          <div style={{ color: 'var(--text-dark)', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '10px', flex: 1 }} title={p.nome}>
                                            {p.nome}
                                          </div>
                                          <div style={{ color: 'var(--success)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem', flexShrink: 0, width: '85px', justifyContent: 'flex-end' }}>
                                            <CheckCircle2 size={16}/> Pagou
                                          </div>
                                        </div>
                                      ))}
                                      
                                      {membrosAtivos.length === 0 && (
                                        <div style={{ textAlign: 'center', padding: '10px', color: 'var(--text-muted)' }}>Nenhum membro ativo cadastrado.</div>
                                      )}

                                    </div>
                                  </div>
                                </div>

                                <div>
                                  <h4 style={{ textAlign: 'center', margin: '15px 0', padding: '10px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', color: 'var(--danger)' }}>
                                    Extrato de Gastos da Festa
                                  </h4>
                                  
                                  <div style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '15px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                      {gastosMapeados.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Nenhum gasto registrado ainda.</div>
                                      ) : (
                                        gastosMapeados.map(g => (
                                          <div key={`gasto-${g.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', paddingRight: '10px', overflow: 'hidden' }}>
                                              <span style={{ fontWeight: 'bold', color: 'var(--text-dark)', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={g.descricao || g.categoria}>
                                                {g.descricao || g.categoria}
                                              </span>
                                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatarData(g.data_pagamento)}</span>
                                            </div>
                                            <div style={{ fontWeight: 800, color: 'var(--danger)', fontSize: '0.95rem', flexShrink: 0 }}>
                                              - R$ {g.valor.toFixed(2)}
                                            </div>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  </div>
                                </div>
                                
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}