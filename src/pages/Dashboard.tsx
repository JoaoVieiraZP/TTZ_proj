import { useEffect, useState } from 'react';
import { obterResumoPorCategoria } from '../services/DashboardService.js';
import '../styles/Dashboard.css';

const Dashboard = () => {
  const [resumo, setResumo] = useState<any>(null);

  useEffect(() => {
    async function carregarDados() {
      const dados = await obterResumoPorCategoria('03/2026', 'MENSALIDADE');
      setResumo(dados);
    }
    carregarDados();
  }, []);

  if (!resumo) return <div>Carregando dashboard...</div>;

  return (
    <div className="dashboard-container">
      <h1>Dashboard do Terreiro</h1>
      
      <div className="stats-grid">
        <div className="card">
          <h3>Total Bruto</h3>
          <span className="value">R$ {resumo.totalBruto.toFixed(2)}</span>
        </div>

        <div className="card" style={{ borderColor: '#e74c3c' }}>
          <h3>Gastos</h3>
          <span className="value">R$ {resumo.gastos.toFixed(2)}</span>
        </div>

        <div className="card" style={{ borderColor: '#3498db' }}>
          <h3>Lucro Líquido</h3>
          <span className="value">R$ {resumo.lucro.toFixed(2)}</span>
        </div>

        <div className="card" style={{ borderColor: '#f1c40f' }}>
          <h3>Margem</h3>
          <span className="value">{resumo.porcentagemLucro}</span>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;