import { useState, useEffect } from "react";
import { supabase } from "../config/supabase";
import { CalendarDays, Download, Copy, CheckCircle2 } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ============================================================================
// COLOQUE AQUI O CÓDIGO BASE64 DA SUA LOGO
// ============================================================================
const LOGO_BASE64 = ""; 
// ============================================================================

const formatarDataExcel = (data: string) => {
  if (!data) return "-";
  const [, mes, dia] = data.split("T")[0].split("-");
  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${parseInt(dia)}-${meses[parseInt(mes) - 1]}`;
};

const formatarMoeda = (valor: number) => {
  if (valor === 0) return "-";
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export function Relatorios() {
  const [mesesDisponiveis, setMesesDisponiveis] = useState<any[]>([]);
  const [mesSelecionado, setMesSelecionado] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [relatorio, setRelatorio] = useState<any>(null);
  const [copiado, setCopiado] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState(false);

  useEffect(() => {
    async function carregarDados() {
      const { data } = await supabase.from("financeiro").select("mes_referencia");
      const mSet = new Set<string>();
      const hoje = new Date();
      mSet.add(`${String(hoje.getMonth() + 1).padStart(2, "0")}/${hoje.getFullYear()}`);
      
      data?.forEach((i) => i.mes_referencia && mSet.add(i.mes_referencia));
      
      const opcoes = Array.from(mSet).map((v) => {
        const [m, a] = v.split("/");
        return { valor: v, label: `${m}/${a}`, ordem: parseInt(`${a}${m}`) };
      }).sort((a, b) => b.ordem - a.ordem);

      setMesesDisponiveis(opcoes);
      if (opcoes.length > 0) setMesSelecionado(opcoes[0].valor);
    }
    carregarDados();
  }, []);

  async function gerarRelatorio() {
    if (!mesSelecionado) return;
    setCarregando(true);

    // === BUSCA ABSOLUTA DO SALDO GLOBAL (Invisível na tela, apenas para o PDF/Zap) ===
    const { data: finGeral } = await supabase.from("financeiro").select("valor, tipo");
    const saldoTotalConta = (finGeral || []).reduce((acc, m) => m.tipo === "ENTRADA" ? acc + m.valor : acc - m.valor, 0);

    // === DADOS ESPECÍFICOS DO MÊS ===
    const { data: finMes } = await supabase.from("financeiro").select("*").eq("mes_referencia", mesSelecionado);
    const { data: filhos } = await supabase.from("filhos").select("*").order("nome");
    const { data: festas } = await supabase.from("festas").select("id, nome");

    const movimentacoes = finMes || [];
    const listaFilhos = filhos || [];
    const listaFestas = festas || [];

    const movGeral = movimentacoes.filter((m) => !m.festa_id);
    const movFestas = movimentacoes.filter((m) => m.festa_id);

    const entradasGerais = movGeral.filter((m) => m.tipo === "ENTRADA");
    const saidasGerais = movGeral.filter((m) => m.tipo === "SAIDA").sort((a, b) => new Date(a.data_pagamento).getTime() - new Date(b.data_pagamento).getTime());

    const totalEntradasGerais = entradasGerais.reduce((acc, m) => acc + m.valor, 0);
    const totalSaidasGerais = saidasGerais.reduce((acc, m) => acc + m.valor, 0);

    const pagamentosMensalidade = entradasGerais.filter(m => m.categoria === "MENSALIDADE" && m.filho_id);
    const entradasExtras = entradasGerais.filter(m => m.categoria !== "MENSALIDADE" || !m.filho_id); 

    let pagantesQtd = 0;
    let pendentesQtd = 0;
    let isentosQtd = 0;

    const membrosCorrente = listaFilhos.filter(f => f.ativo !== false).map((f, index) => {
      const pgto = pagamentosMensalidade.find(m => m.filho_id === f.id);
      
      if (f.isento) {
        isentosQtd++;
      } else {
        if (pgto) pagantesQtd++;
        else pendentesQtd++;
      }

      return {
        qtde: index + 1,
        nome: f.nome,
        isento: f.isento,
        pago: !!pgto,
        valor: pgto ? pgto.valor : 0,
        data: pgto ? pgto.data_pagamento : null,
        formaPg: pgto ? "Pix" : "-",
        vencimento: f.dia_vencimento || 10
      };
    });

    const totalMensalidades = membrosCorrente.reduce((acc, m) => acc + m.valor, 0);

    const festasIdsNoMes = [...new Set(movFestas.map(m => m.festa_id))];
    const relatorioFestas = festasIdsNoMes.map(festaId => {
      const nomeFesta = listaFestas.find(f => f.id === festaId)?.nome || "Festa Desconhecida";
      const movsDestaFesta = movFestas.filter(m => m.festa_id === festaId);
      const entFesta = movsDestaFesta.filter(m => m.tipo === "ENTRADA");
      const saiFesta = movsDestaFesta.filter(m => m.tipo === "SAIDA");
      
      const abreviarNome = (nomeCompleto: string) => {
        if (!nomeCompleto) return "";
        const partes = nomeCompleto.split(" ");
        return partes.length === 1 ? partes[0] : `${partes[0]} ${partes[partes.length - 1]}`;
      };

      const idsPagantesFesta = entFesta.filter(m => m.filho_id).map(m => m.filho_id);
      
      const pagantesFestaNomes = listaFilhos
        .filter(f => f.ativo !== false && idsPagantesFesta.includes(f.id))
        .map(f => abreviarNome(f.nome))
        .join(", ");
        
      const pendentesFestaNomes = listaFilhos
        .filter(f => f.ativo !== false && !f.isento && !idsPagantesFesta.includes(f.id))
        .map(f => abreviarNome(f.nome))
        .join(", ");

      return {
        nome: nomeFesta,
        entradas: entFesta,
        totalEntradas: entFesta.reduce((acc, m) => acc + m.valor, 0),
        saidas: saiFesta,
        totalSaidas: saiFesta.reduce((acc, m) => acc + m.valor, 0),
        saldo: entFesta.reduce((acc, m) => acc + m.valor, 0) - saiFesta.reduce((acc, m) => acc + m.valor, 0),
        pagantesLista: pagantesFestaNomes || "Nenhum",
        pendentesLista: pendentesFestaNomes || "Nenhum"
      };
    });

    const mesesNomes = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const [mesNum, anoNum] = mesSelecionado.split("/");
    const nomeMes = `${mesesNomes[parseInt(mesNum) - 1]}-${anoNum.slice(2)}`;

    setRelatorio({
      mesNome: nomeMes,
      mes: mesSelecionado,
      geral: {
        saidas: saidasGerais,
        entradasExtras: entradasExtras,
        totalEntradas: totalEntradasGerais,
        totalSaidas: totalSaidasGerais,
        saldo: totalEntradasGerais - totalSaidasGerais,
        saldoConta: saldoTotalConta // Puxado apenas para o PDF
      },
      corrente: {
        lista: membrosCorrente,
        totalMensalidades,
        resumo: { pagantes: pagantesQtd, pendentes: pendentesQtd, isentos: isentosQtd }
      },
      festas: relatorioFestas
    });

    setCarregando(false);
  }

  function copiarParaWhatsApp() {
    if (!relatorio) return;
    const r = relatorio.corrente.resumo;
    const total = r.pagantes + r.pendentes + r.isentos;
    
    let texto = `📊 *BALANCETE - ${relatorio.mes}*\n\n`;
    texto += `🟢 Arrecadado: R$ ${formatarMoeda(relatorio.geral.totalEntradas)}\n`;
    texto += `🔴 Gasto: R$ ${formatarMoeda(relatorio.geral.totalSaidas)}\n`;
    texto += `💰 Saldo do Mês: R$ ${formatarMoeda(relatorio.geral.saldo)}\n`;
    texto += `🏦 *SALDO TOTAL CONTA: R$ ${formatarMoeda(relatorio.geral.saldoConta)}*\n\n`;
    texto += `*RADAR DA CORRENTE (${total} Médiuns)*\n`;
    texto += `✅ Pagaram: ${r.pagantes}\n`;
    texto += `⚠️ Pendentes: ${r.pendentes}\n`;
    texto += `🤍 Isentos: ${r.isentos}\n`;
    
    navigator.clipboard.writeText(texto + `\n_Gerado por TTZ Gestão_`);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 3000);
  }

  async function baixarPDF() {
    setGerandoPdf(true);
    try {
      const doc = new jsPDF('l', 'mm', 'a4'); 
      const r = relatorio.corrente.resumo;
      const totalMembros = r.pagantes + r.pendentes + r.isentos;
      
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(`TTZ GESTÃO - FECHAMENTO DE CAIXA (${relatorio.mes})`, 10, 14);
      
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Emitido em: ${new Date().toLocaleDateString('pt-BR')} | Total da Corrente: ${totalMembros} Médiuns (${r.pagantes} Pagos | ${r.pendentes} Pendentes | ${r.isentos} Isentos)`, 10, 20);

      if (LOGO_BASE64.length > 50) {
        doc.addImage(LOGO_BASE64, 'PNG', 265, 5, 20, 20);
      }

      const correnteBody = relatorio.corrente.lista.map((m: any) => [
        m.qtde,
        m.nome + (!m.pago && !m.isento ? ` (dia ${m.vencimento})` : ''),
        m.valor > 0 ? formatarMoeda(m.valor) : '-',
        m.isento ? 'Isento' : (m.pago ? 'Pg' : 'Pendente'),
        m.pago ? formatarDataExcel(m.data) : '-'
      ]);
      correnteBody.push(['', 'VALOR MENSALIDADE', formatarMoeda(relatorio.corrente.totalMensalidades), '', '']);

      autoTable(doc, {
        startY: 28,
        margin: { left: 10, right: 145 }, 
        head: [['Qtd', 'Mensalidade', 'Valor', 'Status', 'Data']],
        body: correnteBody,
        theme: 'grid',
        headStyles: { fillColor: [217, 225, 242], textColor: 0, fontStyle: 'bold' },
        styles: { fontSize: 7.5, cellPadding: 0.8, textColor: 0 }, 
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 85 },
          2: { cellWidth: 15, halign: 'center' },
          3: { cellWidth: 16, halign: 'center' },
          4: { cellWidth: 15, halign: 'center' }
        },
        willDrawCell: function(data) {
          if (data.row.index === correnteBody.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [242, 242, 242];
          }
          if (data.column.index === 3) {
            if (data.cell.raw === 'Pendente') data.cell.styles.textColor = [192, 0, 0];
            if (data.cell.raw === 'Pg' || data.cell.raw === 'Isento') data.cell.styles.textColor = [0, 128, 0];
          }
        }
      });

      doc.setPage(1);
      let alturaLadoDireito = 28;

      const resumoBody = [
        ['Total Arrecadado', formatarMoeda(relatorio.geral.totalEntradas)],
        ['Total Gasto', `- ${formatarMoeda(relatorio.geral.totalSaidas)}`],
        ['Saldo Líquido do Mês', formatarMoeda(relatorio.geral.saldo)],
        ['SALDO TOTAL EM CONTA', formatarMoeda(relatorio.geral.saldoConta)] 
      ];
      autoTable(doc, {
        startY: alturaLadoDireito,
        margin: { left: 160, right: 10 },
        body: resumoBody,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 1.5, textColor: 0, fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 50 }, 1: { halign: 'right' } },
        willDrawCell: function(data) {
          if (data.row.index === 2) {
            data.cell.styles.fillColor = [242, 242, 242]; 
            if (relatorio.geral.saldo < 0) data.cell.styles.textColor = [192, 0, 0];
          }
          if (data.row.index === 3) {
            data.cell.styles.fillColor = [226, 239, 218]; 
            if (relatorio.geral.saldoConta < 0) data.cell.styles.textColor = [192, 0, 0];
            else data.cell.styles.textColor = [0, 100, 0]; 
          }
          if (data.row.index === 1 && data.column.index === 1) data.cell.styles.textColor = [192, 0, 0];
        }
      });
      alturaLadoDireito = (doc as any).lastAutoTable.finalY + 4;

      if (relatorio.geral.entradasExtras.length > 0) {
        const extrasBody = relatorio.geral.entradasExtras.map((e: any) => [
          formatarDataExcel(e.data_pagamento),
          formatarMoeda(e.valor),
          e.descricao || e.categoria
        ]);
        autoTable(doc, {
          startY: alturaLadoDireito,
          margin: { left: 160, right: 10 },
          head: [['Data', 'Valor', 'Outras Entradas / Doações']],
          body: extrasBody,
          theme: 'grid',
          headStyles: { fillColor: [226, 239, 218], textColor: 0 },
          styles: { fontSize: 7.5, cellPadding: 1, textColor: 0 },
          columnStyles: { 0: { cellWidth: 15, halign: 'center' }, 1: { cellWidth: 18, halign: 'center' } }
        });
        alturaLadoDireito = (doc as any).lastAutoTable.finalY + 4;
      }

      const gastosBody = relatorio.geral.saidas.map((s: any) => [
        formatarDataExcel(s.data_pagamento),
        formatarMoeda(s.valor),
        s.descricao || s.categoria
      ]);
      if (gastosBody.length === 0) gastosBody.push(['-', '-', 'Sem gastos registrados']);
      gastosBody.push(['', formatarMoeda(relatorio.geral.totalSaidas), 'TOTAL GASTOS']);

      autoTable(doc, {
        startY: alturaLadoDireito,
        margin: { left: 160, right: 10 },
        head: [['Data', 'Valor', 'Relação de Gastos / Despesas']],
        body: gastosBody,
        theme: 'grid',
        headStyles: { fillColor: [248, 215, 218], textColor: [114, 28, 36] },
        styles: { fontSize: 7.5, cellPadding: 1, textColor: 0 },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center' },
          1: { cellWidth: 20, halign: 'right', textColor: [192, 0, 0], fontStyle: 'bold' },
          2: { textColor: [192, 0, 0] }
        },
        willDrawCell: function(data) {
          if (data.row.index === gastosBody.length - 1) {
            data.cell.styles.fillColor = [242, 242, 242];
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.textColor = [0, 0, 0];
          }
        }
      });
      alturaLadoDireito = (doc as any).lastAutoTable.finalY + 4;

      relatorio.festas.forEach((f: any) => {
        const festaBody = [
          ['Arrecadado Total', formatarMoeda(f.totalEntradas)],
          ['Gasto Total', `- ${formatarMoeda(f.totalSaidas)}`],
          [{ content: `(+) AJUDARAM: ${f.pagantesLista}`, colSpan: 2 }],
          [{ content: `(-) PENDENTES: ${f.pendentesLista}`, colSpan: 2 }]
        ];

        autoTable(doc, {
          startY: alturaLadoDireito,
          margin: { left: 160, right: 10 },
          head: [[`FESTA: ${f.nome}`, `Saldo: ${formatarMoeda(f.saldo)}`]],
          body: festaBody,
          theme: 'grid',
          headStyles: { fillColor: [255, 242, 204], textColor: 0 },
          styles: { fontSize: 8, cellPadding: 1.5, textColor: 0, fontStyle: 'bold' },
          columnStyles: { 0: { cellWidth: 50 }, 1: { halign: 'right' } },
          willDrawCell: function(data) {
            if (data.row.index === 1 && data.column.index === 1) data.cell.styles.textColor = [192, 0, 0];
            if (data.row.index === 2) {
              data.cell.styles.fontSize = 6;
              data.cell.styles.fontStyle = 'normal';
              data.cell.styles.textColor = [0, 100, 0]; 
            }
            if (data.row.index === 3) {
              data.cell.styles.fontSize = 6; 
              data.cell.styles.fontStyle = 'normal';
              data.cell.styles.textColor = [192, 0, 0];
            }
          }
        });
        alturaLadoDireito = (doc as any).lastAutoTable.finalY + 4;
      });

      doc.save(`Balancete_TTZ_${relatorio.mes.replace("/", "-")}.pdf`);
    } catch (error) {
      alert("Houve um erro ao gerar o PDF.");
    } finally {
      setGerandoPdf(false);
    }
  }

  return (
    <div style={{ width: "100%", paddingBottom: "30px" }}>
      
      <div className="table-container" style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '250px' }}>
            <CalendarDays size={20} color="var(--primary)" />
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Mês de Referência</label>
              <select value={mesSelecionado} onChange={(e) => setMesSelecionado(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-dark)' }}>
                <option value="">Selecione...</option>
                {mesesDisponiveis.map(m => <option key={m.valor} value={m.valor}>{m.label}</option>)}
              </select>
            </div>
          </div>
          <button className="btn-primary" onClick={gerarRelatorio} disabled={carregando || !mesSelecionado} style={{ padding: '10px 20px', fontSize: '0.9rem' }}>
            {carregando ? "Calculando..." : "Buscar Dados"}
          </button>
        </div>
      </div>

      {relatorio && (
        <div style={{ background: "var(--bg-card)", padding: "25px", borderRadius: "8px", border: "1px solid var(--border)" }}> 
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", borderBottom: "1px solid var(--border)", paddingBottom: "15px", flexWrap: "wrap", gap: "10px" }}>
            <h2 style={{ fontSize: "1.2rem", color: "var(--text-dark)", margin: 0 }}>
              PLANILHA DO MÊS PRONTA!
            </h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={copiarParaWhatsApp} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#25D366', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold' }}>
                {copiado ? <CheckCircle2 size={18}/> : <Copy size={18}/>} Copiar (Zap)
              </button>
              <button onClick={baixarPDF} disabled={gerandoPdf} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#e11d48', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold' }}>
                <Download size={18}/> {gerandoPdf ? "Montando..." : "Baixar PDF Oficial"}
              </button>
            </div>
          </div>
            <div style={{ color: "var(--text-muted)", fontSize: "0.95rem", lineHeight: "1.6" }}>
            <p>O relatório mensal contendo todas as entradas, gastos e o balanço total da casa foi gerado com sucesso!</p>
            <p>Clique no <strong>botão verde</strong> acima para copiar um resumo rápido para o WhatsApp, ou baixe o <strong>PDF oficial</strong> com a planilha completa.</p>
            </div>
        </div>
      )}
    </div>
  );
}