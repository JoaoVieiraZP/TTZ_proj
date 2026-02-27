import React, { useState, useEffect } from "react";
import { supabase } from "../config/supabase";
import {
  Trash2,
  PlusCircle,
  History,
  Pencil,
  Save,
  X,
  Lock,
  ChevronDown,
  ChevronUp,
  User,
  CalendarDays,
  Tag,
  AlignLeft,
  PartyPopper,
  Filter // <-- NOVO: Ícone de Filtro
} from "lucide-react";

const maskData = (v: string) => {
  let r = v.replace(/\D/g, "").slice(0, 8);
  if (r.length > 4) return `${r.slice(0, 2)}/${r.slice(2, 4)}/${r.slice(4)}`;
  if (r.length > 2) return `${r.slice(0, 2)}/${r.slice(2)}`;
  return r;
};

const maskMesAno = (v: string) => {
  let r = v.replace(/\D/g, "").slice(0, 6);
  if (r.length > 2) return `${r.slice(0, 2)}/${r.slice(2)}`;
  return r;
};

export function LancamentoFinanceiro({
  mesFiltro,
  isAdmin,
}: {
  mesFiltro: string;
  isAdmin: boolean;
}) {
  const [filhos, setFilhos] = useState<any[]>([]);
  const [historico, setHistorico] = useState<any[]>([]);
  const [todasFestas, setTodasFestas] = useState<any[]>([]);
  
  const [idEdicao, setIdEdicao] = useState<number | null>(null);
  const [outraCat, setOutraCat] = useState("");
  const [lancamentoExpandido, setLancamentoExpandido] = useState<number | null>(null);
  const [isencaoMes, setIsencaoMes] = useState(false);

  // <-- NOVO: Estado para o filtro de Entradas/Saídas
  const [tipoFiltro, setTipoFiltro] = useState<"TODOS" | "ENTRADA" | "SAIDA">("TODOS");

  const [formData, setFormData] = useState({
    valor: "",
    tipo: "ENTRADA",
    categoria: "MENSALIDADE",
    mes_referencia: mesFiltro === "TODOS" ? "" : mesFiltro,
    data_pagamento: "",
    filho_id: "",
    festa_id: "",
    descricao: "",
  });

  async function carregar() {
    const { data: f } = await supabase.from("filhos").select("id, nome, ativo").order("nome");
    setFilhos(f || []);

    const { data: festas } = await supabase.from("festas").select("id, nome, ativa").order("data_evento", { ascending: false });
    setTodasFestas(festas || []);

    let q = supabase.from("financeiro").select("*").order("id", { ascending: false });
    if (mesFiltro !== "TODOS") q = q.eq("mes_referencia", mesFiltro);
    const { data: h } = await q.limit(50);
    setHistorico(h || []);
  }

  useEffect(() => {
    carregar();
  }, [mesFiltro]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;

    if (formData.mes_referencia.length !== 7) {
      alert("Por favor, preencha o Mês de Referência no formato completo: MM/AAAA (Ex: 02/2026)");
      return;
    }

    if (formData.categoria === "FESTA" && !formData.festa_id) {
      alert("Por favor, selecione a qual festa este lançamento pertence!");
      return;
    }

    const [d, m, y] = formData.data_pagamento.split("/");
    const valorFinal = isencaoMes ? 0 : parseFloat(formData.valor);

    const payload = {
      ...formData,
      valor: valorFinal,
      data_pagamento: `${y}-${m}-${d}`,
      categoria: formData.categoria === "OUTROS" ? outraCat : formData.categoria,
      filho_id: formData.filho_id || null,
      festa_id: formData.categoria === "FESTA" ? formData.festa_id : null,
      descricao: isencaoMes && !formData.descricao ? "Isenção concedida neste mês" : formData.descricao,
      is_isencao: isencaoMes 
    };

    if (idEdicao) {
      await supabase.from("financeiro").update(payload).eq("id", idEdicao);
    } else {
      await supabase.from("financeiro").insert([payload]);
    }

    setFormData({
      valor: "",
      tipo: "ENTRADA",
      categoria: "MENSALIDADE",
      mes_referencia: mesFiltro === "TODOS" ? "" : mesFiltro,
      data_pagamento: "",
      filho_id: "",
      festa_id: "",
      descricao: "",
    });
    setIdEdicao(null);
    setOutraCat("");
    setIsencaoMes(false);
    carregar();
  }

  function toggleExpandir(id: number) {
    if (lancamentoExpandido === id) return setLancamentoExpandido(null);
    setLancamentoExpandido(id);
  }

  // <-- NOVO: Aplica o filtro antes de renderizar a lista
  const historicoFiltrado = historico.filter((h) => {
    if (tipoFiltro === "TODOS") return true;
    return h.tipo === tipoFiltro;
  });

  return (
    <div className="dashboard-grid">
      <div className="table-container">
        <h3>
          {idEdicao ? (
            <Pencil size={22} color="var(--warning)" />
          ) : (
            <PlusCircle size={22} color="var(--success)" />
          )}
          {idEdicao ? "Editar Lançamento" : "Novo Lançamento"}
        </h3>

        {isAdmin ? (
          <form onSubmit={salvar}>
            <div className="form-row">
              <div className="form-group">
                <label>Valor da Operação (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={isencaoMes ? "0" : formData.valor}
                  onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                  placeholder="Ex: 50,00"
                  required={!isencaoMes}
                  disabled={isencaoMes}
                />
              </div>
              <div className="form-group">
                <label>Data do Pagamento / Lançamento</label>
                <input
                  type="text"
                  placeholder="DD/MM/AAAA"
                  value={formData.data_pagamento}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      data_pagamento: maskData(e.target.value),
                    })
                  }
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Tipo de Operação</label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                >
                  <option value="ENTRADA">Entrada de Dinheiro</option>
                  <option value="SAIDA">Saída de Dinheiro</option>
                </select>
              </div>
              <div className="form-group">
                <label>Mês de Referência</label>
                <input
                  type="text"
                  placeholder="MM/AAAA"
                  value={formData.mes_referencia}
                  onChange={(e) =>
                    setFormData({ ...formData, mes_referencia: maskMesAno(e.target.value) })
                  }
                  maxLength={7}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Categoria do Lançamento</label>
              <select
                value={formData.categoria}
                onChange={(e) => {
                  setFormData({ ...formData, categoria: e.target.value });
                  if (e.target.value !== "MENSALIDADE") setIsencaoMes(false);
                }}
              >
                <option value="MENSALIDADE">Mensalidade da Corrente</option>
                <option value="FESTA">Festa / Evento</option>
                <option value="BEBIDA_FUMO">Bebidas e Fumos</option>
                <option value="VELA">Compra de Velas</option>
                <option value="OUTROS">Outros</option>
              </select>
            </div>

            {formData.categoria === "FESTA" && (
              <div className="form-group" style={{ background: 'rgba(139, 92, 246, 0.05)', padding: '15px', borderRadius: '8px', border: '1px solid #8b5cf6', marginTop: '10px' }}>
                <label style={{ color: '#8b5cf6', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <PartyPopper size={18} /> Vincular a qual Evento/Festa?
                </label>
                <select
                  value={formData.festa_id}
                  onChange={(e) => setFormData({ ...formData, festa_id: e.target.value })}
                  style={{ borderColor: '#8b5cf6' }}
                  required
                >
                  <option value="">Selecione uma festa...</option>
                  {todasFestas
                    .filter(f => f.ativa || String(f.id) === String(formData.festa_id))
                    .map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.nome} {f.ativa === false ? '(Concluída)' : ''}
                      </option>
                  ))}
                </select>
              </div>
            )}

            {formData.categoria === "MENSALIDADE" && (
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-sub)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <input 
                  type="checkbox" 
                  id="isencaoMes" 
                  checked={isencaoMes} 
                  onChange={e => {
                    setIsencaoMes(e.target.checked);
                    if (e.target.checked) setFormData({...formData, valor: "0"});
                    else setFormData({...formData, valor: ""});
                  }} 
                  style={{ width: '22px', height: '22px', cursor: 'pointer' }}
                />
                <label htmlFor="isencaoMes" style={{ margin: 0, cursor: 'pointer', fontWeight: 'bold', color: 'var(--text-dark)' }}>
                  Isentar membro neste mês (Marcador Oficial)
                </label>
              </div>
            )}

            {formData.categoria === "OUTROS" && (
              <div className="form-group">
                <label>Especifique a Categoria</label>
                <input
                  type="text"
                  value={outraCat}
                  placeholder="Ex: Material de Limpeza"
                  onChange={(e) => setOutraCat(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label>Vincular a um Membro (Opcional)</label>
              <select
                value={formData.filho_id}
                onChange={(e) => setFormData({ ...formData, filho_id: e.target.value })}
              >
                <option value="">Lançamento Geral da Casa (Sem Vínculo)</option>
                {filhos
                  .filter(f => f.ativo !== false || String(f.id) === String(formData.filho_id))
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome} {f.ativo === false ? '(Inativo)' : ''}
                    </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Descrição / Observação (Opcional)</label>
              <textarea
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder={isencaoMes ? "Isenção concedida neste mês" : "Ex: 1kg Vela Branca / Pgto de Cota"}
                rows={2}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  background: "var(--bg-main)",
                  color: "var(--text-dark)",
                  fontFamily: "inherit",
                  resize: "vertical",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "15px", marginTop: "20px" }}>
              <button
                type="submit"
                className="btn-primary"
                style={{
                  flex: 1,
                  background: idEdicao ? "var(--warning)" : "var(--primary)",
                }}
              >
                <Save size={20} />{" "}
                {idEdicao ? "Atualizar Registro" : "Salvar no Caixa"}
              </button>
              {idEdicao && (
                <button
                  type="button"
                  onClick={() => {
                    setIdEdicao(null);
                    setIsencaoMes(false);
                    setFormData({
                      ...formData,
                      valor: "",
                      data_pagamento: "",
                      descricao: "",
                      filho_id: "",
                      festa_id: "",
                    });
                  }}
                  className="btn-primary"
                  style={{ background: "var(--danger)", width: "auto" }}
                >
                  <X size={20} /> Cancelar
                </button>
              )}
            </div>
          </form>
        ) : (
          <div
            style={{
              textAlign: "center",
              padding: "40px 20px",
              background: "var(--bg-sub)",
              borderRadius: "12px",
              color: "var(--text-muted)",
            }}
          >
            <Lock size={40} style={{ marginBottom: "15px", opacity: 0.5 }} />
            <h4 style={{ fontSize: "1.1rem", marginBottom: "5px" }}>
              Cofre Trancado
            </h4>
            <p style={{ fontSize: "0.9rem" }}>
              Modo Leitura: Apenas administradores do Terreiro podem registrar
              ou alterar lançamentos financeiros.
            </p>
          </div>
        )}
      </div>

      <div className="table-container">
        {/* === NOVO: Cabeçalho com o Filtro lado a lado === */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '15px' }}>
          <h3 style={{ margin: 0 }}>
            <History size={22} color="var(--secondary)" /> Últimas Movimentações ({mesFiltro})
          </h3>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={18} color="var(--text-muted)" />
            <select 
              value={tipoFiltro} 
              onChange={(e) => setTipoFiltro(e.target.value as any)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-sub)', color: 'var(--text-dark)', fontWeight: 'bold' }}
            >
              <option value="TODOS">Todas Movimentações</option>
              <option value="ENTRADA">🟢 Entradas</option>
              <option value="SAIDA">🔴 Saídas</option>
            </select>
          </div>
        </div>

        <div className="table-responsive" style={{ maxHeight: "530px", overflowY: "auto", paddingRight: "5px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ position: "sticky", top: 0, zIndex: 10, background: "var(--bg-sub)" }}>
              <tr>
                <th style={{ width: "60px" }}></th>
                <th>Mês Ref.</th>
                <th>Categoria</th>
                <th>Valor</th>
                <th style={{ textAlign: "center" }}>Ação</th>
              </tr>
            </thead>

            <tbody>
              {historicoFiltrado.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "20px" }}>
                    Nenhum lançamento encontrado para este filtro.
                  </td>
                </tr>
              ) : (
                historicoFiltrado.map((h) => {
                  const filhoVinculado = filhos.find((f) => f.id === h.filho_id);
                  const festaVinculada = todasFestas.find((f) => f.id === h.festa_id);

                  return (
                    <React.Fragment key={h.id}>
                      <tr
                        className={`main-row ${lancamentoExpandido === h.id ? "is-expanded" : ""}`}
                        onClick={() => toggleExpandir(h.id)}
                        style={{ cursor: "pointer" }}
                      >
                        <td style={{ textAlign: "center" }}>
                          {lancamentoExpandido === h.id ? (
                            <ChevronUp size={22} color="var(--text-muted)" />
                          ) : (
                            <ChevronDown size={22} color="var(--text-muted)" />
                          )}
                        </td>
                        <td data-label="Mês Ref.">
                          <strong>{h.mes_referencia}</strong>
                        </td>
                        
                        <td data-label="Categoria">
                          <div style={{ fontWeight: 'bold' }}>{h.categoria}</div>
                          {festaVinculada && (
                            <span style={{display: 'block', fontSize: '0.75rem', color: '#8b5cf6', fontWeight: 'bold', marginTop: '2px'}}>
                              Festa: {festaVinculada.nome}
                            </span>
                          )}
                          {h.descricao && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '4px', lineHeight: '1.2' }}>
                              "{h.descricao}"
                            </div>
                          )}
                        </td>

                        <td
                          data-label="Valor"
                          style={{
                            color: h.tipo === "ENTRADA" ? "var(--success)" : "var(--danger)",
                            fontWeight: 800,
                          }}
                        >
                          {h.tipo === "ENTRADA" ? "+ " : "- "}R${" "}
                          {h.valor.toFixed(2)}
                        </td>

                        <td data-label="Ação" className="action-cell" onClick={(e) => e.stopPropagation()}>
                          {isAdmin ? (
                            <div style={{ display: "flex", gap: "15px", justifyItems: "center", justifyContent: "center" }}>
                              <button
                                onClick={() => {
                                  setFormData({
                                    valor: h.valor.toString(),
                                    tipo: h.tipo,
                                    categoria: ["MENSALIDADE", "FESTA", "BEBIDA_FUMO", "VELA"].includes(h.categoria) ? h.categoria : "OUTROS",
                                    mes_referencia: h.mes_referencia,
                                    data_pagamento: h.data_pagamento.split("-").reverse().join("/"),
                                    filho_id: h.filho_id || "",
                                    festa_id: h.festa_id || "",
                                    descricao: h.descricao || "",
                                  });
                                  if (!["MENSALIDADE", "FESTA", "BEBIDA_FUMO", "VELA"].includes(h.categoria)) setOutraCat(h.categoria);
                                  setIdEdicao(h.id);
                                  setIsencaoMes(h.is_isencao === true);
                                  window.scrollTo({ top: 0, behavior: "smooth" });
                                }}
                                style={{ background: "none", border: "none", cursor: "pointer" }}
                                title="Editar"
                              >
                                <Pencil size={20} color="var(--warning)" />
                              </button>

                              <button
                                onClick={async () => {
                                  if (window.confirm("Tem certeza que deseja excluir este lançamento do caixa?")) {
                                    await supabase.from("financeiro").delete().eq("id", h.id);
                                    carregar();
                                  }
                                }}
                                style={{ background: "none", border: "none", cursor: "pointer" }}
                                title="Excluir"
                              >
                                <Trash2 size={20} color="var(--danger)" />
                              </button>
                            </div>
                          ) : (
                            <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: "bold" }}>--</div>
                          )}
                        </td>
                      </tr>

                      {lancamentoExpandido === h.id && (
                        <tr className="expanded-crm-row">
                          <td colSpan={5}>
                            <div className="crm-box" style={{ background: "var(--bg-main)" }}>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "25px", padding: "10px" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                                  <span style={{ color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: "bold", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "5px" }}>
                                    <CalendarDays size={16} /> Data:
                                  </span>
                                  <div style={{ fontWeight: 800, color: "var(--text-dark)" }}>
                                    {h.data_pagamento.split("-").reverse().join("/")}
                                  </div>
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                                  <span style={{ color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: "bold", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "5px" }}>
                                    <User size={16} /> Vínculo Pessoal:
                                  </span>
                                  <div style={{ fontWeight: 800, color: filhoVinculado ? "var(--primary)" : "var(--text-dark)" }}>
                                    {filhoVinculado ? `${filhoVinculado.nome} ${filhoVinculado.ativo === false ? '(Inativo)' : ''}` : "Lançamento Geral"}
                                  </div>
                                </div>
                                
                                {festaVinculada && (
                                  <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                                    <span style={{ color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: "bold", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "5px" }}>
                                      <PartyPopper size={16} /> Vínculo de Festa:
                                    </span>
                                    <div style={{ fontWeight: 800, color: "#8b5cf6" }}>
                                      {festaVinculada.nome}
                                    </div>
                                  </div>
                                )}

                                <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                                  <span style={{ color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: "bold", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "5px" }}>
                                    <Tag size={16} /> Natureza:
                                  </span>
                                  <div>
                                    {h.tipo === "ENTRADA" ? (
                                      <span className="badge-status badge-pago">ENTRADA</span>
                                    ) : (
                                      <span className="badge-status badge-pendente">SAÍDA</span>
                                    )}
                                  </div>
                                </div>

                                {h.descricao && (
                                  <div style={{ display: "flex", flexDirection: "column", gap: "5px", width: "100%", marginTop: "10px", paddingTop: "10px", borderTop: "1px solid var(--border)" }}>
                                    <span style={{ color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: "bold", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "5px" }}>
                                      <AlignLeft size={16} /> Observações:
                                    </span>
                                    <div style={{ color: "var(--text-dark)", lineHeight: "1.5", fontStyle: "italic" }}>
                                      "{h.descricao}"
                                    </div>
                                  </div>
                                )}
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