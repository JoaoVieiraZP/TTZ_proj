import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')!
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

serve(async (req) => {
  try {
    // =========================================================
    // 1. CONFIGURAÇÃO DE DATAS
    // =========================================================
    const dataAtual = new Date();
    dataAtual.setMonth(dataAtual.getMonth() - 1);
    const mes = String(dataAtual.getMonth() + 1).padStart(2, '0');
    const ano = dataAtual.getFullYear();
    const mesReferencia = `${mes}/${ano}`;

    const mesesNomes = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const nomeMesExtenso = `${mesesNomes[dataAtual.getMonth()]} de ${ano}`;

    const formatarMoeda = (valor: number) => valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const formatarData = (dataStr: string) => {
      if(!dataStr) return '-';
      const [, m, d] = dataStr.split("T")[0].split("-");
      const mesesAbrev = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
      return `${parseInt(d)}/${mesesAbrev[parseInt(m) - 1]}`;
    }

    // =========================================================
    // 2. BUSCA DE DADOS NO SUPABASE
    // =========================================================
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const { data: listaEmails } = await supabase.from('destinatarios_relatorio').select('email, nome').eq('ativo', true);
    if (!listaEmails || listaEmails.length === 0) {
      return new Response(JSON.stringify({ erro: "Nenhum destinatário ativo." }), { status: 400 });
    }
    const destinatariosBrevo = listaEmails.map(item => ({ email: item.email, name: item.nome }));

    const { data: financeiro } = await supabase.from('financeiro').select('*').eq('mes_referencia', mesReferencia);
    const { data: todosFilhos } = await supabase.from('filhos').select('*').order('nome');
    const { data: todasFestas } = await supabase.from('festas').select('id, nome');
    const { data: finConta } = await supabase.from('financeiro').select('valor, tipo');

    const movs = financeiro || [];
    const listaFestas = todasFestas || [];

    // =========================================================
    // CORREÇÃO DO "VIAJANTE DO TEMPO" PARA O E-MAIL
    // =========================================================
    const [mRefStr, aRefStr] = mesReferencia.split('/');
    const filtroNum = parseInt(aRefStr) * 100 + parseInt(mRefStr);

    const membrosValidos = (todosFilhos || []).filter(f => {
      if (f.data_entrada) {
        const dataLimpa = f.data_entrada.split('T')[0];
        const [anoE, mesE] = dataLimpa.split('-');
        const entradaNum = parseInt(anoE) * 100 + parseInt(mesE);
        if (entradaNum > filtroNum) return false;
      }

      if (f.ativo === false) {
        if (!f.data_saida) return false;
        const dataLimpaS = f.data_saida.split('T')[0];
        const [anoS, mesS] = dataLimpaS.split('-');
        const saidaNum = parseInt(anoS) * 100 + parseInt(mesS);
        if (saidaNum < filtroNum) return false;
      }

      return true;
    });

    // =========================================================
    // 3. PROCESSAMENTO DE CÁLCULOS E HTML RESPONSIVO
    // =========================================================
    const saldoTotalConta = (finConta || []).reduce((acc, m) => m.tipo === 'ENTRADA' ? acc + m.valor : acc - m.valor, 0);

    const movGeral = movs.filter(m => !m.festa_id);
    const movFestas = movs.filter(m => m.festa_id);

    const entradasGerais = movGeral.filter(m => m.tipo === 'ENTRADA');
    const saidasGerais = movGeral.filter(m => m.tipo === 'SAIDA').sort((a, b) => new Date(a.data_pagamento).getTime() - new Date(b.data_pagamento).getTime());

    const totalEntradas = entradasGerais.reduce((acc, m) => acc + m.valor, 0);
    const totalSaidas = saidasGerais.reduce((acc, m) => acc + m.valor, 0);
    const saldoMes = totalEntradas - totalSaidas;

    const pagamentosMensalidade = entradasGerais.filter(m => m.categoria === 'MENSALIDADE' && m.filho_id);
    const entradasExtras = entradasGerais.filter(m => m.categoria !== 'MENSALIDADE' || !m.filho_id);

    let pagantes = 0; let pendentes = 0; let isentos = 0;
    
    const linhasCorrente = membrosValidos.map(m => {
      const pgto = pagamentosMensalidade.find(p => p.filho_id === m.id);
      if (m.isento) isentos++;
      else if (pgto) pagantes++;
      else pendentes++;

      const isPago = !!pgto;
      const valor = pgto ? pgto.valor : 0;
      const dataPg = pgto ? formatarData(pgto.data_pagamento) : '-';
      const statusCor = m.isento ? '#8b5cf6' : (isPago ? '#10b981' : '#ef4444');
      
      const statusTxt = m.isento ? 'Isento' : (isPago ? `Pago<br><span style="color:#64748b; font-size:10px; font-weight:normal;">${dataPg}</span>` : 'Pend.');
      const vencTxt = (!isPago && !m.isento) ? `<br><span style="color: #94a3b8; font-size: 10px;">(dia ${m.dia_vencimento || 10})</span>` : '';

      return `
        <tr>
          <td style="padding: 10px 5px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 13px; line-height: 1.2;">${m.nome} ${vencTxt}</td>
          <td style="padding: 10px 5px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: bold; color: ${statusCor}; font-size: 13px;">${statusTxt}</td>
          <td style="padding: 10px 5px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: #0f172a; font-size: 13px; white-space: nowrap;">${valor > 0 ? 'R$ ' + formatarMoeda(valor) : '-'}</td>
        </tr>
      `;
    }).join('');

    const totalMensalidades = pagamentosMensalidade.reduce((acc, m) => acc + m.valor, 0);

    const linhasGastos = saidasGerais.map(s => `
      <tr>
        <td style="padding: 10px 5px; border-bottom: 1px solid #fecdd3; color: #881337; font-size: 11px;">${formatarData(s.data_pagamento)}</td>
        <td style="padding: 10px 5px; border-bottom: 1px solid #fecdd3; color: #881337; font-size: 13px; line-height: 1.2;">${s.descricao || s.categoria}</td>
        <td style="padding: 10px 5px; border-bottom: 1px solid #fecdd3; text-align: right; font-weight: bold; color: #e11d48; font-size: 13px; white-space: nowrap;">- R$ ${formatarMoeda(s.valor)}</td>
      </tr>
    `).join('');

    const linhasExtras = entradasExtras.map(e => `
      <tr>
        <td style="padding: 10px 5px; border-bottom: 1px solid #bbf7d0; color: #065f46; font-size: 11px;">${formatarData(e.data_pagamento)}</td>
        <td style="padding: 10px 5px; border-bottom: 1px solid #bbf7d0; color: #065f46; font-size: 13px; line-height: 1.2;">${e.descricao || e.categoria}</td>
        <td style="padding: 10px 5px; border-bottom: 1px solid #bbf7d0; text-align: right; font-weight: bold; color: #059669; font-size: 13px; white-space: nowrap;">+ R$ ${formatarMoeda(e.valor)}</td>
      </tr>
    `).join('');

    const festasIdsNoMes = [...new Set(movFestas.map(m => m.festa_id))];
    const blocosFestas = festasIdsNoMes.map(festaId => {
        const nomeFesta = listaFestas.find(f => f.id === festaId)?.nome || "Festa Desconhecida";
        const movsDestaFesta = movFestas.filter(m => m.festa_id === festaId);
        const entFesta = movsDestaFesta.filter(m => m.tipo === "ENTRADA");
        const saiFesta = movsDestaFesta.filter(m => m.tipo === "SAIDA");

        const totalEntFesta = entFesta.reduce((acc, m) => acc + m.valor, 0);
        const totalSaiFesta = saiFesta.reduce((acc, m) => acc + m.valor, 0);
        const saldoFesta = totalEntFesta - totalSaiFesta;

        const idsPagantesFesta = entFesta.filter(m => m.filho_id).map(m => m.filho_id);
        const abreviarNome = (nomeCompleto: string) => {
          if (!nomeCompleto) return "";
          const partes = nomeCompleto.split(" ");
          return partes.length === 1 ? partes[0] : `${partes[0]} ${partes[partes.length - 1]}`;
        };
        const pagantesNomes = membrosValidos.filter(f => idsPagantesFesta.includes(f.id)).map(f => abreviarNome(f.nome)).join(", ");
        const pendentesNomes = membrosValidos.filter(f => !f.isento && !idsPagantesFesta.includes(f.id)).map(f => abreviarNome(f.nome)).join(", ");

        return `
        <div style="margin-top: 15px; border: 1px solid #fde047; border-radius: 6px; overflow: hidden;">
          <div style="background-color: #fef08a; padding: 10px; border-bottom: 1px solid #fde047;">
            <h4 style="margin: 0; color: #854d0e; font-size: 14px;">🎉 ${nomeFesta}</h4>
          </div>
          <div style="padding: 10px; background-color: #fefce8; font-size: 13px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 8px;">
              <tr>
                <td style="padding: 3px 0; color: #713f12;">Arrecadado:</td>
                <td style="padding: 3px 0; text-align: right; font-weight: bold; color: #166534;">R$ ${formatarMoeda(totalEntFesta)}</td>
              </tr>
              <tr>
                <td style="padding: 3px 0; color: #713f12;">Gasto:</td>
                <td style="padding: 3px 0; text-align: right; font-weight: bold; color: #991b1b;">- R$ ${formatarMoeda(totalSaiFesta)}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; font-weight: bold; color: #713f12; border-top: 1px solid #fde047;">Saldo:</td>
                <td style="padding: 5px 0; text-align: right; font-weight: bold; font-size: 14px; color: ${saldoFesta >= 0 ? '#166534' : '#991b1b'}; border-top: 1px solid #fde047;">R$ ${formatarMoeda(saldoFesta)}</td>
              </tr>
            </table>
            <div style="margin-top: 8px; color: #166534; font-size: 11px; line-height: 1.4;"><strong>(+) AJUDARAM:</strong> ${pagantesNomes || "Nenhum"}</div>
            <div style="margin-top: 4px; color: #991b1b; font-size: 11px; line-height: 1.4;"><strong>(-) PENDENTES:</strong> ${pendentesNomes || "Nenhum"}</div>
          </div>
        </div>
        `;
    }).join('');

    const htmlEmail = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="background-color: #f1f5f9; padding: 0; margin: 0; font-family: Arial, sans-serif;">
      
      <table width="100%" bgcolor="#f1f5f9" cellpadding="10" cellspacing="0" border="0">
        <tr>
          <td align="center">
            
            <table width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;" cellpadding="0" cellspacing="0" border="0">
              
              <tr>
                <td bgcolor="#1e293b" align="center" style="padding: 20px 15px;">
                  <h1 style="margin: 0; color: #ef4444; font-size: 22px;">TTZ GESTÃO</h1>
                  <p style="margin: 5px 0 0 0; color: #cbd5e1; font-size: 12px; text-transform: uppercase;">Fechamento • ${nomeMesExtenso}</p>
                </td>
              </tr>

              <tr>
                <td style="padding: 20px 15px;">
                  
                  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 20px;">
                    <h3 style="margin: 0 0 10px 0; color: #0f172a; font-size: 15px; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px;">📊 Resumo do Mês (${mesReferencia})</h3>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 13px;">
                      <tr>
                        <td style="padding: 5px 0; color: #475569;">Arrecadado</td>
                        <td align="right" style="padding: 5px 0; color: #10b981; font-weight: bold;">R$ ${formatarMoeda(totalEntradas)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0; color: #475569;">Gastos</td>
                        <td align="right" style="padding: 5px 0; color: #ef4444; font-weight: bold;">- R$ ${formatarMoeda(totalSaidas)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #0f172a; font-weight: bold; font-size: 14px; border-top: 1px solid #e2e8f0;">Saldo Mês</td>
                        <td align="right" style="padding: 8px 0; color: ${saldoMes >= 0 ? '#10b981' : '#ef4444'}; font-weight: bold; font-size: 14px; border-top: 1px solid #e2e8f0;">R$ ${formatarMoeda(saldoMes)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 5px; color: #0f172a; font-weight: bold; font-size: 13px; background: #e2e8f0; border-radius: 4px 0 0 4px;">SALDO CONTA</td>
                        <td align="right" style="padding: 8px 5px; color: #0f172a; font-weight: bold; font-size: 13px; background: #e2e8f0; border-radius: 0 4px 4px 0;">R$ ${formatarMoeda(saldoTotalConta)}</td>
                      </tr>
                    </table>
                  </div>

                  <h3 style="margin: 0 0 8px 0; color: #0f172a; font-size: 15px;">👥 Corrente (${pagantes + pendentes + isentos})</h3>
                  <div style="border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 13px;">
                      <tr bgcolor="#f1f5f9">
                        <th style="padding: 8px 5px; text-align: left; border-bottom: 2px solid #cbd5e1; color: #475569; font-size: 12px;">Membro</th>
                        <th style="padding: 8px 5px; text-align: center; border-bottom: 2px solid #cbd5e1; color: #475569; font-size: 12px;">Status</th>
                        <th style="padding: 8px 5px; text-align: right; border-bottom: 2px solid #cbd5e1; color: #475569; font-size: 12px;">Valor</th>
                      </tr>
                      ${linhasCorrente}
                      <tr bgcolor="#f8fafc">
                        <td colspan="2" style="padding: 10px 5px; text-align: right; font-weight: bold; color: #0f172a; font-size: 13px;">TOTAL:</td>
                        <td style="padding: 10px 5px; text-align: right; font-weight: bold; color: #10b981; font-size: 13px; white-space: nowrap;">R$ ${formatarMoeda(totalMensalidades)}</td>
                      </tr>
                    </table>
                  </div>

                  ${entradasExtras.length > 0 ? `
                  <h3 style="margin: 0 0 8px 0; color: #065f46; font-size: 15px;">🟢 Entradas Extras</h3>
                  <div style="border: 1px solid #bbf7d0; border-radius: 6px; margin-bottom: 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f0fdf4" style="font-size: 13px;">
                      <tr>
                        <th style="padding: 8px 5px; text-align: left; border-bottom: 2px solid #86efac; color: #065f46; font-size: 12px;">Data</th>
                        <th style="padding: 8px 5px; text-align: left; border-bottom: 2px solid #86efac; color: #065f46; font-size: 12px;">Origem</th>
                        <th style="padding: 8px 5px; text-align: right; border-bottom: 2px solid #86efac; color: #065f46; font-size: 12px;">Valor</th>
                      </tr>
                      ${linhasExtras}
                    </table>
                  </div>` : ''}

                  <h3 style="margin: 0 0 8px 0; color: #9f1239; font-size: 15px;">🔴 Despesas</h3>
                  <div style="border: 1px solid #fecdd3; border-radius: 6px; margin-bottom: 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#fff1f2" style="font-size: 13px;">
                      <tr>
                        <th style="padding: 8px 5px; text-align: left; border-bottom: 2px solid #fda4af; color: #9f1239; font-size: 12px;">Data</th>
                        <th style="padding: 8px 5px; text-align: left; border-bottom: 2px solid #fda4af; color: #9f1239; font-size: 12px;">Item</th>
                        <th style="padding: 8px 5px; text-align: right; border-bottom: 2px solid #fda4af; color: #9f1239; font-size: 12px;">Valor</th>
                      </tr>
                      ${linhasGastos || `<tr><td colspan="3" style="padding: 10px; text-align: center; color: #881337;">Nenhuma.</td></tr>`}
                      <tr bgcolor="#ffe4e6">
                        <td colspan="2" align="right" style="padding: 10px 5px; font-weight: bold; color: #881337; font-size: 13px;">TOTAL GASTO:</td>
                        <td align="right" style="padding: 10px 5px; font-weight: bold; color: #e11d48; font-size: 13px; white-space: nowrap;">- R$ ${formatarMoeda(totalSaidas)}</td>
                      </tr>
                    </table>
                  </div>

                  ${festasIdsNoMes.length > 0 ? `
                    <h3 style="margin: 25px 0 8px 0; color: #854d0e; font-size: 15px;">🥁 Festas</h3>
                    ${blocosFestas}
                  ` : ''}

                </td>
              </tr>
              
              <tr>
                <td bgcolor="#f8fafc" align="center" style="padding: 15px; border-top: 1px solid #e2e8f0;">
                  <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.4;">
                    Terreiro de Umbanda Baiana Terezinha e Zé Pelintra<br>
                    Gerado automaticamente pelo servidor TTZ Gestão.
                  </p>
                </td>
              </tr>

            </table>

          </td>
        </tr>
      </table>
    </body>
    </html>
    `;

    // =========================================================
    // 4. ENVIO PARA O BREVO
    // =========================================================
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: 'TTZ Gestão', email: 'joaopedrovieirapereira5@gmail.com' }, 
        to: destinatariosBrevo, 
        subject: `📄 Balancete Oficial TTZ - ${nomeMesExtenso}`,
        htmlContent: htmlEmail
      })
    });

    if (res.ok) {
      return new Response(JSON.stringify({ sucesso: true, mensagem: "Enviado com sucesso pelo Brevo!" }), { headers: { "Content-Type": "application/json" } });
    } else {
      const errorData = await res.json();
      return new Response(JSON.stringify({ erro: errorData }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

  } catch (err: any) {
    return new Response(JSON.stringify({ erro: err.message }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
})