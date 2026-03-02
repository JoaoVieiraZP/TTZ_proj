import React, { useState, useEffect } from 'react'
import { supabase } from '../config/supabase'
import { Save, X, UploadCloud, User, BadgeAlert } from 'lucide-react'

// 1. Trouxemos a máscara de data para cá!
const maskData = (v: string) => {
  let r = v.replace(/\D/g, "").slice(0, 8);
  if (r.length > 4) return `${r.slice(0, 2)}/${r.slice(2, 4)}/${r.slice(4)}`;
  if (r.length > 2) return `${r.slice(0, 2)}/${r.slice(2)}`;
  return r;
};

// Função para formatar a data que vem do banco (AAAA-MM-DD) para a tela (DD/MM/AAAA)
const formatForInput = (dateStr: string) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
};

export function CadastroFilho({ filhoEditando, onSucesso, onCancelar }: any) {
  const [nome, setNome] = useState('')
  const [dataNascimento, setDataNascimento] = useState('')
  const [dataEntrada, setDataEntrada] = useState('')
  const [cargo, setCargo] = useState('Médium')
  const [isento, setIsento] = useState(false)
  const [diaVencimento, setDiaVencimento] = useState(10)
  const [fotoUrl, setFotoUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  const cargosDisponiveis = [
    "Médium",
    "Mãe de Santo",
    "Pai Pequeno",
    "Capitão / Capitã",
    "Curimbeiro(a)",
    "Cambone",
  ];

  const cargosIsentos = [
    "Mãe de Santo",
    "Pai Pequeno",
    "Curimbeiro(a)",
    "Capitão / Capitã",
  ];

  useEffect(() => {
    if (filhoEditando) {
      setNome(filhoEditando.nome)
      setDataNascimento(formatForInput(filhoEditando.data_nascimento))
      setDataEntrada(formatForInput(filhoEditando.data_entrada))
      setCargo(filhoEditando.cargo || 'Médium')
      setIsento(filhoEditando.isento || false)
      setDiaVencimento(filhoEditando.dia_vencimento || 10)
      setFotoUrl(filhoEditando.foto_url || '')
    }
  }, [filhoEditando])

  const handleMudancaCargo = (novoCargo: string) => {
    setCargo(novoCargo);
    if (cargosIsentos.includes(novoCargo)) {
      setIsento(true);
    } else {
      setIsento(false);
    }
  };

  async function handleUploadFoto(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      setUploading(true)
      if (!e.target.files || e.target.files.length === 0) return
      
      const file = e.target.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `membro-${Date.now()}-${Math.random()}.${fileExt}`
      const filePath = `membros/${fileName}`

      const { error: uploadError } = await supabase.storage.from('fotos').upload(filePath, file)
      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('fotos').getPublicUrl(filePath)
      setFotoUrl(data.publicUrl)
    } catch (error: any) {
      alert(`Erro ao subir a foto: ${error.message}`)
    } finally {
      setUploading(false)
    }
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    
    // Blindagem de data igual fizemos no caixa!
    if (dataNascimento.length !== 10 || dataEntrada.length !== 10) {
      alert("Por favor, preencha as datas completamente no formato DD/MM/AAAA.");
      return;
    }

    setLoading(true)
    
    // Traduz do visual BR (DD/MM/AAAA) de volta pro Banco de Dados entender (AAAA-MM-DD)
    const [dN, mN, yN] = dataNascimento.split('/')
    const [dE, mE, yE] = dataEntrada.split('/')

    const dados = { 
      nome, 
      data_nascimento: `${yN}-${mN}-${dN}`, 
      data_entrada: `${yE}-${mE}-${dE}`,
      cargo,
      isento,
      dia_vencimento: Number(diaVencimento),
      foto_url: fotoUrl, 
      ativo: true 
    }

    if (filhoEditando) {
      await supabase.from('filhos').update(dados).eq('id', filhoEditando.id)
    } else {
      await supabase.from('filhos').insert([dados])
    }
    
    setLoading(false)
    onSucesso()
  }

  return (
    <form onSubmit={salvar} style={{ padding: '10px' }}>
      
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '25px', gap: '10px' }}>
        {fotoUrl ? (
          <img src={fotoUrl} alt="Foto do Membro" style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--primary)' }} />
        ) : (
          <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'var(--bg-sub)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--border)' }}>
            <User size={40} color="var(--text-muted)" />
          </div>
        )}
        
        <div>
          <input type="file" id="foto-membro" accept="image/*" onChange={handleUploadFoto} style={{ display: 'none' }} disabled={uploading} />
          <label htmlFor="foto-membro" className="btn-primary" style={{ background: 'var(--bg-sub)', color: 'var(--text-dark)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', fontSize: '0.8rem' }}>
            <UploadCloud size={16} /> {uploading ? 'Enviando...' : 'Escolher Foto'}
          </label>
        </div>
      </div>

      <div className="form-group">
        <label>Nome Completo do Membro</label>
        <input type="text" required value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: João Pedro Vieira" />
      </div>

      {/* NOVO: CAMPO DE CARGO */}
      <div className="form-group">
        <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <BadgeAlert size={16} color="var(--primary)" /> Função / Cargo na Casa
        </label>
        <select 
          value={cargo} 
          onChange={e => handleMudancaCargo(e.target.value)}
          style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', padding: '10px', borderRadius: '8px', color: 'var(--text-dark)', width: '100%', fontWeight: 'bold' }}
        >
          {cargosDisponiveis.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      
      <div className="form-row">
        <div className="form-group">
          <label>Data de Nascimento</label>
          <input 
            type="text" 
            required 
            value={dataNascimento} 
            onChange={e => setDataNascimento(maskData(e.target.value))} 
            placeholder="DD/MM/AAAA"
            maxLength={10}
          />
        </div>
        <div className="form-group">
          <label>Data de Entrada na Casa</label>
          <input 
            type="text" 
            required 
            value={dataEntrada} 
            onChange={e => setDataEntrada(maskData(e.target.value))} 
            placeholder="DD/MM/AAAA"
            maxLength={10}
          />
        </div>
      </div>

      <div className="form-row" style={{ alignItems: 'center', marginTop: '10px' }}>
        <div className="form-group" style={{ flex: 1 }}>
          <label>Dia de Vencimento</label>
          <input type="number" min="1" max="31" required value={diaVencimento} onChange={e => setDiaVencimento(Number(e.target.value))} placeholder="Ex: 10" disabled={isento} style={{ opacity: isento ? 0.5 : 1 }} />
        </div>
        
        <div className="form-group" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', background: isento ? 'rgba(139, 92, 246, 0.1)' : 'var(--bg-sub)', padding: '12px', borderRadius: '8px', border: isento ? '1px solid #8b5cf6' : '1px solid var(--border)', margin: 0, transition: 'all 0.3s' }}>
          <input type="checkbox" id="isento" checked={isento} onChange={e => setIsento(e.target.checked)} style={{ width: '22px', height: '22px', cursor: 'pointer', accentColor: '#8b5cf6' }} />
          <label htmlFor="isento" style={{ margin: 0, cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700, color: isento ? '#8b5cf6' : 'var(--text-dark)' }}>
            Isento de Mensalidade
          </label>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
        <button type="button" onClick={onCancelar} className="btn-primary" style={{ background: 'var(--text-muted)' }}>
          <X size={20}/> Cancelar
        </button>
        <button type="submit" disabled={loading || uploading} className="btn-primary">
          <Save size={20}/> {loading ? 'Salvando...' : 'Salvar Ficha'}
        </button>
      </div>
    </form>
  )
}