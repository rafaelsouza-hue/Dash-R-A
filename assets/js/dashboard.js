/**
 * Dashboard principal - Orquestração
 */

class Dashboard {
    constructor() {
        this.currentFilters = {};
        this.currentSort = 'timestamp-desc';
        this.currentSearch = '';
    }

    /**
     * Inicializa o dashboard
     */
    async init() {
        console.log('🚀 Inicializando dashboard...');

        try {
            // Carregar dados
            await this.loadData();

            // Configurar eventos
            this.setupEventListeners();

            // Renderizar dashboard
            this.render();
            
            console.log('✅ Dashboard inicializado com sucesso');
            console.log('📊 Dados disponíveis:', {
                hasHistory: !!this.historyData,
                hasEvolution: !!this.evolutionData,
                historyExecutions: this.historyData?.executions?.length || 0,
                evolutionTests: this.evolutionData?.tests?.length || 0
            });
        } catch (error) {
            console.error('❌ Erro na inicialização:', error);
            throw error;
        }
    }

    /**
     * Carrega todos os dados
     */
    async loadData() {
        try {
            // Verificar se está usando file:// (pode causar problemas de CORS)
            if (window.location.protocol === 'file:') {
                console.warn('⚠️ Dashboard aberto via file:// - pode haver problemas de CORS');
                console.warn('💡 Use: npm run dashboard:serve para servir via HTTP local');
                this.showCorsWarning();
            }

            // Carregar histórico
            const historyData = await window.dataLoader.loadHistory();
            console.log('✅ Histórico carregado:', historyData.executions.length, 'execuções');

            // Carregar evolução
            const evolutionData = await window.dataLoader.loadEvolution();
            console.log('✅ Evolução carregada:', evolutionData.tests.length, 'testes');
            console.log('📊 Dados de automação:', {
                byAutomation: evolutionData.byAutomation,
                byFunctionality: Object.keys(evolutionData.byFunctionality || {}).length + ' funcionalidades',
                metadata: evolutionData.metadata
            });

            // Armazenar dados
            this.historyData = historyData;
            this.evolutionData = evolutionData;
        } catch (error) {
            console.error('❌ Erro ao carregar dados:', error);
            this.showError('Erro ao carregar dados. Verifique se os arquivos data/history.json e data/test-evolution.json existem.');
            
            // Se for erro de CORS, mostrar mensagem específica
            if (error.message && error.message.includes('fetch')) {
                this.showCorsWarning();
            }
        }
    }

    /**
     * Configura event listeners
     */
    setupEventListeners() {
        // Botão de atualizar
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadData().then(() => this.render());
            });
        }

        // Botão de exportar
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportData());
        }

        // Botão de limpeza
        const cleanupBtn = document.getElementById('cleanupBtn');
        if (cleanupBtn) {
            cleanupBtn.addEventListener('click', () => this.showCleanupModal());
        }

        // Botões do modal de limpeza
        const cleanupPreviewBtn = document.getElementById('cleanup-preview-btn');
        if (cleanupPreviewBtn) {
            cleanupPreviewBtn.addEventListener('click', () => this.previewCleanup());
        }

        const cleanupExecuteBtn = document.getElementById('cleanup-execute-btn');
        if (cleanupExecuteBtn) {
            cleanupExecuteBtn.addEventListener('click', () => this.executeCleanup());
        }

        // Atualizar preview quando campos mudarem
        const cleanupInputs = ['cleanup-start-date', 'cleanup-start-time', 'cleanup-end-date', 'cleanup-end-time'];
        cleanupInputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('change', () => {
                    if (document.getElementById('cleanup-preview').style.display !== 'none') {
                        this.previewCleanup();
                    }
                });
            }
        });

        // Filtros
        const applyFiltersBtn = document.getElementById('applyFiltersBtn');
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => this.applyFilters());
        }

        const clearFiltersBtn = document.getElementById('clearFiltersBtn');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => this.clearFilters());
        }

        // Busca na tabela
        const tableSearch = document.getElementById('table-search');
        if (tableSearch) {
            tableSearch.addEventListener('input', (e) => {
                this.currentSearch = e.target.value;
                this.renderTable();
            });
        }

        // Ordenação da tabela
        const tableSort = document.getElementById('table-sort');
        if (tableSort) {
            tableSort.addEventListener('change', (e) => {
                this.currentSort = e.target.value;
                this.renderTable();
            });
        }

        // Modal
        const modal = document.getElementById('detailsModal');
        const modalClose = document.querySelector('.modal-close');
        if (modalClose) {
            modalClose.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }

        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });

        // Fechar modal de limpeza ao clicar fora
        const cleanupModal = document.getElementById('cleanupModal');
        if (cleanupModal) {
            window.addEventListener('click', (e) => {
                if (e.target === cleanupModal) {
                    this.closeCleanupModal();
                }
            });
        }
    }

    /**
     * Renderiza todo o dashboard
     */
    render() {
        // Aplicar filtros (pode ser vazio se não houver histórico)
        let filteredExecutions = [];
        if (this.historyData) {
            filteredExecutions = window.dataLoader.filterExecutions(this.currentFilters);
            
            // Aplicar busca
            if (this.currentSearch) {
                filteredExecutions = window.dataLoader.searchExecutions(this.currentSearch);
            }

            // Ordenar
            filteredExecutions = window.dataLoader.sortExecutions(filteredExecutions, this.currentSort);
        }

        // Renderizar métricas
        this.renderMetrics(filteredExecutions);

        // Renderizar gráficos (sempre, mesmo sem histórico, se houver dados de evolução)
        window.chartsManager.updateAll(filteredExecutions, this.evolutionData);

        // Renderizar tabela (só se houver histórico)
        if (this.historyData) {
            this.renderTable(filteredExecutions);
            // Popular filtros
            this.populateFilters();
        }
    }

    /**
     * Renderiza métricas principais
     */
    renderMetrics(executions) {
        const metrics = window.dataLoader.calculateAggregatedMetrics(executions || []);
        
        // Contar tipos de teste
        const apiTests = (executions || []).filter(e => e.testType === 'api').length;
        const uiTests = (executions || []).filter(e => e.testType === 'ui').length;

        // Renderizar métricas básicas
        const totalExecutionsEl = document.getElementById('metric-total-executions');
        if (totalExecutionsEl) totalExecutionsEl.textContent = metrics.totalExecutions;
        
        const totalRegressionsEl = document.getElementById('metric-total-regressions');
        if (totalRegressionsEl) totalRegressionsEl.textContent = metrics.totalRegressions;
        
        const totalLocalEl = document.getElementById('metric-total-local');
        if (totalLocalEl) totalLocalEl.textContent = metrics.totalLocal;
        
        const successRateEl = document.getElementById('metric-success-rate');
        if (successRateEl) successRateEl.textContent = metrics.avgSuccessRate.toFixed(2) + '%';
        
        const adjustedRateEl = document.getElementById('metric-adjusted-rate');
        if (adjustedRateEl) adjustedRateEl.textContent = metrics.avgAdjustedRate.toFixed(2) + '%';
        
        const timeGainedEl = document.getElementById('metric-time-gained');
        if (timeGainedEl) timeGainedEl.textContent = window.dataLoader.formatDuration(metrics.totalTimeGained);
        
        // Adicionar informações de tipo de teste
        const apiMetric = document.getElementById('metric-api-tests');
        if (apiMetric) apiMetric.textContent = apiTests || 0;
        
        const uiMetric = document.getElementById('metric-ui-tests');
        if (uiMetric) uiMetric.textContent = uiTests || 0;
        
        // Métricas de automação (sempre renderizar, mesmo se dados não estiverem disponíveis)
        const automatedMetric = document.getElementById('metric-automated-tests');
        const pendingMetric = document.getElementById('metric-pending-tests');
        const automationRateMetric = document.getElementById('metric-automation-rate');
        
        console.log('🔍 Verificando métricas de automação:', {
            hasEvolutionData: !!this.evolutionData,
            hasMetadata: !!(this.evolutionData && this.evolutionData.metadata),
            automatedMetricExists: !!automatedMetric,
            pendingMetricExists: !!pendingMetric,
            automationRateMetricExists: !!automationRateMetric
        });
        
        if (this.evolutionData && this.evolutionData.metadata) {
            const metadata = this.evolutionData.metadata;
            console.log('📊 Renderizando métricas de automação:', metadata);
            
            if (automatedMetric) {
                const automated = metadata.automatedTests ?? metadata.automated ?? 0;
                automatedMetric.textContent = automated;
                console.log('✅ Testes Automatizados renderizado:', automated);
            } else {
                console.error('❌ Elemento metric-automated-tests não encontrado!');
            }
            
            if (pendingMetric) {
                const pending = metadata.pendingTests ?? metadata.pending ?? 0;
                pendingMetric.textContent = pending;
                console.log('⏳ Testes Pendentes renderizado:', pending);
            } else {
                console.error('❌ Elemento metric-pending-tests não encontrado!');
            }
            
            if (automationRateMetric) {
                const total = metadata.totalTests ?? 0;
                const automated = metadata.automatedTests ?? metadata.automated ?? 0;
                const rate = total > 0 ? ((automated / total) * 100).toFixed(2) : '0.00';
                automationRateMetric.textContent = rate + '%';
                console.log('📈 Taxa de Automação renderizado:', rate + '%');
            } else {
                console.error('❌ Elemento metric-automation-rate não encontrado!');
            }
        } else {
            console.warn('⚠️ Dados de evolução não disponíveis para renderizar métricas de automação');
            console.log('evolutionData completo:', this.evolutionData);
            
            // Renderizar 0 se não houver dados
            if (automatedMetric) {
                automatedMetric.textContent = '0';
                console.log('✅ Testes Automatizados definido como 0 (fallback)');
            }
            if (pendingMetric) {
                pendingMetric.textContent = '0';
                console.log('⏳ Testes Pendentes definido como 0 (fallback)');
            }
            if (automationRateMetric) {
                automationRateMetric.textContent = '0.00%';
                console.log('📈 Taxa de Automação definido como 0.00% (fallback)');
            }
        }
    }

    /**
     * Renderiza tabela de execuções
     */
    renderTable(executions) {
        if (!executions) {
            executions = window.dataLoader.filterExecutions(this.currentFilters);
            if (this.currentSearch) {
                executions = window.dataLoader.searchExecutions(this.currentSearch);
            }
            executions = window.dataLoader.sortExecutions(executions, this.currentSort);
        }

        const tbody = document.getElementById('executions-tbody');
        if (!tbody) return;

        if (executions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="15" class="loading">Nenhuma execução encontrada</td></tr>';
            return;
        }

        tbody.innerHTML = executions.map(exec => {
            const date = new Date(exec.timestamp);
            const dateTimeStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + 
                               date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            
            // Badge para tipo de teste
            const testType = exec.testType || 'mixed';
            const testTypeLabel = testType === 'api' ? 'API' : testType === 'ui' ? 'UI' : 'Misto';
            const testTypeBadgeClass = testType === 'api' ? 'badge badge-warning' : testType === 'ui' ? 'badge badge-info' : 'badge badge-secondary';

            return `
                <tr>
                    <td style="white-space: nowrap; font-size: 0.85rem;">${dateTimeStr}</td>
                    <td style="font-size: 0.85rem;"><span class="badge badge-info">${exec.version || '-'}</span></td>
                    <td style="font-size: 0.85rem; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${exec.release || '-'}">${exec.release || '-'}</td>
                    <td style="font-size: 0.85rem;"><span class="badge ${exec.executionType === 'full' ? 'badge-full' : 'badge-local'}">${exec.executionType === 'full' ? 'Regressão' : 'Local'}</span></td>
                    <td style="font-size: 0.85rem;"><span class="${testTypeBadgeClass}">${testTypeLabel}</span></td>
                    <td style="font-size: 0.85rem;"><span class="badge badge-info">${exec.environment?.toUpperCase() || '-'}</span></td>
                    <td style="font-size: 0.85rem; text-align: center;">${exec.totalTests}</td>
                    <td style="font-size: 0.85rem; text-align: center;"><span class="badge badge-success">${exec.passed}</span></td>
                    <td style="font-size: 0.85rem; text-align: center;"><span class="badge badge-danger">${exec.failed}</span></td>
                    <td style="font-size: 0.85rem; text-align: center;">${exec.bugsReal}</td>
                    <td style="font-size: 0.85rem; text-align: center;">${exec.instability}</td>
                    <td style="font-size: 0.85rem; text-align: center;">${exec.successRate.toFixed(2)}%</td>
                    <td style="font-size: 0.85rem; text-align: center;">${exec.adjustedSuccessRate.toFixed(2)}%</td>
                    <td style="font-size: 0.85rem; white-space: nowrap;">${exec.executionTimeFormatted || window.dataLoader.formatDuration(exec.executionTime)}</td>
                    <td style="font-size: 0.85rem;">
                        <button class="btn btn-secondary" onclick="dashboard.showDetails('${exec.timestamp}')" style="padding: 4px 8px; font-size: 0.75rem;">
                            Detalhes
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Popula opções de filtros
     */
    populateFilters() {
        if (!this.historyData) return;

        // Versões
        const versionSelect = document.getElementById('filter-version');
        if (versionSelect) {
            const versions = window.dataLoader.getUniqueValues('version');
            versionSelect.innerHTML = '<option value="">Todas</option>' + 
                versions.map(v => `<option value="${v}">${v}</option>`).join('');
        }

        // Releases
        const releaseSelect = document.getElementById('filter-release');
        if (releaseSelect) {
            const releases = window.dataLoader.getUniqueValues('release');
            releaseSelect.innerHTML = '<option value="">Todas</option>' + 
                releases.map(r => `<option value="${r}">${r}</option>`).join('');
        }
    }

    /**
     * Aplica filtros
     */
    applyFilters() {
        this.currentFilters = {
            date: document.getElementById('filter-date').value || null,
            version: document.getElementById('filter-version').value || null,
            release: document.getElementById('filter-release').value || null,
            type: document.getElementById('filter-type').value || null,
            environment: document.getElementById('filter-env').value || null,
            testType: document.getElementById('filter-test-type').value || null
        };

        this.render();
    }

    /**
     * Limpa filtros
     */
    clearFilters() {
        document.getElementById('filter-date').value = '';
        document.getElementById('filter-version').value = '';
        document.getElementById('filter-release').value = '';
        document.getElementById('filter-type').value = '';
        document.getElementById('filter-env').value = '';
        document.getElementById('filter-test-type').value = '';
        document.getElementById('table-search').value = '';

        this.currentFilters = {};
        this.currentSearch = '';
        this.currentSort = 'timestamp-desc';
        document.getElementById('table-sort').value = 'timestamp-desc';

        this.render();
    }

    /**
     * Mostra detalhes de uma execução
     */
    showDetails(timestamp) {
        if (!this.historyData) return;

        const exec = this.historyData.executions.find(e => e.timestamp === timestamp);
        if (!exec) return;

        const modal = document.getElementById('detailsModal');
        const modalBody = document.getElementById('modal-body');

        const date = new Date(exec.timestamp);
        const dateStr = date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR');

        let testDetailsHtml = '';
        if (exec.testDetails && exec.testDetails.length > 0) {
            testDetailsHtml = `
                <div class="detail-item">
                    <div class="detail-label">Testes com Falha:</div>
                    <div class="detail-value">
                        <ul style="margin-top: 10px; padding-left: 20px;">
                            ${exec.testDetails.map(test => `
                                <li style="margin-bottom: 10px;">
                                    <strong>${test.scenario}</strong><br>
                                    <small>Tipo: ${test.errorCategory}</small><br>
                                    <small style="color: #64748b;">${test.error || 'Sem detalhes'}</small>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                </div>
            `;
        }

        modalBody.innerHTML = `
            <div class="detail-item">
                <div class="detail-label">Data/Hora:</div>
                <div class="detail-value">${dateStr}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Versão:</div>
                <div class="detail-value">${exec.version}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Release:</div>
                <div class="detail-value">${exec.release}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Tipo de Execução:</div>
                <div class="detail-value">${exec.executionType === 'full' ? 'Regressão Completa' : 'Execução Local'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Tipo de Teste:</div>
                <div class="detail-value">${exec.testType === 'api' ? 'API' : exec.testType === 'ui' ? 'UI' : 'Misto'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Ambiente:</div>
                <div class="detail-value">${exec.environment?.toUpperCase() || '-'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Total de Testes:</div>
                <div class="detail-value">${exec.totalTests}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Resultados:</div>
                <div class="detail-value">
                    ✅ Passou: ${exec.passed}<br>
                    ❌ Falhou: ${exec.failed}<br>
                    🐛 Bugs Reais: ${exec.bugsReal}<br>
                    ⚠️ Instabilidade: ${exec.instability}
                </div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Taxas de Sucesso:</div>
                <div class="detail-value">
                    Real: ${exec.successRate.toFixed(2)}%<br>
                    Ajustada: ${exec.adjustedSuccessRate.toFixed(2)}%
                </div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Tempo:</div>
                <div class="detail-value">
                    Execução: ${exec.executionTimeFormatted || window.dataLoader.formatDuration(exec.executionTime)}<br>
                    Manual Estimado: ${window.dataLoader.formatDuration(exec.manualTimeEstimated)}<br>
                    Tempo Ganho: ${exec.timeGainedFormatted || window.dataLoader.formatDuration(exec.timeGained)}
                </div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Tags:</div>
                <div class="detail-value">${exec.tags?.join(', ') || '-'}</div>
            </div>
            ${testDetailsHtml}
        `;

        modal.style.display = 'block';
    }

    /**
     * Exporta dados
     */
    exportData() {
        if (!this.historyData) return;

        const dataStr = JSON.stringify(this.historyData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `dashboard-export-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Mostra erro
     */
    showError(message) {
        console.error(message);
        // Poderia mostrar um toast ou modal de erro aqui
    }

    /**
     * Mostra aviso de CORS
     */
    showCorsWarning() {
        const warningDiv = document.createElement('div');
        warningDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #fef3c7;
            border: 2px solid #f59e0b;
            border-radius: 8px;
            padding: 20px;
            max-width: 400px;
            z-index: 10000;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        `;
        warningDiv.innerHTML = `
            <h3 style="margin: 0 0 10px 0; color: #92400e;">⚠️ Problema de CORS</h3>
            <p style="margin: 0 0 15px 0; color: #78350f;">
                O dashboard precisa ser servido via HTTP para funcionar corretamente.
            </p>
            <p style="margin: 0 0 15px 0; color: #78350f; font-weight: bold;">
                Execute no terminal:
            </p>
            <code style="display: block; background: #fff; padding: 10px; border-radius: 4px; margin-bottom: 10px; color: #1f2937;">
                npm run dashboard:serve
            </code>
            <button onclick="this.parentElement.remove()" style="
                background: #f59e0b;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
            ">Fechar</button>
        `;
        document.body.appendChild(warningDiv);
    }

    /**
     * Mostra modal de limpeza de dados
     */
    showCleanupModal() {
        const modal = document.getElementById('cleanupModal');
        if (!modal) return;

        // Limpar campos
        document.getElementById('cleanup-start-date').value = '';
        document.getElementById('cleanup-start-time').value = '';
        document.getElementById('cleanup-end-date').value = '';
        document.getElementById('cleanup-end-time').value = '';
        document.getElementById('cleanup-confirm').checked = false;
        document.getElementById('cleanup-preview').style.display = 'none';

        modal.style.display = 'block';
    }

    /**
     * Fecha modal de limpeza
     */
    closeCleanupModal() {
        const modal = document.getElementById('cleanupModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * Pré-visualiza quais dados serão removidos
     */
    previewCleanup() {
        const startDate = document.getElementById('cleanup-start-date').value;
        const startTime = document.getElementById('cleanup-start-time').value;
        const endDate = document.getElementById('cleanup-end-date').value;
        const endTime = document.getElementById('cleanup-end-time').value;

        if (!startDate || !startTime || !endDate || !endTime) {
            alert('Por favor, preencha todos os campos de data e hora.');
            return;
        }

        const startDateTime = new Date(`${startDate}T${startTime}`);
        const endDateTime = new Date(`${endDate}T${endTime}`);

        if (startDateTime >= endDateTime) {
            alert('A data/hora inicial deve ser anterior à data/hora final.');
            return;
        }

        if (!this.historyData || !this.historyData.executions) {
            alert('Nenhum dado disponível para pré-visualização.');
            return;
        }

        // Filtrar execuções no período
        const executionsToRemove = this.historyData.executions.filter(exec => {
            const execDate = new Date(exec.timestamp);
            return execDate >= startDateTime && execDate <= endDateTime;
        });

        const previewDiv = document.getElementById('cleanup-preview');
        const previewText = document.getElementById('cleanup-preview-text');

        if (executionsToRemove.length === 0) {
            previewText.innerHTML = `
                <span style="color: var(--success-color);">✅ Nenhuma execução encontrada no período selecionado.</span>
            `;
        } else {
            const totalTests = executionsToRemove.reduce((sum, e) => sum + (e.totalTests || 0), 0);
            previewText.innerHTML = `
                <span style="color: var(--danger-color); font-weight: bold;">
                    ⚠️ ${executionsToRemove.length} execução(ões) serão removidas
                </span><br>
                <span style="color: var(--text-secondary); margin-top: 8px; display: block;">
                    Total de testes: ${totalTests}<br>
                    Período: ${startDateTime.toLocaleString('pt-BR')} até ${endDateTime.toLocaleString('pt-BR')}
                </span>
            `;
        }

        previewDiv.style.display = 'block';
    }

    /**
     * Executa a limpeza de dados
     */
    async executeCleanup() {
        const startDate = document.getElementById('cleanup-start-date').value;
        const startTime = document.getElementById('cleanup-start-time').value;
        const endDate = document.getElementById('cleanup-end-date').value;
        const endTime = document.getElementById('cleanup-end-time').value;
        const confirmed = document.getElementById('cleanup-confirm').checked;

        if (!startDate || !startTime || !endDate || !endTime) {
            alert('Por favor, preencha todos os campos de data e hora.');
            return;
        }

        if (!confirmed) {
            alert('Por favor, confirme que deseja excluir os dados marcando a checkbox.');
            return;
        }

        const startDateTime = new Date(`${startDate}T${startTime}`);
        const endDateTime = new Date(`${endDate}T${endTime}`);

        if (startDateTime >= endDateTime) {
            alert('A data/hora inicial deve ser anterior à data/hora final.');
            return;
        }

        if (!confirm(`Tem certeza que deseja remover todas as execuções entre ${startDateTime.toLocaleString('pt-BR')} e ${endDateTime.toLocaleString('pt-BR')}?\n\nEsta ação não pode ser desfeita!`)) {
            return;
        }

        try {
            // Filtrar execuções FORA do período (manter apenas essas)
            const executionsToKeep = this.historyData.executions.filter(exec => {
                const execDate = new Date(exec.timestamp);
                return execDate < startDateTime || execDate > endDateTime;
            });

            const removedCount = this.historyData.executions.length - executionsToKeep.length;

            if (removedCount === 0) {
                alert('Nenhuma execução encontrada no período selecionado.');
                return;
            }

            // Atualizar histórico
            this.historyData.executions = executionsToKeep;
            this.historyData.metadata.lastUpdate = new Date().toISOString();
            this.historyData.metadata.totalExecutions = executionsToKeep.length;
            this.historyData.metadata.totalRegressions = executionsToKeep.filter(e => e.executionType === 'full').length;
            this.historyData.metadata.totalLocalExecutions = executionsToKeep.filter(e => e.executionType === 'local').length;

            // Tentar salvar via fetch (pode não funcionar se não houver backend)
            try {
                const response = await fetch('data/history.json', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(this.historyData, null, 2)
                });

                if (!response.ok) {
                    throw new Error('Não foi possível salvar via servidor');
                }

                alert(`✅ ${removedCount} execução(ões) removida(s) com sucesso!`);
            } catch (error) {
                // Se não conseguir salvar via fetch, fazer download e instruir usuário
                this.downloadUpdatedHistory();
                
                const startStr = startDateTime.toISOString();
                const endStr = endDateTime.toISOString();
                
                alert(`✅ ${removedCount} execução(ões) removida(s)!\n\n` +
                      `Como o dashboard está sendo executado localmente, os dados atualizados foram baixados.\n\n` +
                      `Para aplicar as mudanças, execute no terminal:\n\n` +
                      `node scripts/cleanup-dashboard-history.js --start "${startStr}" --end "${endStr}"\n\n` +
                      `Ou substitua manualmente o arquivo dashboard/data/history.json pelo arquivo baixado.`);
            }

            // Fechar modal e recarregar
            this.closeCleanupModal();
            await this.loadData();
            this.render();

        } catch (error) {
            console.error('Erro ao limpar dados:', error);
            alert('Erro ao limpar dados. Verifique o console para mais detalhes.');
        }
    }

    /**
     * Faz download do histórico atualizado (fallback quando não consegue salvar via fetch)
     */
    downloadUpdatedHistory() {
        const dataStr = JSON.stringify(this.historyData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `history-cleaned-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }
}

// Inicializar quando DOM estiver pronto
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new Dashboard();
    dashboard.init();
});
