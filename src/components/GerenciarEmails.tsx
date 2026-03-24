import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { Mail, Plus, Trash2, Power, PowerOff } from 'lucide-react';

interface Destinatario {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
}

export function GerenciarEmails() {
  const [destinatarios, setDestinatarios] = useState<Destinatario[]>([]);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDestinatarios();
  }, []);

  const carregarDestinatarios = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('destinatarios_relatorio')
      .select('*')
      .order('nome');
    
    if (error) {
      alert('Erro ao carregar lista: ' + error.message);
    } else {
      setDestinatarios(data || []);
    }
    setLoading(false);
  };

  const adicionar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !email) return;

    const { error } = await supabase
      .from('destinatarios_relatorio')
      .insert([{ nome, email, ativo: true }]);

    if (error) {
      alert('Erro ao adicionar: ' + error.message);
    } else {
      setNome('');
      setEmail('');
      carregarDestinatarios();
    }
  };

  const alternarStatus = async (id: string, statusAtual: boolean) => {
    const { error } = await supabase
      .from('destinatarios_relatorio')
      .update({ ativo: !statusAtual })
      .eq('id', id);

    if (error) {
      alert('Erro ao atualizar status: ' + error.message);
    } else {
      carregarDestinatarios();
    }
  };

  const remover = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja remover este e-mail?')) return;

    const { error } = await supabase
      .from('destinatarios_relatorio')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Erro ao remover: ' + error.message);
    } else {
      carregarDestinatarios();
    }
  };

  return (
    <div style={{ background: 'var(--bg-card)', padding: '25px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '20px' }}>
      
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px", borderBottom: '1px solid var(--border)', paddingBottom: '15px' }}>
        <Mail size={24} color="var(--primary)" />
        <div>
          <h2 style={{ fontSize: "1.2rem", color: "var(--text-dark)", margin: '0 0 4px 0' }}>
            Envio Automático do Balancete
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: 0 }}>
            Gerencie quem recebe o fechamento oficial todo dia 1º por e-mail.
          </p>
        </div>
      </div>

      <form onSubmit={adicionar} style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '25px' }}>
        <input
          type="text"
          placeholder="Nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
          style={{ flex: 1, minWidth: '200px', padding: '10px 15px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-dark)' }}
        />
        <input
          type="email"
          placeholder="E-mail do recebedor"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ flex: 1, minWidth: '200px', padding: '10px 15px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-dark)' }}
        />
        <button type="submit" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
          <Plus size={18} /> Cadastrar
        </button>
      </form>

      {loading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Carregando lista...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {destinatarios.map((dest) => (
            <div key={dest.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', background: 'var(--bg-main)', padding: '15px', borderRadius: '8px', borderLeft: `4px solid ${dest.ativo ? 'var(--success)' : 'var(--danger)'}` }}>
              
              <div>
                <strong style={{ color: dest.ativo ? 'var(--text-dark)' : 'var(--text-muted)', display: 'block', fontSize: '1rem' }}>
                  {dest.nome}
                </strong>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{dest.email}</span>
                {!dest.ativo && <span style={{ marginLeft: '10px', color: 'var(--danger)', fontSize: '0.75rem', fontWeight: 'bold' }}>• PAUSADO</span>}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={() => alternarStatus(dest.id, dest.ativo)}
                  title={dest.ativo ? "Pausar envio" : "Retomar envio"}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', backgroundColor: dest.ativo ? 'var(--warning)' : 'var(--success)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                >
                  {dest.ativo ? <PowerOff size={18} /> : <Power size={18} />}
                </button>
                <button 
                  onClick={() => remover(dest.id)}
                  title="Excluir"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', backgroundColor: 'var(--danger)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                >
                  <Trash2 size={18} />
                </button>
              </div>

            </div>
          ))}
          {destinatarios.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-main)', borderRadius: '6px', border: '1px dashed var(--border)' }}>
              A lista está vazia. Cadastre o primeiro destinatário acima.
            </div>
          )}
        </div>
      )}
    </div>
  );
}