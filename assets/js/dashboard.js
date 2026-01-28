/**
 * Dashboard principal - Orquestração
 */

class Dashboard {
    constructor() {
        this.currentFilters = {};
        this.currentSort = 'timestamp-desc';
        this.currentSearch = '';
        this.lastUpdateTimestamp = null;
        this.autoRefreshInterval = null;
        this.autoRefreshEnabled = true;
        this.autoRefreshIntervalMs = 5000; // 5 segundos
        this.currentTab = 'overview';
        this.tabDataLoaded = {
            overview: false,
            execution: false,
            creation: false,
            coverage: false,
            project: false
        };
    }

    /**
     * Helper para acessar localStorage com tratamento de Tracking Prevention
     */
    safeLocalStorage(method, key, value = null) {
        try {
            if (method === 'get') {
                return localStorage.getItem(key);
            } else if (method === 'set') {
                localStorage.setItem(key, value);
                return true;
            } else if (method === 'remove') {
                localStorage.removeItem(key);
                return true;
            } else if (method === 'clear') {
                localStorage.clear();
                return true;
            }
        } catch (error) {
            // Tracking Prevention pode bloquear acesso ao localStorage
            if (error.name === 'SecurityError' || error.message.includes('Tracking Prevention')) {
                console.warn(`⚠️ Tracking Prevention bloqueou acesso ao localStorage (${method}:${key}). Continuando...`);
            } else {
                console.warn(`⚠️ Erro ao acessar localStorage (${method}:${key}):`, error);
            }
            return method === 'get' ? null : false;
        }
        return null;
    }

    /**
     * Inicializa o dashboard
     */
    async init() {
        console.log('🚀 Inicializando dashboard...');

        try {
            // Carregar dados com forceRefresh para garantir dados atualizados
            await this.loadData(true);

            // Configurar eventos
            this.setupEventListeners();
            
            // Configurar sistema de abas (isso já renderiza a aba inicial)
            this.setupTabs();
            
            // Carregar dados de todas as abas automaticamente
            console.log('📊 Carregando dados de todas as abas...');
            await this.loadAllTabsData();
            
            // Renderizar novamente para garantir que tudo está atualizado
            await this.render();
            
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
     * Carrega dados de todas as abas (para inicialização)
     */
    async loadAllTabsData() {
        const tabs = ['overview', 'execution', 'creation', 'coverage', 'project'];
        
        // Carregar todas as abas em paralelo para melhor performance
        const loadPromises = tabs.map(async (tab) => {
            try {
                await this.loadTabData(tab, true); // forceRefresh na inicialização
                console.log(`✅ Dados da aba ${tab} carregados`);
            } catch (error) {
                console.error(`❌ Erro ao carregar aba ${tab}:`, error);
            }
        });
        
        await Promise.all(loadPromises);
        console.log('✅ Todas as abas carregadas');
    }

    /**
     * Carrega todos os dados
     * @param {boolean} forceRefresh - Força atualização ignorando cache
     */
    async loadData(forceRefresh = false) {
        try {
            // Verificar se está usando file:// (pode causar problemas de CORS)
            if (window.location.protocol === 'file:') {
                console.warn('⚠️ Dashboard aberto via file:// - pode haver problemas de CORS');
                console.warn('💡 Use: npm run dashboard:serve para servir via HTTP local');
                this.showCorsWarning();
            }

            // Carregar histórico com forceRefresh
            const historyData = await window.dataLoader.loadHistory(forceRefresh);
            console.log('✅ Histórico carregado:', historyData.executions.length, 'execuções');

            // Carregar evolução com forceRefresh
            const evolutionData = await window.dataLoader.loadEvolution(forceRefresh);
            console.log('✅ Evolução carregada:', evolutionData.tests.length, 'testes');
            console.log('📊 Dados de automação:', {
                byAutomation: evolutionData.byAutomation,
                byFunctionality: Object.keys(evolutionData.byFunctionality || {}).length + ' funcionalidades',
                metadata: evolutionData.metadata
            });

            // Armazenar dados
            this.historyData = historyData;
            this.evolutionData = evolutionData;
            
            // Verificar se há atualização
            const newTimestamp = historyData?.metadata?.lastUpdate;
            if (newTimestamp && this.lastUpdateTimestamp && newTimestamp !== this.lastUpdateTimestamp) {
                console.log('🔄 Novos dados detectados! Atualizando dashboard...');
                await this.render();
            }
            
            // Atualizar timestamp
            if (newTimestamp) {
                this.lastUpdateTimestamp = newTimestamp;
            }
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
     * Limpa cache da sessão
     */
    clearCache() {
        // Limpar localStorage (exceto preferências do usuário)
        const savedTab = this.safeLocalStorage('get', 'dashboard-active-tab');
        this.safeLocalStorage('clear');
        if (savedTab) {
            this.safeLocalStorage('set', 'dashboard-active-tab', savedTab);
        }
        
        // Limpar dados em memória
        this.historyData = null;
        this.evolutionData = null;
        this.coverageData = null;
        this.brainMetrics = null;
        this.projectMetrics = null;
        
        // Limpar cache do dataLoader
        if (window.dataLoader) {
            window.dataLoader.historyData = null;
            window.dataLoader.evolutionData = null;
        }
        
        // Limpar cache do brainDataLoader
        if (window.brainDataLoader) {
            window.brainDataLoader.brainMetrics = null;
            window.brainDataLoader.projectMetrics = null;
            window.brainDataLoader.coverageReport = null;
        }
        
        console.log('✅ Cache limpo');
    }
    
    /**
     * Recarrega dados de todas as abas
     */
    async reloadAllTabs() {
        console.log('🔄 Recarregando todas as abas...');
        
        // Recarregar dados de todas as abas com forceRefresh
        const tabs = ['overview', 'execution', 'creation', 'coverage', 'project'];
        
        // Carregar todas as abas em paralelo para melhor performance
        const reloadPromises = tabs.map(async (tab) => {
            try {
                // Resetar flag de carregamento
                this.tabDataLoaded[tab] = false;
                
                // Recarregar dados da aba com forceRefresh
                await this.loadTabData(tab, true);
                
                console.log(`✅ Aba ${tab} recarregada`);
            } catch (error) {
                console.error(`❌ Erro ao recarregar aba ${tab}:`, error);
            }
        });
        
        await Promise.all(reloadPromises);
        console.log('✅ Todas as abas recarregadas');
    }

    /**
     * Configura event listeners
     */
    setupEventListeners() {
        // Botão de atualizar
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                refreshBtn.disabled = true;
                refreshBtn.textContent = '🔄 Atualizando...';
                try {
                    // Limpar cache da sessão
                    console.log('🧹 Limpando cache da sessão...');
                    this.clearCache();
                    
                    // Destruir todos os gráficos antes de recarregar
                    if (window.chartsManager) {
                        window.chartsManager.destroyAll();
                    }
                    
                    // Resetar flags de abas carregadas para forçar recarregamento
                    this.tabDataLoaded = {
                        overview: false,
                        execution: false,
                        creation: false,
                        coverage: false,
                        project: false
                    };
                    
                    // Recarregar todos os dados com forceRefresh
                    await this.loadData(true);
                    
                    // Recarregar dados de TODAS as abas (não apenas a atual)
                    await this.reloadAllTabs();
                    
                    // Renderizar a aba atual para atualizar a visualização
                    await this.render();
                    
                    refreshBtn.textContent = '✅ Atualizado!';
                    setTimeout(() => {
                        refreshBtn.textContent = '🔄 Atualizar';
                        refreshBtn.disabled = false;
                    }, 2000);
                } catch (error) {
                    console.error('❌ Erro ao atualizar:', error);
                    refreshBtn.textContent = '❌ Erro';
                    setTimeout(() => {
                        refreshBtn.textContent = '🔄 Atualizar';
                        refreshBtn.disabled = false;
                    }, 2000);
                }
            });
        }

        // Botão de exportar
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportData());
        }

        // Botão de limpeza (apenas local, não disponível no GitHub Pages)
        const cleanupBtn = document.getElementById('cleanupBtn');
        if (cleanupBtn) {
            cleanupBtn.addEventListener('click', () => this.showCleanupModal());
        }

        // Botões do modal de limpeza (apenas local, não disponível no GitHub Pages)
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
    }

    /**
     * Configura sistema de abas
     */
    setupTabs() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabPanels = document.querySelectorAll('.tab-panel');
        
        // Restaurar aba ativa do localStorage
        const savedTab = this.safeLocalStorage('get', 'dashboard-active-tab');
        if (savedTab) {
            this.switchTab(savedTab);
        }
        
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });
    }

    /**
     * Troca de aba
     */
    switchTab(tabName) {
        // Atualizar botões
        document.querySelectorAll('.tab-btn').forEach(btn => {
            if (btn.getAttribute('data-tab') === tabName) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // Atualizar painéis
        document.querySelectorAll('.tab-panel').forEach(panel => {
            if (panel.id === `${tabName}-tab`) {
                panel.classList.add('active');
            } else {
                panel.classList.remove('active');
            }
        });
        
        this.currentTab = tabName;
        this.safeLocalStorage('set', 'dashboard-active-tab', tabName);
        
        // Carregar dados da aba se necessário (lazy loading)
        this.loadTabData(tabName).then(async () => {
            // Renderizar após carregar dados
            await this.render();
        });
    }

    /**
     * Carrega dados da aba (lazy loading)
     * @param {boolean} forceRefresh - Força atualização ignorando cache
     */
    async loadTabData(tabName, forceRefresh = false) {
        if (!forceRefresh && this.tabDataLoaded[tabName]) {
            return; // Já carregado (a menos que forceRefresh seja true)
        }
        
        console.log(`📊 Carregando dados da aba: ${tabName}${forceRefresh ? ' (forçando atualização)' : ''}`);
        
        switch(tabName) {
            case 'overview':
                await this.loadOverviewData();
                break;
            case 'execution':
                await this.loadExecutionData();
                break;
            case 'creation':
                await this.loadCreationData();
                break;
            case 'coverage':
                await this.loadCoverageData(forceRefresh);
                break;
            case 'project':
                await this.loadProjectData(forceRefresh);
                break;
        }
        
        this.tabDataLoaded[tabName] = true;
    }

    /**
     * Carrega dados da aba Visão Geral
     */
    async loadOverviewData() {
        // Dados já estão carregados no init()
        // Apenas renderizar gráficos específicos da visão geral
        if (this.historyData) {
            const filteredExecutions = window.dataLoader.filterExecutions(this.currentFilters);
            await this.renderOverviewCharts();
            // Garantir que métricas estão atualizadas
            this.renderMetrics(filteredExecutions);
        }
    }

    /**
     * Carrega dados da aba Execução
     */
    async loadExecutionData() {
        // Dados já estão carregados
        // Renderizar gráficos de execução
        if (this.historyData) {
            await this.render();
        }
    }

    /**
     * Carrega dados da aba Criação
     */
    async loadCreationData() {
        // Dados já estão carregados
        // Renderizar gráficos de criação
        if (this.evolutionData && window.chartsManager) {
            window.chartsManager.updateAll([], this.evolutionData);
        }
    }

    /**
     * Carrega dados da aba Cobertura
     * @param {boolean} forceRefresh - Força atualização ignorando cache
     */
    async loadCoverageData(forceRefresh = false) {
        try {
            const coverageReport = await window.brainDataLoader.loadCoverageReport(forceRefresh);
            this.coverageData = coverageReport;
            
            // Renderizar métricas e gráficos de cobertura apenas se a aba estiver ativa
            // (para evitar renderizar gráficos em abas não visíveis)
            if (this.currentTab === 'coverage') {
                this.renderCoverageMetrics(coverageReport);
                this.renderCoverageCharts(coverageReport);
            }
        } catch (error) {
            console.error('Erro ao carregar dados de cobertura:', error);
        }
    }

    /**
     * Carrega dados da aba Gestão de Projeto
     * @param {boolean} forceRefresh - Força atualização ignorando cache
     */
    async loadProjectData(forceRefresh = false) {
        try {
            const [brainMetrics, projectMetrics] = await Promise.all([
                window.brainDataLoader.loadBrainMetrics(forceRefresh),
                window.brainDataLoader.loadProjectMetrics(forceRefresh)
            ]);
            
            this.brainMetrics = brainMetrics;
            this.projectMetrics = projectMetrics;
            
            // Debug: Log dos dados carregados
            console.log('📊 [Gestão de Projeto] Dados carregados:', {
                brainMetrics: {
                    totals: brainMetrics?.totals,
                    flows: brainMetrics?.totals?.flows,
                    objects: brainMetrics?.totals?.objects
                },
                projectMetrics: {
                    summary: projectMetrics?.summary,
                    averageCompleteness: projectMetrics?.summary?.averageCompleteness
                }
            });
            
            // Renderizar métricas e gráficos de projeto apenas se a aba estiver ativa
            // (para evitar renderizar gráficos em abas não visíveis)
            if (this.currentTab === 'project') {
                this.renderProjectMetrics(brainMetrics, projectMetrics);
                this.renderProjectCharts(brainMetrics, projectMetrics);
            }
        } catch (error) {
            console.error('Erro ao carregar dados de gestão de projeto:', error);
        }
    }

    /**
     * Renderiza métricas de cobertura
     */
    renderCoverageMetrics(coverageReport) {
        if (!coverageReport || !coverageReport.summary) return;

        const summary = coverageReport.summary;
        
        const objectsEl = document.getElementById('metric-objects-analyzed');
        if (objectsEl) objectsEl.textContent = summary.totalObjects || 0;
        
        const avgCoverageEl = document.getElementById('metric-avg-coverage');
        if (avgCoverageEl) avgCoverageEl.textContent = (summary.averageCoverage || 0) + '%';
        
        const flowsCoveredEl = document.getElementById('metric-flows-covered');
        if (flowsCoveredEl) flowsCoveredEl.textContent = summary.totalCovered || 0;
        
        const gapsEl = document.getElementById('metric-gaps-identified');
        if (gapsEl) gapsEl.textContent = summary.totalNotCovered || 0;
    }

    /**
     * Renderiza gráficos de cobertura
     */
    renderCoverageCharts(coverageReport) {
        if (window.chartsManager && coverageReport) {
            window.chartsManager.createCoverageByObjectChart(coverageReport);
            window.chartsManager.createCoverageGapsChart(coverageReport);
            window.chartsManager.createCoverageByRecordTypeChart(coverageReport);
            window.chartsManager.createCoverageEvolutionChart(coverageReport);
        }
    }

    /**
     * Renderiza métricas de projeto
     */
    renderProjectMetrics(brainMetrics, projectMetrics) {
        console.log('📊 [renderProjectMetrics] Renderizando métricas:', {
            brainMetrics: brainMetrics?.totals,
            projectMetrics: projectMetrics?.summary,
            flowsCount: brainMetrics?.totals?.flows
        });
        
        if (brainMetrics && brainMetrics.totals) {
            const objectsEl = document.getElementById('metric-brain-objects');
            if (objectsEl) objectsEl.textContent = brainMetrics.totals.objects || 0;
            
            const recordTypesEl = document.getElementById('metric-record-types');
            if (recordTypesEl) recordTypesEl.textContent = brainMetrics.totals.recordTypes || 0;
            
            const validationRulesEl = document.getElementById('metric-validation-rules');
            if (validationRulesEl) validationRulesEl.textContent = brainMetrics.totals.validationRules || 0;
        }

        if (projectMetrics && projectMetrics.businessRules) {
            const businessRulesEl = document.getElementById('metric-business-rules');
            if (businessRulesEl) businessRulesEl.textContent = projectMetrics.businessRules.total || 0;
        }

        if (projectMetrics && projectMetrics.summary) {
            const flowsEl = document.getElementById('metric-flows-mapped');
            const flowsCount = brainMetrics?.totals?.flows || 0;
            console.log(`📊 [renderProjectMetrics] Flows Mapeados: ${flowsCount} (de brainMetrics.totals.flows)`);
            if (flowsEl) {
                flowsEl.textContent = flowsCount;
                // Aplicar cor vermelha se flows = 0
                if (flowsCount === 0) {
                    flowsEl.style.color = '#ff4d4d';
                    console.warn('⚠️ Flows Mapeados = 0. Verifique se os arquivos flows_analysis.json estão sendo gerados corretamente.');
                    console.warn('   💡 Execute: node scripts/generate-brain-metrics.js');
                } else {
                    flowsEl.style.color = '';
                    console.log(`✅ Flows Mapeados renderizado: ${flowsCount}`);
                }
            } else {
                console.error('❌ Elemento metric-flows-mapped não encontrado!');
            }
            
            const completenessEl = document.getElementById('metric-completeness');
            const completenessValue = projectMetrics.summary.averageCompleteness || 0;
            if (completenessEl) {
                completenessEl.textContent = completenessValue + '%';
                // Aplicar cor vermelha se completude < 40%
                if (completenessValue < 40) {
                    completenessEl.style.color = '#ff4d4d';
                    console.warn(`⚠️ Completude Média < 40%: ${completenessValue}%`);
                } else {
                    completenessEl.style.color = '';
                    console.log(`✅ Completude Média renderizada: ${completenessValue}%`);
                }
            } else {
                console.error('❌ Elemento metric-completeness não encontrado!');
            }
        } else {
            console.warn('⚠️ [renderProjectMetrics] projectMetrics.summary não disponível');
        }
    }

    /**
     * Renderiza gráficos de projeto
     */
    renderProjectCharts(brainMetrics, projectMetrics) {
        if (window.chartsManager && brainMetrics && projectMetrics) {
            window.chartsManager.createBrainEvolutionChart(projectMetrics);
            window.chartsManager.createCompletenessByObjectChart(projectMetrics);
            window.chartsManager.createBusinessRulesChart(projectMetrics);
            window.chartsManager.createMilestonesChart(projectMetrics);
        }
    }

    /**
     * Renderiza gráficos da visão geral
     */
    async renderOverviewCharts() {
        // Implementar gráficos consolidados
        if (this.historyData && window.chartsManager) {
            const filteredExecutions = window.dataLoader.filterExecutions(this.currentFilters);
            await window.chartsManager.updateOverviewCharts(filteredExecutions, this.evolutionData);
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
    async render() {
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

        // Renderizar baseado na aba ativa
        switch(this.currentTab) {
            case 'overview':
                await this.renderOverviewTab(filteredExecutions);
                break;
            case 'execution':
                this.renderExecutionTab(filteredExecutions);
                break;
            case 'creation':
                this.renderCreationTab();
                break;
            case 'coverage':
                // Cobertura é renderizada quando os dados são carregados
                if (this.coverageData) {
                    this.renderCoverageMetrics(this.coverageData);
                    this.renderCoverageCharts(this.coverageData);
                } else {
                    // Se os dados ainda não foram carregados, carregar agora
                    this.loadCoverageData().then(() => {
                        if (this.coverageData) {
                            this.renderCoverageMetrics(this.coverageData);
                            this.renderCoverageCharts(this.coverageData);
                        }
                    });
                }
                break;
            case 'project':
                // Projeto é renderizado quando os dados são carregados
                if (this.brainMetrics && this.projectMetrics) {
                    this.renderProjectMetrics(this.brainMetrics, this.projectMetrics);
                    this.renderProjectCharts(this.brainMetrics, this.projectMetrics);
                } else {
                    // Se os dados ainda não foram carregados, carregar agora
                    this.loadProjectData().then(() => {
                        if (this.brainMetrics && this.projectMetrics) {
                            this.renderProjectMetrics(this.brainMetrics, this.projectMetrics);
                            this.renderProjectCharts(this.brainMetrics, this.projectMetrics);
                        }
                    });
                }
                break;
        }
    }

    /**
     * Renderiza aba Visão Geral
     */
    async renderOverviewTab(filteredExecutions) {
        // Normalizar dados antes de renderizar
        const normalizedExecutions = (filteredExecutions || []).map(exec => this.normalizeExecution({...exec}));
        
        // Renderizar métricas principais
        this.renderMetrics(normalizedExecutions);
        
        // Renderizar gráficos da visão geral
        if (this.historyData && window.chartsManager) {
            await window.chartsManager.updateOverviewCharts(normalizedExecutions, this.evolutionData);
        } else if (!window.chartsManager) {
            console.warn('⚠️ chartsManager não está disponível. Verifique se charts.js foi carregado corretamente.');
        }
    }

    /**
     * Renderiza aba Execução
     */
    renderExecutionTab(filteredExecutions) {
        // Normalizar dados antes de calcular métricas
        const normalizedExecutions = (filteredExecutions || []).map(exec => this.normalizeExecution({...exec}));
        
        // Debug: verificar normalização
        console.log('🔍 Execuções normalizadas:', normalizedExecutions.map(e => ({
            executionId: e.executionId,
            executionType: e.executionType,
            testType: e.testType,
            hasScenarios: !!e.scenarios
        })));
        
        // Renderizar métricas de execução
        const metrics = window.dataLoader.calculateAggregatedMetrics(normalizedExecutions);
        const apiTests = normalizedExecutions.filter(e => e.testType === 'api').length;
        const uiTests = normalizedExecutions.filter(e => e.testType === 'ui').length;
        
        console.log('📊 Métricas calculadas:', {
            totalExecutions: metrics.totalExecutions,
            totalRegressions: metrics.totalRegressions,
            totalLocal: metrics.totalLocal,
            apiTests,
            uiTests
        });
        
        const totalExecEl = document.getElementById('metric-execution-total');
        if (totalExecEl) totalExecEl.textContent = metrics.totalExecutions;
        
        const regressionsEl = document.getElementById('metric-total-regressions');
        if (regressionsEl) regressionsEl.textContent = metrics.totalRegressions;
        
        const localEl = document.getElementById('metric-total-local');
        if (localEl) localEl.textContent = metrics.totalLocal;
        
        const successRateEl = document.getElementById('metric-execution-success-rate');
        if (successRateEl) successRateEl.textContent = metrics.avgSuccessRate.toFixed(2) + '%';
        
        const adjustedRateEl = document.getElementById('metric-adjusted-rate');
        if (adjustedRateEl) adjustedRateEl.textContent = metrics.avgAdjustedRate.toFixed(2) + '%';
        
        const apiMetric = document.getElementById('metric-api-tests');
        if (apiMetric) apiMetric.textContent = apiTests || 0;
        
        const uiMetric = document.getElementById('metric-ui-tests');
        if (uiMetric) uiMetric.textContent = uiTests || 0;
        
        // Renderizar gráficos de execução
        if (this.historyData) {
            window.chartsManager.updateAll(normalizedExecutions, this.evolutionData);
        }
        
        // Renderizar tabela
        if (this.historyData) {
            this.renderTable(normalizedExecutions);
            this.populateFilters();
        }
    }

    /**
     * Renderiza aba Criação
     */
    renderCreationTab() {
        // Renderizar métricas de criação
        if (this.evolutionData) {
            const tests = this.evolutionData.tests || [];
            const automated = tests.filter(t => t.automated).length;
            const pending = tests.filter(t => !t.automated).length;
            const total = tests.length;
            const rate = total > 0 ? ((automated / total) * 100).toFixed(1) : 0;
            
            const totalCreatedEl = document.getElementById('metric-total-created');
            if (totalCreatedEl) totalCreatedEl.textContent = total;
            
            const velocityEl = document.getElementById('metric-creation-velocity');
            if (velocityEl) {
                // Calcular velocidade (simplificado)
                velocityEl.textContent = `${total} testes`;
            }
            
            const automationRateEl = document.getElementById('metric-automation-rate-creation');
            if (automationRateEl) automationRateEl.textContent = rate + '%';
            
            const pendingEl = document.getElementById('metric-pending-creation');
            if (pendingEl) pendingEl.textContent = pending;
        }
        
        // Renderizar gráficos de criação
        if (this.evolutionData) {
            window.chartsManager.updateAll([], this.evolutionData);
        }
    }

    /**
     * Renderiza métricas principais
     */
    renderMetrics(executions) {
        // Normalizar dados antes de calcular métricas
        const normalizedExecutions = (executions || []).map(exec => this.normalizeExecution({...exec}));
        const metrics = window.dataLoader.calculateAggregatedMetrics(normalizedExecutions);
        
        // Contar tipos de teste
        const apiTests = normalizedExecutions.filter(e => e.testType === 'api').length;
        const uiTests = normalizedExecutions.filter(e => e.testType === 'ui').length;

        // Renderizar métricas básicas (visão geral)
        const totalExecutionsEl = document.getElementById('metric-total-executions');
        if (totalExecutionsEl) totalExecutionsEl.textContent = metrics.totalExecutions;
        
        const successRateEl = document.getElementById('metric-success-rate');
        if (successRateEl) successRateEl.textContent = metrics.avgSuccessRate.toFixed(2) + '%';
        
        const timeGainedEl = document.getElementById('metric-time-gained');
        if (timeGainedEl) timeGainedEl.textContent = window.dataLoader.formatDuration(metrics.totalTimeGained);
        
        // Métricas de automação (visão geral)
        const automatedTestsEl = document.getElementById('metric-automated-tests');
        if (automatedTestsEl && this.evolutionData) {
            const automated = (this.evolutionData.tests || []).filter(t => t.automated).length;
            automatedTestsEl.textContent = automated;
        }
        
        const automationRateEl = document.getElementById('metric-automation-rate');
        if (automationRateEl && this.evolutionData) {
            const total = (this.evolutionData.tests || []).length;
            const automated = (this.evolutionData.tests || []).filter(t => t.automated).length;
            const rate = total > 0 ? ((automated / total) * 100).toFixed(1) : 0;
            automationRateEl.textContent = rate + '%';
        }
        
        // Distribuição de ambientes
        const envDistributionEl = document.getElementById('metric-env-distribution');
        if (envDistributionEl) {
            const envCounts = { qa: 0, stg: 0, prod: 0 };
            normalizedExecutions.forEach(e => {
                const env = (e.environment || 'qa').toLowerCase();
                if (envCounts.hasOwnProperty(env)) envCounts[env]++;
            });
            const total = envCounts.qa + envCounts.stg + envCounts.prod;
            if (total > 0) {
                envDistributionEl.textContent = `QA:${envCounts.qa} STG:${envCounts.stg} PROD:${envCounts.prod}`;
            } else {
                envDistributionEl.textContent = '-';
            }
        }
        
        // Métricas da aba Execução (se existirem)
        const totalRegressionsEl = document.getElementById('metric-total-regressions');
        if (totalRegressionsEl) totalRegressionsEl.textContent = metrics.totalRegressions;
        
        const totalLocalEl = document.getElementById('metric-total-local');
        if (totalLocalEl) totalLocalEl.textContent = metrics.totalLocal;
        
        const adjustedRateEl = document.getElementById('metric-adjusted-rate');
        if (adjustedRateEl) adjustedRateEl.textContent = metrics.avgAdjustedRate.toFixed(2) + '%';
        
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
                // Elemento metric-pending-tests não existe no HTML atual - ignorar silenciosamente
                // Tentar usar metric-pending-creation como fallback
                const pendingCreationMetric = document.getElementById('metric-pending-creation');
                if (pendingCreationMetric && this.evolutionData && this.evolutionData.metadata) {
                    const pending = this.evolutionData.metadata.pendingTests ?? this.evolutionData.metadata.pending ?? 0;
                    pendingCreationMetric.textContent = pending;
                    console.log('⏳ Testes Pendentes renderizado (fallback):', pending);
                }
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
     * Normaliza dados de execução para garantir que todos os campos necessários existam
     */
    normalizeExecution(exec) {
        // Normalizar successRate
        if (!exec.successRate && exec.metrics) {
            exec.successRate = exec.metrics.successRate || (exec.total > 0 ? ((exec.passed || 0) / exec.total) * 100 : 0);
        } else if (!exec.successRate) {
            exec.successRate = exec.total > 0 ? ((exec.passed || 0) / exec.total) * 100 : 0;
        }
        
        // Normalizar adjustedSuccessRate
        if (!exec.adjustedSuccessRate) {
            const bugs = exec.errorClassification?.salesforceBug || 0;
            const total = exec.total || 0;
            if (total > 0 && bugs > 0) {
                exec.adjustedSuccessRate = ((exec.passed || 0) / (total - bugs)) * 100;
            } else {
                exec.adjustedSuccessRate = exec.successRate;
            }
        }
        
        // Normalizar executionType
        if (!exec.executionType) {
            // Se executionId contém 'regression', é regressão completa (full)
            // Caso contrário, é execução local
            exec.executionType = exec.executionId && exec.executionId.includes('regression') ? 'full' : 'local';
        }
        
        // Normalizar testType baseado nos cenários
        if (!exec.testType && exec.scenarios && exec.scenarios.length > 0) {
            const features = exec.scenarios.map(s => s.feature).filter(f => f);
            const uniqueFeatures = [...new Set(features)];
            
            if (uniqueFeatures.length === 1) {
                // Todos os cenários são do mesmo tipo
                exec.testType = uniqueFeatures[0] === 'api' ? 'api' : uniqueFeatures[0] === 'ui' ? 'ui' : 'mixed';
            } else if (uniqueFeatures.length > 1) {
                // Mistura de tipos
                exec.testType = 'mixed';
            } else {
                // Sem informação de feature, tentar inferir do nome do cenário ou executionId
                const hasApiInName = exec.scenarios.some(s => 
                    s.name && (s.name.toLowerCase().includes('api') || s.name.toLowerCase().includes('via api'))
                );
                const hasUiInName = exec.scenarios.some(s => 
                    s.name && (s.name.toLowerCase().includes('ui') || s.name.toLowerCase().includes('interface'))
                );
                
                if (hasApiInName && !hasUiInName) {
                    exec.testType = 'api';
                } else if (hasUiInName && !hasApiInName) {
                    exec.testType = 'ui';
                } else {
                    exec.testType = 'mixed';
                }
            }
        } else if (!exec.testType) {
            // Sem cenários, tentar inferir do executionId ou assumir mixed
            const execId = (exec.executionId || '').toLowerCase();
            if (execId.includes('api')) {
                exec.testType = 'api';
            } else if (execId.includes('ui')) {
                exec.testType = 'ui';
            } else {
                exec.testType = 'mixed';
            }
        }
        
        // Normalizar campos da tabela
        exec.totalTests = exec.total || exec.totalTests || 0;
        exec.bugsReal = exec.errorClassification?.salesforceBug || exec.bugsReal || 0;
        exec.instability = (exec.errorClassification?.testCode || 0) + (exec.errorClassification?.environment || 0) || exec.instability || 0;
        exec.executionTime = exec.duration || exec.executionTime || 0;
        exec.executionTimeFormatted = exec.executionTimeFormatted || window.dataLoader.formatDuration(exec.executionTime);
        
        // Normalizar timeGained
        if (!exec.timeGained) {
            if (exec.durationManual && exec.duration) {
                exec.timeGained = exec.durationManual - exec.duration;
            } else if (exec.total && exec.duration) {
                const estimatedManual = exec.total * 10 * 60 * 1000; // 10 min por teste
                exec.timeGained = estimatedManual - exec.duration;
            }
        }
        exec.timeGainedFormatted = exec.timeGainedFormatted || (exec.timeGained ? window.dataLoader.formatDuration(exec.timeGained) : '00:00');
        
        return exec;
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

        // Normalizar dados antes de renderizar
        const normalizedExecutions = executions.map(exec => this.normalizeExecution({...exec}));

        tbody.innerHTML = normalizedExecutions.map(exec => {
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
                    <td style="font-size: 0.85rem;"><span class="badge badge-info">${exec.version || exec.releaseVersion || '-'}</span></td>
                    <td style="font-size: 0.85rem; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${exec.release || '-'}">${exec.release || '-'}</td>
                    <td style="font-size: 0.85rem;"><span class="badge ${exec.executionType === 'full' ? 'badge-full' : 'badge-local'}">${exec.executionType === 'full' ? 'Regressão' : 'Local'}</span></td>
                    <td style="font-size: 0.85rem;"><span class="${testTypeBadgeClass}">${testTypeLabel}</span></td>
                    <td style="font-size: 0.85rem;"><span class="badge badge-info">${exec.environment?.toUpperCase() || '-'}</span></td>
                    <td style="font-size: 0.85rem; text-align: center;">${exec.totalTests}</td>
                    <td style="font-size: 0.85rem; text-align: center;"><span class="badge badge-success">${exec.passed || 0}</span></td>
                    <td style="font-size: 0.85rem; text-align: center;"><span class="badge badge-danger">${exec.failed || 0}</span></td>
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

        const execRaw = this.historyData.executions.find(e => e.timestamp === timestamp);
        if (!execRaw) return;
        
        // Normalizar dados antes de exibir
        const exec = this.normalizeExecution({...execRaw});

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
                <div class="detail-value">${exec.version || exec.releaseVersion || '-'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Release:</div>
                <div class="detail-value">${exec.release || '-'}</div>
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
                <div class="detail-value">${exec.totalTests || exec.total || 0}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Resultados:</div>
                <div class="detail-value">
                    ✅ Passou: ${exec.passed || 0}<br>
                    ❌ Falhou: ${exec.failed || 0}<br>
                    🐛 Bugs Reais: ${exec.bugsReal || exec.errorClassification?.salesforceBug || 0}<br>
                    ⚠️ Instabilidade: ${exec.instability || ((exec.errorClassification?.testCode || 0) + (exec.errorClassification?.environment || 0)) || 0}
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
                    Execução: ${exec.executionTimeFormatted || window.dataLoader.formatDuration(exec.executionTime || exec.duration || 0)}<br>
                    Manual Estimado: ${window.dataLoader.formatDuration(exec.durationManual || exec.manualTimeEstimated || 0)}<br>
                    Tempo Ganho: ${exec.timeGainedFormatted || window.dataLoader.formatDuration(exec.timeGained || 0)}
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
            await this.render();

        } catch (error) {
            console.error('Erro ao limpar dados:', error);
            alert('Erro ao limpar dados. Verifique o console para mais detalhes.');
        }
    }

    /**
     * Inicia auto-refresh periódico
     */
    startAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
        }
        
        if (!this.autoRefreshEnabled) {
            return;
        }
        
        console.log(`🔄 Auto-refresh ativado (verificando a cada ${this.autoRefreshIntervalMs / 1000}s)`);
        
        this.autoRefreshInterval = setInterval(async () => {
            try {
                // Verificar apenas o timestamp e número de execuções sem recarregar tudo
                const cacheBuster = `?t=${Date.now()}`;
                const response = await fetch(`data/history.json${cacheBuster}`);
                
                if (response.ok) {
                    const data = await response.json();
                    const newTimestamp = data?.metadata?.lastUpdate;
                    const newTotalExecutions = data?.metadata?.totalExecutions || 0;
                    const currentTotalExecutions = this.historyData?.metadata?.totalExecutions || 0;
                    
                    // Verificar se há novos dados: timestamp mudou OU número de execuções aumentou
                    const timestampChanged = newTimestamp && this.lastUpdateTimestamp && newTimestamp !== this.lastUpdateTimestamp;
                    const executionsIncreased = newTotalExecutions > currentTotalExecutions;
                    
                    if (timestampChanged || executionsIncreased) {
                        console.log('🔄 Novos dados detectados! Atualizando dashboard...');
                        await this.loadData();
                        await this.render();
                    }
                }
            } catch (error) {
                // Silenciosamente ignorar erros de rede durante auto-refresh
                // Não queremos poluir o console com erros periódicos
            }
        }, this.autoRefreshIntervalMs);
    }
    
    /**
     * Para auto-refresh periódico
     */
    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
            console.log('⏸️ Auto-refresh desativado');
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
