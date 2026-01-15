# 📊 Dashboard de Testes - SFAut

Este diretório contém os arquivos estáticos do dashboard de testes que são publicados em um repositório GitHub público.

## 📁 Arquivos

- `index.html` - Dashboard principal com visualização de resultados
- `history.json` - Histórico acumulado de execuções de testes
- `.nojekyll` - Desabilita processamento Jekyll no GitHub Pages

## 🚀 Como Funciona

1. Os testes são executados e geram `relatorios/test-results.json`
2. O script `scripts/update-dashboard.js` processa os resultados
3. O histórico é atualizado em `public/history.json`
4. O workflow GitHub Actions faz deploy para o repositório público
5. O dashboard fica disponível via GitHub Pages

## 📝 Notas

- Este diretório é gerado automaticamente pelo script `update-dashboard.js`
- Os arquivos aqui são commitados e enviados para o repositório público
- Não edite manualmente os arquivos JSON - eles são gerados automaticamente

---

**Última atualização:** Gerado automaticamente pelo sistema
