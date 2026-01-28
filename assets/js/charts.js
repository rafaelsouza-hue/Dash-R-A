/**
 * Configuração de gráficos para o dashboard
 */

// Versão: 2026-01-27 - Removido gráfico redundante "Taxa de Sucesso Avançada", adicionado "Velocidade de Automação"
class ChartsManager {
    constructor() {
        this.charts = {};
        this.chartColors = {
            primary: '#3b82f6',
            success: '#10b981',
            danger: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6',
            secondary: '#64748b'
        };
        
        // Registrar plugin de annotation se disponível
        if (typeof Chart !== 'undefined' && Chart.register) {
            // Plugin já está registrado via CDN, apenas verificar
            console.log('Chart.js Annotation plugin disponível');
        }
        
        // Configurar Chart.js para tema dark
        this.configureDarkTheme();
    }
    
    /**
     * Mostra mensagem "Sem dados" no gráfico
     */
    showNoDataMessage(canvasId, message = 'Sem dados disponíveis', subtitle = 'Execute testes para visualizar os dados') {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        
        const container = canvas.closest('.chart-container');
        if (!container) return;
        
        // Remover mensagem anterior se existir
        const existingMessage = container.querySelector('.chart-no-data');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        // Criar elemento de mensagem
        const noDataDiv = document.createElement('div');
        noDataDiv.className = 'chart-no-data';
        noDataDiv.innerHTML = `
            <div class="chart-no-data-icon">📊</div>
            <div class="chart-no-data-message">${message}</div>
            <div class="chart-no-data-subtitle">${subtitle}</div>
        `;
        
        container.appendChild(noDataDiv);
    }
    
    /**
     * Remove mensagem "Sem dados" do gráfico
     */
    hideNoDataMessage(canvasId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        
        const container = canvas.closest('.chart-container');
        if (!container) return;
        
        const noDataMessage = container.querySelector('.chart-no-data');
        if (noDataMessage) {
            noDataMessage.remove();
        }
    }
    
    /**
     * Configura Chart.js para tema dark
     */
    configureDarkTheme() {
        if (typeof Chart !== 'undefined') {
            Chart.defaults.color = '#f1f5f9';
            Chart.defaults.borderColor = '#334155';
            Chart.defaults.backgroundColor = '#1e293b';
            
            // Configurar escalas padrão
            Chart.defaults.scales.linear = Chart.defaults.scales.linear || {};
            Chart.defaults.scales.linear.ticks = Chart.defaults.scales.linear.ticks || {};
            Chart.defaults.scales.linear.ticks.color = '#94a3b8';
            Chart.defaults.scales.linear.grid = Chart.defaults.scales.linear.grid || {};
            Chart.defaults.scales.linear.grid.color = '#334155';
            
            Chart.defaults.scales.category = Chart.defaults.scales.category || {};
            Chart.defaults.scales.category.ticks = Chart.defaults.scales.category.ticks || {};
            Chart.defaults.scales.category.ticks.color = '#94a3b8';
            Chart.defaults.scales.category.grid = Chart.defaults.scales.category.grid || {};
            Chart.defaults.scales.category.grid.color = '#334155';
            
            // Configurar plugins
            Chart.defaults.plugins = Chart.defaults.plugins || {};
            Chart.defaults.plugins.legend = Chart.defaults.plugins.legend || {};
            Chart.defaults.plugins.legend.labels = Chart.defaults.plugins.legend.labels || {};
            Chart.defaults.plugins.legend.labels.color = '#f1f5f9';
            
            // Configurar tooltips explicitamente
            Chart.defaults.plugins.tooltip = Chart.defaults.plugins.tooltip || {};
            Chart.defaults.plugins.tooltip.enabled = true;
            Chart.defaults.plugins.tooltip.backgroundColor = '#1e293b';
            Chart.defaults.plugins.tooltip.borderColor = '#334155';
            Chart.defaults.plugins.tooltip.titleColor = '#f1f5f9';
            Chart.defaults.plugins.tooltip.bodyColor = '#f1f5f9';
            Chart.defaults.plugins.tooltip.borderWidth = 1;
            Chart.defaults.plugins.tooltip.padding = 12;
            Chart.defaults.plugins.tooltip.displayColors = true;
        }
    }

    /**
     * Agrupa execuções por data, mantendo apenas uma entrada por data
     * Para múltiplas execuções no mesmo dia, usa a mais recente
     */
    groupExecutionsByDate(executions) {
        if (!executions || executions.length === 0) return [];
        
        // Ordenar por timestamp (mais antigo primeiro)
        const sorted = [...executions].sort((a, b) => {
            return new Date(a.timestamp) - new Date(b.timestamp);
        });
        
        // Agrupar por data (sem hora)
        const grouped = new Map();
        
        sorted.forEach(exec => {
            const date = new Date(exec.timestamp);
            const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
            
            if (!grouped.has(dateKey)) {
                grouped.set(dateKey, []);
            }
            grouped.get(dateKey).push(exec);
        });
        
        // Para cada data, pegar a execução mais recente (última do dia)
        const result = [];
        grouped.forEach((execs, dateKey) => {
            // Ordenar execuções do mesmo dia por timestamp (mais recente primeiro)
            execs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            result.push(execs[0]); // Pegar a mais recente
        });
        
        // Ordenar resultado final por data (mais antigo primeiro)
        result.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        return result;
    }

    /**
     * Agrupa execuções por mês (YYYY-MM)
     * Para cada mês, pega a execução mais recente e calcula médias das taxas
     */
    groupExecutionsByMonth(executions) {
        if (!executions || executions.length === 0) return [];
        
        // Ordenar por timestamp (mais antigo primeiro)
        const sorted = [...executions].sort((a, b) => {
            return new Date(a.timestamp) - new Date(b.timestamp);
        });
        
        // Agrupar por mês (YYYY-MM)
        const grouped = new Map();
        
        sorted.forEach(exec => {
            const date = new Date(exec.timestamp);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
            
            if (!grouped.has(monthKey)) {
                grouped.set(monthKey, []);
            }
            grouped.get(monthKey).push(exec);
        });
        
        // Para cada mês, calcular médias e pegar timestamp mais recente
        const result = [];
        grouped.forEach((execs, monthKey) => {
            // Ordenar execuções do mesmo mês por timestamp (mais recente primeiro)
            execs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            // Calcular médias das taxas de sucesso
            const normalized = execs.map(e => this.normalizeExecutionForChart({...e}));
            const avgSuccessRate = normalized.reduce((sum, e) => sum + (e.successRate || 0), 0) / normalized.length;
            const avgAdjustedRate = normalized.reduce((sum, e) => sum + (e.adjustedSuccessRate || 0), 0) / normalized.length;
            
            // Criar objeto agregado com a execução mais recente como base
            const mostRecent = normalized[0];
            result.push({
                ...mostRecent,
                timestamp: mostRecent.timestamp, // Timestamp da execução mais recente do mês
                successRate: avgSuccessRate, // Média das taxas do mês
                adjustedSuccessRate: avgAdjustedRate, // Média das taxas ajustadas do mês
                monthKey: monthKey // Chave do mês para referência
            });
        });
        
        // Ordenar resultado final por mês (mais antigo primeiro)
        result.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        return result;
    }

    /**
     * Agrupa execuções por mês do ano atual
     * Agrega múltiplas execuções do mesmo mês calculando médias das taxas
     */
    groupExecutionsByMonth(executions) {
        if (!executions || executions.length === 0) return [];
        
        const currentYear = new Date().getFullYear();
        
        // Filtrar apenas execuções do ano atual
        const currentYearExecutions = executions.filter(exec => {
            const execDate = new Date(exec.timestamp);
            return execDate.getFullYear() === currentYear;
        });
        
        if (currentYearExecutions.length === 0) return [];
        
        // Normalizar dados antes de agrupar
        const normalized = currentYearExecutions.map(e => this.normalizeExecutionForChart({...e}));
        
        // Agrupar por mês (YYYY-MM)
        const grouped = new Map();
        
        normalized.forEach(exec => {
            const date = new Date(exec.timestamp);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
            
            if (!grouped.has(monthKey)) {
                grouped.set(monthKey, {
                    monthKey: monthKey,
                    timestamp: exec.timestamp, // Usar primeira execução do mês como referência
                    executions: [],
                    totalTests: 0,
                    totalPassed: 0,
                    totalFailed: 0,
                    totalBugs: 0,
                    successRates: [],
                    adjustedSuccessRates: []
                });
            }
            
            const monthData = grouped.get(monthKey);
            monthData.executions.push(exec);
            monthData.totalTests += exec.total || exec.totalTests || 0;
            monthData.totalPassed += exec.passed || 0;
            monthData.totalFailed += exec.failed || 0;
            monthData.totalBugs += exec.errorClassification?.salesforceBug || 0;
            monthData.successRates.push(exec.successRate || 0);
            monthData.adjustedSuccessRates.push(exec.adjustedSuccessRate || 0);
            
            // Manter timestamp mais recente do mês
            if (new Date(exec.timestamp) > new Date(monthData.timestamp)) {
                monthData.timestamp = exec.timestamp;
            }
        });
        
        // Calcular médias e criar resultado final
        const result = [];
        grouped.forEach((monthData, monthKey) => {
            // Calcular média das taxas de sucesso
            const avgSuccessRate = monthData.successRates.length > 0
                ? monthData.successRates.reduce((sum, rate) => sum + rate, 0) / monthData.successRates.length
                : 0;
            
            const avgAdjustedRate = monthData.adjustedSuccessRates.length > 0
                ? monthData.adjustedSuccessRates.reduce((sum, rate) => sum + rate, 0) / monthData.adjustedSuccessRates.length
                : 0;
            
            // Criar objeto de resultado
            result.push({
                timestamp: monthData.timestamp,
                monthKey: monthKey,
                total: monthData.totalTests,
                passed: monthData.totalPassed,
                failed: monthData.totalFailed,
                successRate: avgSuccessRate,
                adjustedSuccessRate: avgAdjustedRate,
                errorClassification: {
                    salesforceBug: monthData.totalBugs
                },
                executionCount: monthData.executions.length
            });
        });
        
        // Ordenar por mês (mais antigo primeiro)
        result.sort((a, b) => {
            return a.monthKey.localeCompare(b.monthKey);
        });
        
        return result;
    }

    /**
     * Agrupa execuções por data somando tempos (para gráfico de tempo de execução)
     */
    groupExecutionsByDateSumTime(executions) {
        if (!executions || executions.length === 0) return [];
        
        // Ordenar por timestamp (mais antigo primeiro)
        const sorted = [...executions].sort((a, b) => {
            return new Date(a.timestamp) - new Date(b.timestamp);
        });
        
        // Agrupar por data
        const grouped = new Map();
        
        sorted.forEach(exec => {
            const date = new Date(exec.timestamp);
            const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
            
            if (!grouped.has(dateKey)) {
                grouped.set(dateKey, {
                    timestamp: exec.timestamp,
                    date: exec.date,
                    executionTime: 0,
                    manualTimeEstimated: 0,
                    timeGained: 0,
                    totalTests: 0
                });
            }
            
            const group = grouped.get(dateKey);
            group.executionTime += exec.executionTime || 0;
            group.manualTimeEstimated += exec.manualTimeEstimated || 0;
            group.timeGained += exec.timeGained || 0;
            group.totalTests += exec.totalTests || 0;
            
            // Manter o timestamp mais recente do dia
            if (new Date(exec.timestamp) > new Date(group.timestamp)) {
                group.timestamp = exec.timestamp;
                group.date = exec.date;
            }
        });
        
        // Converter para array e ordenar
        const result = Array.from(grouped.values());
        result.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        return result;
    }

    /**
     * Agrupa execuções por mês somando valores de tempo (para gráficos de ROI mensal)
     */
    groupExecutionsByMonthSumTime(executions) {
        if (!executions || executions.length === 0) return [];
        const currentYear = new Date().getFullYear();
        const currentYearExecutions = executions.filter(exec => {
            const execDate = new Date(exec.timestamp);
            return execDate.getFullYear() === currentYear;
        });
        if (currentYearExecutions.length === 0) return [];
        const normalized = currentYearExecutions.map(e => this.normalizeExecutionForChart({...e}));
        const grouped = new Map();
        normalized.forEach(exec => {
            const date = new Date(exec.timestamp);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!grouped.has(monthKey)) {
                grouped.set(monthKey, {
                    monthKey: monthKey,
                    timestamp: exec.timestamp,
                    executionTime: 0,
                    timeGained: 0,
                    totalTests: 0,
                    executionCount: 0
                });
            }
            const monthData = grouped.get(monthKey);
            let timeGained = exec.timeGained;
            if (!timeGained) {
                if (exec.durationManual && exec.duration) {
                    timeGained = exec.durationManual - exec.duration;
                } else if (exec.total && exec.duration) {
                    const estimatedManual = exec.total * 10 * 60 * 1000;
                    timeGained = estimatedManual - exec.duration;
                } else {
                    timeGained = 0;
                }
            }
            monthData.executionTime += exec.duration || exec.executionTime || 0;
            monthData.timeGained += timeGained;
            monthData.totalTests += exec.total || exec.totalTests || 0;
            monthData.executionCount++;
            if (new Date(exec.timestamp) > new Date(monthData.timestamp)) {
                monthData.timestamp = exec.timestamp;
            }
        });
        const result = Array.from(grouped.values());
        result.sort((a, b) => a.monthKey.localeCompare(b.monthKey));
        return result;
    }

    /**
     * Agrupa execuções por data somando valores (para gráficos de barra)
     */
    groupExecutionsByDateSum(executions) {
        if (!executions || executions.length === 0) return [];
        
        // Ordenar por timestamp (mais antigo primeiro)
        const sorted = [...executions].sort((a, b) => {
            return new Date(a.timestamp) - new Date(b.timestamp);
        });
        
        // Agrupar por data
        const grouped = new Map();
        
        sorted.forEach(exec => {
            const date = new Date(exec.timestamp);
            const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
            
            if (!grouped.has(dateKey)) {
                grouped.set(dateKey, {
                    timestamp: exec.timestamp,
                    date: exec.date,
                    bugsReal: 0,
                    instability: 0,
                    executionTime: 0,
                    totalTests: 0,
                    passed: 0,
                    failed: 0
                });
            }
            
            const group = grouped.get(dateKey);
            group.bugsReal += exec.bugsReal || 0;
            group.instability += exec.instability || 0;
            group.executionTime += exec.executionTime || 0;
            group.totalTests += exec.totalTests || 0;
            group.passed += exec.passed || 0;
            group.failed += exec.failed || 0;
            
            // Manter o timestamp mais recente do dia
            if (new Date(exec.timestamp) > new Date(group.timestamp)) {
                group.timestamp = exec.timestamp;
                group.date = exec.date;
            }
        });
        
        // Converter para array e ordenar
        const result = Array.from(grouped.values());
        result.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        return result;
    }

    /**
     * Agrupa execuções por mês somando valores (para gráficos de barra mensal)
     */
    groupExecutionsByMonthSum(executions) {
        if (!executions || executions.length === 0) return [];
        
        // Ordenar por timestamp (mais antigo primeiro)
        const sorted = [...executions].sort((a, b) => {
            return new Date(a.timestamp) - new Date(b.timestamp);
        });
        
        // Agrupar por mês (YYYY-MM)
        const grouped = new Map();
        
        sorted.forEach(exec => {
            const date = new Date(exec.timestamp);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
            
            if (!grouped.has(monthKey)) {
                grouped.set(monthKey, {
                    monthKey: monthKey,
                    timestamp: exec.timestamp,
                    date: exec.date,
                    bugsReal: 0,
                    instability: 0,
                    executionTime: 0,
                    totalTests: 0,
                    passed: 0,
                    failed: 0,
                    errorClassification: {
                        testCode: 0,
                        salesforceBug: 0,
                        environment: 0,
                        unknown: 0
                    }
                });
            }
            
            const group = grouped.get(monthKey);
            group.bugsReal += exec.bugsReal || 0;
            group.instability += exec.instability || 0;
            group.executionTime += exec.executionTime || 0;
            group.totalTests += exec.totalTests || 0;
            group.passed += exec.passed || 0;
            group.failed += exec.failed || 0;
            
            // Somar valores de errorClassification
            if (exec.errorClassification) {
                group.errorClassification.testCode += exec.errorClassification.testCode || 0;
                group.errorClassification.salesforceBug += exec.errorClassification.salesforceBug || 0;
                group.errorClassification.environment += exec.errorClassification.environment || 0;
                group.errorClassification.unknown += exec.errorClassification.unknown || 0;
            }
            
            // Manter o timestamp mais recente do mês
            if (new Date(exec.timestamp) > new Date(group.timestamp)) {
                group.timestamp = exec.timestamp;
                group.date = exec.date;
            }
        });
        
        // Converter para array e ordenar por mês
        const result = Array.from(grouped.values());
        result.sort((a, b) => a.monthKey.localeCompare(b.monthKey));
        
        return result;
    }

    /**
     * Destrói todos os gráficos
     */
    destroyAll() {
        Object.values(this.charts).forEach(chart => {
            if (chart) chart.destroy();
        });
        this.charts = {};
    }

    /**
     * Normaliza dados de execução para garantir campos necessários
     */
    normalizeExecutionForChart(exec) {
        // Normalizar successRate
        if (!exec.successRate) {
            if (exec.metrics && exec.metrics.successRate !== undefined) {
                exec.successRate = exec.metrics.successRate;
            } else if (exec.total > 0) {
                exec.successRate = ((exec.passed || 0) / exec.total) * 100;
            } else {
                exec.successRate = 0;
            }
        }
        
        // Normalizar adjustedSuccessRate
        if (!exec.adjustedSuccessRate) {
            const bugs = exec.errorClassification?.salesforceBug || 0;
            const total = exec.total || 0;
            if (total > 0 && bugs > 0) {
                exec.adjustedSuccessRate = ((exec.passed || 0) / (total - bugs)) * 100;
            } else {
                exec.adjustedSuccessRate = exec.successRate || 0;
            }
        }
        
        return exec;
    }

    /**
     * Cria gráfico de evolução de sucesso
     */
    createSuccessEvolutionChart(executions) {
        const ctx = document.getElementById('chart-success-evolution');
        if (!ctx) {
            console.warn('⚠️ Canvas chart-success-evolution não encontrado');
            return;
        }

        if (this.charts.successEvolution) {
            this.charts.successEvolution.destroy();
        }
        
        // Se não houver dados, mostrar mensagem
        if (!executions || executions.length === 0) {
            console.warn('⚠️ createSuccessEvolutionChart: Sem dados de execução');
            this.showNoDataMessage('chart-success-evolution', 
                'Sem dados de execução', 
                'Execute testes para visualizar a evolução de sucesso');
            return;
        }
        
        // Remover mensagem se houver dados
        this.hideNoDataMessage('chart-success-evolution');

        // Normalizar dados antes de agrupar
        const normalizedExecutions = executions.map(e => this.normalizeExecutionForChart({...e}));
        // Agrupar por mês ao invés de por dia
        const grouped = this.groupExecutionsByMonth(normalizedExecutions);
        
        // Garantir que os dados agrupados também estão normalizados
        const finalGrouped = grouped.map(e => this.normalizeExecutionForChart({...e}));

        // Formatar labels como mês/ano (ex: "01/2026")
        const labels = finalGrouped.map(e => {
            const date = new Date(e.timestamp);
            return date.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
        });

        // Verificar se há dados válidos
        if (labels.length === 0 || finalGrouped.length === 0) {
            this.showNoDataMessage('chart-success-evolution', 
                'Sem dados de execução', 
                'Execute testes para visualizar a evolução de sucesso');
            return;
        }

        this.charts.successEvolution = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Taxa de Sucesso Real',
                        data: finalGrouped.map(e => e.successRate || 0),
                        borderColor: this.chartColors.primary,
                        backgroundColor: 'rgba(59, 130, 246, 0.2)',
                        tension: 0.4,
                        fill: true,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    },
                    {
                        label: 'Taxa de Sucesso Ajustada',
                        data: finalGrouped.map(e => e.adjustedSuccessRate || 0),
                        borderColor: this.chartColors.success,
                        backgroundColor: 'rgba(16, 185, 129, 0.2)',
                        tension: 0.4,
                        fill: true,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: '#f1f5f9',
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        enabled: true,
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            title: function(context) {
                                return 'Mês: ' + context[0].label;
                            },
                            label: function(context) {
                                const label = context.dataset.label;
                                const value = context.parsed.y.toFixed(2) + '%';
                                let explanation = '';
                                if (label === 'Taxa de Sucesso Real') {
                                    explanation = ' (média do mês - sucesso bruto de todos os testes)';
                                } else if (label === 'Taxa de Sucesso Ajustada') {
                                    explanation = ' (média do mês - remove bugs do Salesforce)';
                                }
                                return label + ': ' + value + explanation;
                            },
                            footer: function(context) {
                                return 'Taxa Real: média de todos os testes do mês | Taxa Ajustada: média removendo bugs Salesforce';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            },
                            color: '#94a3b8'
                        },
                        grid: {
                            color: '#334155'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#94a3b8'
                        },
                        grid: {
                            color: '#334155'
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });
    }

    /**
     * Cria gráfico de bugs vs instabilidade
     */
    createBugsVsInstabilityChart(executions) {
        const ctx = document.getElementById('chart-bugs-vs-instability');
        if (!ctx) {
            console.warn('⚠️ Canvas chart-bugs-vs-instability não encontrado');
            return;
        }

        if (this.charts.bugsVsInstability) {
            this.charts.bugsVsInstability.destroy();
        }
        
        // Se não houver dados, mostrar mensagem
        if (!executions || executions.length === 0) {
            this.showNoDataMessage('chart-bugs-vs-instability', 
                'Sem dados de execução', 
                'Execute testes para visualizar bugs vs instabilidade');
            return;
        }
        
        // Remover mensagem se houver dados
        this.hideNoDataMessage('chart-bugs-vs-instability');

        // Agrupar execuções por mês somando valores
        const grouped = this.groupExecutionsByMonthSum(executions);

        // Formatar labels como mês/ano (ex: "01/2026")
        const labels = grouped.map(e => {
            const date = new Date(e.timestamp);
            return date.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
        });

        this.charts.bugsVsInstability = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Bugs Reais',
                        data: grouped.map(e => e.bugsReal),
                        backgroundColor: this.chartColors.danger,
                        borderColor: this.chartColors.danger,
                        borderWidth: 1
                    },
                    {
                        label: 'Instabilidade',
                        data: grouped.map(e => e.instability),
                        backgroundColor: this.chartColors.warning,
                        borderColor: this.chartColors.warning,
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        enabled: true,
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            title: function(context) {
                                return 'Mês: ' + context[0].label;
                            },
                            label: function(context) {
                                const label = context.dataset.label;
                                const value = context.parsed.y;
                                return label + ': ' + value + ' (total do mês)';
                            },
                            footer: function(context) {
                                return 'Valores somados de todas as execuções do mês';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        stacked: false
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    /**
     * Cria gráfico de distribuição de falhas
     */
    createFailureDistributionChart(executions) {
        const ctx = document.getElementById('chart-failure-distribution');
        if (!ctx) {
            console.warn('⚠️ Canvas chart-failure-distribution não encontrado');
            return;
        }

        if (this.charts.failureDistribution) {
            this.charts.failureDistribution.destroy();
        }
        
        // Se não houver dados, mostrar mensagem
        if (!executions || executions.length === 0) {
            this.showNoDataMessage('chart-failure-distribution', 
                'Sem dados de execução', 
                'Execute testes para visualizar a distribuição de falhas');
            return;
        }
        
        // Remover mensagem se houver dados
        this.hideNoDataMessage('chart-failure-distribution');

        const totalBugs = executions.reduce((sum, e) => sum + e.bugsReal, 0);
        const totalInstability = executions.reduce((sum, e) => sum + e.instability, 0);

        this.charts.failureDistribution = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Bugs Reais', 'Instabilidade'],
                datasets: [{
                    data: [totalBugs, totalInstability],
                    backgroundColor: [
                        this.chartColors.danger,
                        this.chartColors.warning
                    ],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Cria gráfico de tempo de execução
     */
    createExecutionTimeChart(executions) {
        const ctx = document.getElementById('chart-execution-time');
        if (!ctx) {
            console.warn('⚠️ Canvas chart-execution-time não encontrado');
            return;
        }

        if (this.charts.executionTime) {
            this.charts.executionTime.destroy();
        }
        
        // Se não houver dados, mostrar mensagem
        if (!executions || executions.length === 0) {
            this.showNoDataMessage('chart-execution-time', 
                'Sem dados de execução', 
                'Execute testes para visualizar o tempo de execução');
            return;
        }
        
        // Remover mensagem se houver dados
        this.hideNoDataMessage('chart-execution-time');

        // Agrupar execuções por mês somando os tempos
        const grouped = this.groupExecutionsByMonthSumTime(executions);

        // Formatar labels como mês/ano (ex: "01/2026")
        const labels = grouped.map(e => {
            const date = new Date(e.timestamp);
            return date.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
        });

        // Preparar dados do gráfico
        const chartData = {
            labels: labels,
            datasets: [
                {
                    label: 'Tempo Manual Estimado (Total)',
                    data: grouped.map(e => e.manualTimeEstimated / 1000 / 60), // Converter para minutos
                    borderColor: this.chartColors.secondary,
                    backgroundColor: 'rgba(100, 116, 139, 0.2)',
                    tension: 0.4,
                    fill: true,
                    borderDash: [5, 5]
                },
                {
                    label: 'Tempo Real de Automação (Total)',
                    data: grouped.map(e => e.executionTime / 1000 / 60), // Converter para minutos
                    borderColor: this.chartColors.primary,
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Tempo Ganho (Diferença)',
                    data: grouped.map(e => e.timeGained / 1000 / 60), // Converter para minutos
                    borderColor: this.chartColors.success,
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    tension: 0.4,
                    fill: true
                }
            ]
        };

        this.charts.executionTime = new Chart(ctx, {
            type: 'line',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            title: function(context) {
                                return 'Mês: ' + context[0].label;
                            },
                            label: function(context) {
                                const label = context.dataset.label;
                                const value = context.parsed.y.toFixed(2);
                                return label + ': ' + value + ' min (total do mês)';
                            },
                            footer: function(context) {
                                return 'Valores somados de todas as execuções do mês';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value + ' min';
                            },
                            color: '#94a3b8'
                        },
                        grid: {
                            color: '#334155'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#94a3b8'
                        },
                        grid: {
                            color: '#334155'
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });
    }

    /**
     * Cria gráfico de classificação de erros
     */
    createErrorClassificationChart(executions) {
        const ctx = document.getElementById('chart-error-classification');
        if (!ctx) {
            console.warn('⚠️ Canvas chart-error-classification não encontrado');
            return;
        }

        if (this.charts['error-classification']) {
            this.charts['error-classification'].destroy();
        }

        if (!executions || executions.length === 0) {
            this.showNoDataMessage('chart-error-classification', 
                'Sem dados de execução', 
                'Execute testes para visualizar a classificação de erros');
            return;
        }

        this.hideNoDataMessage('chart-error-classification');

        // Agrupar por mês somando valores de erro
        const grouped = this.groupExecutionsByMonthSum(executions);
        
        // Formatar labels como mês/ano (ex: "01/2026")
        const labels = grouped.map(exec => {
            const date = new Date(exec.timestamp);
            return date.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
        });
        
        const testCodeData = grouped.map(exec => 
            exec.errorClassification?.testCode || 0
        );
        const salesforceBugData = grouped.map(exec => 
            exec.errorClassification?.salesforceBug || 0
        );
        const environmentData = grouped.map(exec => 
            exec.errorClassification?.environment || 0
        );
        const unknownData = grouped.map(exec => 
            exec.errorClassification?.unknown || 0
        );
        
        this.charts['error-classification'] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Código de Teste',
                        data: testCodeData,
                        backgroundColor: 'rgba(255, 99, 132, 0.6)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Bug Salesforce',
                        data: salesforceBugData,
                        backgroundColor: 'rgba(54, 162, 235, 0.6)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Ambiente',
                        data: environmentData,
                        backgroundColor: 'rgba(255, 206, 86, 0.6)',
                        borderColor: 'rgba(255, 206, 86, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Desconhecido',
                        data: unknownData,
                        backgroundColor: 'rgba(75, 192, 192, 0.6)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: '#f1f5f9'
                        }
                    },
                    tooltip: {
                        enabled: true,
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            title: function(context) {
                                return 'Mês: ' + context[0].label;
                            },
                            label: function(context) {
                                const label = context.dataset.label;
                                const value = context.parsed.y;
                                return label + ': ' + value + ' (total do mês)';
                            },
                            footer: function(context) {
                                return 'Valores somados de todas as execuções do mês';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        stacked: false,
                        ticks: {
                            color: '#94a3b8'
                        },
                        grid: {
                            color: '#334155'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            color: '#94a3b8'
                        },
                        grid: {
                            color: '#334155'
                        }
                    }
                }
            }
        });
    }

    /**
     * Cria gráfico de funcionalidades testadas
     */
    createFunctionalitiesChart(executions) {
        const ctx = document.getElementById('chart-functionalities');
        if (!ctx) {
            console.warn('⚠️ Canvas chart-functionalities não encontrado');
            return;
        }

        if (this.charts['functionalities']) {
            this.charts['functionalities'].destroy();
        }

        if (!executions || executions.length === 0) {
            this.showNoDataMessage('chart-functionalities', 
                'Sem dados de execução', 
                'Execute testes para visualizar funcionalidades testadas');
            return;
        }

        this.hideNoDataMessage('chart-functionalities');

        // Coletar todas as funcionalidades únicas
        const allFunctionalities = new Set();
        executions.forEach(exec => {
            if (exec.functionalities && Array.isArray(exec.functionalities)) {
                exec.functionalities.forEach(func => allFunctionalities.add(func));
            }
        });
        
        const functionalitiesList = Array.from(allFunctionalities).sort();
        
        // Contar ocorrências por funcionalidade
        const functionalityCounts = {};
        functionalitiesList.forEach(func => {
            functionalityCounts[func] = 0;
        });
        
        executions.forEach(exec => {
            if (exec.functionalities && Array.isArray(exec.functionalities)) {
                exec.functionalities.forEach(func => {
                    if (functionalityCounts.hasOwnProperty(func)) {
                        functionalityCounts[func]++;
                    }
                });
            }
        });
        
        // Preparar dados para o gráfico
        const labels = functionalitiesList;
        const data = functionalitiesList.map(func => functionalityCounts[func]);
        
        this.charts['functionalities'] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Ocorrências',
                    data: data,
                    backgroundColor: this.chartColors.primary,
                    borderColor: this.chartColors.primary,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: '#f1f5f9'
                        }
                    },
                    tooltip: {
                        enabled: true,
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                const label = context.dataset.label;
                                const value = context.parsed.y;
                                return label + ': ' + value + ' execução(ões)';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: '#94a3b8'
                        },
                        grid: {
                            color: '#334155'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            color: '#94a3b8'
                        },
                        grid: {
                            color: '#334155'
                        }
                    }
                }
            }
        });
    }

    /**
     * Cria gráfico de evolução de testes criados
     */
    createTestEvolutionChart(evolutionData) {
        const ctx = document.getElementById('chart-test-evolution');
        if (!ctx) {
            console.warn('⚠️ Canvas chart-test-evolution não encontrado');
            return;
        }
        
        if (!evolutionData) {
            console.warn('⚠️ createTestEvolutionChart: Sem dados de evolução');
            this.showNoDataMessage('chart-test-evolution', 
                'Sem dados de evolução', 
                'Execute o monitoramento de testes para visualizar a evolução');
            return;
        }
        
        // Remover mensagem se houver dados
        this.hideNoDataMessage('chart-test-evolution');

        if (this.charts.testEvolution) {
            this.charts.testEvolution.destroy();
        }

        const evolution = evolutionData.evolution || {};
        const byPriority = evolutionData.byPriority || {};

        // Ordenar por data
        const sortedDates = Object.keys(evolution).sort();
        const labels = sortedDates.map(d => {
            const [year, month] = d.split('-');
            const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
            return `${monthNames[parseInt(month) - 1]}/${year}`;
        });

        // Agrupar por prioridade (se disponível)
        const highPriority = sortedDates.map(d => {
            // Tentar extrair da lista de testes
            return evolutionData.tests?.filter(t => {
                if (!t.createdDate) return false;
                try {
                    const [day, month, year] = t.createdDate.split('/');
                    const key = `${year}-${month.padStart(2, '0')}`;
                    return key === d && t.priority === 'Alta';
                } catch {
                    return false;
                }
            }).length || 0;
        });

        const mediumPriority = sortedDates.map(d => {
            return evolutionData.tests?.filter(t => {
                if (!t.createdDate) return false;
                try {
                    const [day, month, year] = t.createdDate.split('/');
                    const key = `${year}-${month.padStart(2, '0')}`;
                    return key === d && t.priority === 'Média';
                } catch {
                    return false;
                }
            }).length || 0;
        });

        const lowPriority = sortedDates.map(d => {
            return evolutionData.tests?.filter(t => {
                if (!t.createdDate) return false;
                try {
                    const [day, month, year] = t.createdDate.split('/');
                    const key = `${year}-${month.padStart(2, '0')}`;
                    return key === d && t.priority === 'Baixa';
                } catch {
                    return false;
                }
            }).length || 0;
        });

        this.charts.testEvolution = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Alta',
                        data: highPriority,
                        backgroundColor: this.chartColors.danger,
                        borderColor: this.chartColors.danger,
                        borderWidth: 1
                    },
                    {
                        label: 'Média',
                        data: mediumPriority,
                        backgroundColor: this.chartColors.warning,
                        borderColor: this.chartColors.warning,
                        borderWidth: 1
                    },
                    {
                        label: 'Baixa',
                        data: lowPriority,
                        backgroundColor: this.chartColors.info,
                        borderColor: this.chartColors.info,
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        enabled: true,
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    x: {
                        stacked: true
                    },
                    y: {
                        beginAtZero: true,
                        stacked: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    /**
     * Cria gráfico de status de automação (Automatizados vs Pendentes)
     */
    createAutomationStatusChart(evolutionData) {
        const ctx = document.getElementById('chart-automation-status');
        if (!ctx) {
            console.warn('⚠️ Canvas chart-automation-status não encontrado');
            return;
        }

        if (this.charts.automationStatus) {
            this.charts.automationStatus.destroy();
        }
        
        // Se não houver dados, mostrar mensagem
        if (!evolutionData) {
            this.showNoDataMessage('chart-automation-status', 
                'Sem dados de evolução', 
                'Execute o monitoramento de testes para visualizar o status de automação');
            return;
        }
        
        // Remover mensagem se houver dados
        this.hideNoDataMessage('chart-automation-status');

        const byAutomation = evolutionData.byAutomation || {};
        const automated = byAutomation.automated || 0;
        const pending = byAutomation.pending || 0;
        
        console.log('📊 createAutomationStatusChart:', { byAutomation, automated, pending });
        
        if (automated === 0 && pending === 0) {
            console.warn('⚠️ Nenhum dado de automação encontrado');
        }

        this.charts.automationStatus = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['✅ Automatizados', '⏳ Pendentes'],
                datasets: [{
                    data: [automated, pending],
                    backgroundColor: [
                        this.chartColors.success,
                        this.chartColors.warning
                    ],
                    borderColor: [
                        this.chartColors.success,
                        this.chartColors.warning
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Cria gráfico de automação por funcionalidade
     */
    createAutomationByFunctionalityChart(evolutionData) {
        const ctx = document.getElementById('chart-automation-by-functionality');
        if (!ctx) {
            console.warn('⚠️ Canvas chart-automation-by-functionality não encontrado');
            return;
        }

        if (this.charts.automationByFunctionality) {
            this.charts.automationByFunctionality.destroy();
        }
        
        // Se não houver dados, mostrar mensagem
        if (!evolutionData) {
            this.showNoDataMessage('chart-automation-by-functionality', 
                'Sem dados de evolução', 
                'Execute o monitoramento de testes para visualizar automação por funcionalidade');
            return;
        }
        
        // Remover mensagem se houver dados
        this.hideNoDataMessage('chart-automation-by-functionality');

        const byFunctionality = evolutionData.byFunctionality || {};
        
        console.log('📊 createAutomationByFunctionalityChart:', { 
            byFunctionality, 
            entries: Object.entries(byFunctionality).length,
            sample: Object.entries(byFunctionality).slice(0, 2)
        });
        
        // Se não houver dados de funcionalidade, mostrar mensagem
        if (Object.keys(byFunctionality).length === 0) {
            this.showNoDataMessage('chart-automation-by-functionality', 
                'Sem dados de funcionalidade', 
                'Nenhuma funcionalidade encontrada nos dados de evolução');
            return;
        }
        
        // Ordenar por total (maior para menor) e pegar top 10
        const sorted = Object.entries(byFunctionality)
            .sort((a, b) => {
                const totalA = a[1].total || 0;
                const totalB = b[1].total || 0;
                return totalB - totalA;
            })
            .slice(0, 10);

        const labels = sorted.map(([name]) => name.length > 25 ? name.substring(0, 25) + '...' : name);
        const automatedData = sorted.map(([, data]) => data.automated || 0);
        const pendingData = sorted.map(([, data]) => data.pending || 0);
        
        console.log('📊 Dados processados:', { labels, automatedData, pendingData, sorted: sorted.length });

        this.charts.automationByFunctionality = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: '✅ Automatizados',
                        data: automatedData,
                        backgroundColor: this.chartColors.success,
                        borderColor: this.chartColors.success,
                        borderWidth: 1
                    },
                    {
                        label: '⏳ Pendentes',
                        data: pendingData,
                        backgroundColor: this.chartColors.warning,
                        borderColor: this.chartColors.warning,
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                indexAxis: 'y',
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                const label = context.dataset.label || '';
                                const value = context.parsed.x;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const allData = context.chart.data.datasets.map(d => d.data[context.dataIndex]);
                                const funcTotal = allData.reduce((a, b) => a + b, 0);
                                const percentage = funcTotal > 0 ? ((value / funcTotal) * 100).toFixed(1) : 0;
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        stacked: true,
                        ticks: {
                            stepSize: 1
                        }
                    },
                    y: {
                        stacked: true
                    }
                }
            }
        });
    }

    /**
     * Gráfico de classificação de erros (TEST_CODE, SALESFORCE_BUG, ENVIRONMENT)
     */
    createErrorClassificationChart(executions) {
        const ctx = document.getElementById('chart-error-classification');
        if (!ctx) {
            console.warn('⚠️ Canvas chart-error-classification não encontrado');
            return;
        }

        if (this.charts['error-classification']) {
            this.charts['error-classification'].destroy();
        }

        if (!executions || executions.length === 0) {
            this.showNoDataMessage('chart-error-classification', 
                'Sem dados de execução', 
                'Execute testes para visualizar a classificação de erros');
            return;
        }

        this.hideNoDataMessage('chart-error-classification');

        // Agrupar por mês somando valores de erro
        const grouped = this.groupExecutionsByMonthSum(executions);
        
        // Formatar labels como mês/ano (ex: "01/2026")
        const labels = grouped.map(exec => {
            const date = new Date(exec.timestamp);
            return date.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
        });
        
        const testCodeData = grouped.map(exec => 
            exec.errorClassification?.testCode || 0
        );
        const salesforceBugData = grouped.map(exec => 
            exec.errorClassification?.salesforceBug || 0
        );
        const environmentData = grouped.map(exec => 
            exec.errorClassification?.environment || 0
        );
        const unknownData = grouped.map(exec => 
            exec.errorClassification?.unknown || 0
        );
        
        this.charts['error-classification'] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Código de Teste',
                        data: testCodeData,
                        backgroundColor: 'rgba(255, 99, 132, 0.6)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Bug Salesforce',
                        data: salesforceBugData,
                        backgroundColor: 'rgba(54, 162, 235, 0.6)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Ambiente',
                        data: environmentData,
                        backgroundColor: 'rgba(255, 206, 86, 0.6)',
                        borderColor: 'rgba(255, 206, 86, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Desconhecido',
                        data: unknownData,
                        backgroundColor: 'rgba(153, 102, 255, 0.6)',
                        borderColor: 'rgba(153, 102, 255, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        stacked: true
                    },
                    x: {
                        stacked: true
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Classificação de Erros por Tipo'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            title: function(context) {
                                return 'Mês: ' + context[0].label;
                            },
                            label: function(context) {
                                const label = context.dataset.label;
                                const value = context.parsed.y;
                                return label + ': ' + value + ' (total do mês)';
                            },
                            footer: function(context) {
                                return 'Valores somados de todas as execuções do mês';
                            }
                        }
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    }
                }
            }
        });
    }

    /**
     * Gráfico de funcionalidades testadas ao longo do tempo
     */
    createFunctionalitiesChart(executions) {
        const ctx = document.getElementById('chart-functionalities');
        if (!ctx) {
            console.warn('⚠️ Canvas chart-functionalities não encontrado');
            return;
        }

        if (this.charts['functionalities']) {
            this.charts['functionalities'].destroy();
        }

        if (!executions || executions.length === 0) {
            this.showNoDataMessage('chart-functionalities', 
                'Sem dados de execução', 
                'Execute testes para visualizar funcionalidades testadas');
            return;
        }

        this.hideNoDataMessage('chart-functionalities');

        // Coletar todas as funcionalidades únicas
        const allFunctionalities = new Set();
        executions.forEach(exec => {
            if (exec.functionalities && Array.isArray(exec.functionalities)) {
                exec.functionalities.forEach(func => allFunctionalities.add(func));
            }
        });
        
        const functionalitiesList = Array.from(allFunctionalities).sort();
        
        // Contar ocorrências por funcionalidade
        const functionalityCounts = {};
        functionalitiesList.forEach(func => {
            functionalityCounts[func] = executions.filter(exec => 
                exec.functionalities && exec.functionalities.includes(func)
            ).length;
        });
        
        // Ordenar por frequência
        const sorted = Object.entries(functionalityCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10); // Top 10
        
        this.charts['functionalities'] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sorted.map(([func]) => func),
                datasets: [{
                    label: 'Execuções',
                    data: sorted.map(([, count]) => count),
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                scales: {
                    x: {
                        beginAtZero: true
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Top 10 Funcionalidades Mais Testadas'
                    }
                }
            }
        });
    }

    /**
     * Gráfico comparando bugs reais do Salesforce vs problemas de ambiente/teste
     */
    createRealBugsVsEnvironmentChart(executions) {
        const ctx = document.getElementById('chart-real-bugs-vs-environment');
        if (!ctx) {
            console.warn('⚠️ Canvas chart-real-bugs-vs-environment não encontrado');
            return;
        }

        if (this.charts['real-bugs-vs-environment']) {
            this.charts['real-bugs-vs-environment'].destroy();
        }

        if (!executions || executions.length === 0) {
            this.showNoDataMessage('chart-real-bugs-vs-environment', 
                'Sem dados de execução', 
                'Execute testes para visualizar bugs reais vs problemas de ambiente');
            return;
        }

        this.hideNoDataMessage('chart-real-bugs-vs-environment');

        // Agrupar por mês somando valores
        const grouped = this.groupExecutionsByMonthSum(executions);
        
        // Formatar labels como mês/ano (ex: "01/2026")
        const labels = grouped.map(exec => {
            const date = new Date(exec.timestamp);
            return date.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
        });
        
        const realBugsData = grouped.map(exec => 
            exec.errorClassification?.salesforceBug || 0
        );
        const environmentIssuesData = grouped.map(exec => 
            (exec.errorClassification?.environment || 0) + 
            (exec.errorClassification?.testCode || 0)
        );
        
        this.charts['real-bugs-vs-environment'] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Bugs Reais (Salesforce)',
                        data: realBugsData,
                        borderColor: 'rgba(255, 99, 132, 1)',
                        backgroundColor: 'rgba(255, 99, 132, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Problemas Ambiente/Teste',
                        data: environmentIssuesData,
                        borderColor: 'rgba(54, 162, 235, 1)',
                        backgroundColor: 'rgba(54, 162, 235, 0.1)',
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Bugs Reais vs Problemas de Ambiente/Teste'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            title: function(context) {
                                return 'Mês: ' + context[0].label;
                            },
                            label: function(context) {
                                const label = context.dataset.label;
                                const value = context.parsed.y;
                                return label + ': ' + value + ' (total do mês)';
                            },
                            footer: function(context) {
                                return 'Valores somados de todas as execuções do mês';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#94a3b8'
                        },
                        grid: {
                            color: '#334155'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#94a3b8'
                        },
                        grid: {
                            color: '#334155'
                        }
                    }
                }
            }
        });
    }

    /**
     * Cria gráfico de velocidade de automação (testes automatizados por mês)
     */
    async createAutomationVelocityChart(evolutionData) {
        const ctx = document.getElementById('chart-automation-velocity');
        if (!ctx) {
            console.warn('⚠️ Canvas chart-automation-velocity não encontrado');
            return;
        }

        // Remover mensagem se houver dados
        this.hideNoDataMessage('chart-automation-velocity');

        // Destruir gráfico existente antes de criar novo
        if (this.charts['automation-velocity']) {
            try {
                this.charts['automation-velocity'].destroy();
            } catch (error) {
                console.warn('Erro ao destruir gráfico existente:', error);
            }
            this.charts['automation-velocity'] = null;
        }

        // Tentar carregar dados do CSV primeiro (sem bloquear se falhar)
        let csvData = null;
        try {
            csvData = await window.dataLoader.loadCSVRegressionData();
            console.log('CSV data loaded para velocidade de automação:', csvData ? 'success' : 'null');
        } catch (error) {
            console.warn('Erro ao carregar CSV (continuando com dados de evolução):', error);
            csvData = null;
        }

        // Priorizar dados do CSV se disponível (usa byAutomationMonth)
        if (csvData && csvData.byAutomationMonth && Object.keys(csvData.byAutomationMonth).length > 0) {
            const sortedDates = Object.keys(csvData.byAutomationMonth).sort();
            
            if (sortedDates.length === 0) {
                this.showNoDataMessage('chart-automation-velocity', 
                    'Sem dados de automação', 
                    'Não há dados de velocidade de automação disponíveis');
                return;
            }
            
            const labels = sortedDates.map(d => {
                const [year, month] = d.split('-');
                const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                return `${monthNames[parseInt(month) - 1]}/${year}`;
            });

            // Dados não acumulados - quantidade por mês
            const velocityData = sortedDates.map(date => {
                const monthAutomatedTests = csvData.byAutomationMonth[date] || [];
                return monthAutomatedTests.length;
            });

            console.log('Criando gráfico de velocidade de automação:', {
                labels: labels,
                velocityData: velocityData,
                totalAutomated: velocityData.reduce((a, b) => a + b, 0)
            });

            this.charts['automation-velocity'] = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Testes Automatizados',
                        data: velocityData,
                        borderColor: this.chartColors.success,
                        backgroundColor: 'rgba(34, 197, 94, 0.6)',
                        borderWidth: 2,
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { 
                            display: true,
                            position: 'top',
                            labels: {
                                usePointStyle: true,
                                padding: 15,
                                color: '#f1f5f9'
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const value = context.parsed.y;
                                    return `${context.dataset.label}: ${value} testes`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: { 
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Quantidade de Testes',
                                font: {
                                    size: 12,
                                    weight: 'bold'
                                },
                                color: '#f1f5f9'
                            },
                            ticks: {
                                stepSize: 1,
                                precision: 0,
                                color: '#94a3b8'
                            },
                            grid: {
                                color: '#334155'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Mês',
                                font: {
                                    size: 12,
                                    weight: 'bold'
                                },
                                color: '#f1f5f9'
                            },
                            ticks: {
                                color: '#94a3b8'
                            },
                            grid: {
                                color: '#334155'
                            }
                        }
                    }
                }
            });
            console.log('Gráfico de velocidade de automação criado com sucesso!');
            return;
        }

        // Fallback: usar dados de evolução se disponível
        if (!evolutionData) {
            this.showNoDataMessage('chart-automation-velocity', 
                'Sem dados de evolução', 
                'Execute o monitoramento de testes ou verifique o arquivo CSV para visualizar a velocidade de automação');
            return;
        }

        // Se não tem CSV, tentar usar dados de evolução (mas sem data de automatização específica)
        const tests = evolutionData.tests || [];
        const automatedTests = tests.filter(t => t.automated);
        
        if (automatedTests.length === 0) {
            this.showNoDataMessage('chart-automation-velocity', 
                'Sem testes automatizados', 
                'Não há testes automatizados para exibir');
            return;
        }

        // Agrupar por mês de criação (fallback - não ideal mas melhor que nada)
        const byMonth = {};
        automatedTests.forEach(test => {
            if (test.createdDate) {
                try {
                    const [day, month, year] = test.createdDate.split('/');
                    const key = `${year}-${month.padStart(2, '0')}`;
                    if (!byMonth[key]) {
                        byMonth[key] = [];
                    }
                    byMonth[key].push(test);
                } catch (e) {
                    // Ignorar erros de parsing
                }
            }
        });

        const sortedDates = Object.keys(byMonth).sort();
        const labels = sortedDates.map(d => {
            const [year, month] = d.split('-');
            const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
            return `${monthNames[parseInt(month) - 1]}/${year}`;
        });

        const velocityData = sortedDates.map(date => {
            return byMonth[date].length;
        });

        this.charts['automation-velocity'] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Testes Automatizados (por data de criação)',
                    data: velocityData,
                    borderColor: this.chartColors.success,
                    backgroundColor: 'rgba(34, 197, 94, 0.6)',
                    borderWidth: 2,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { 
                        display: true,
                        position: 'top',
                        labels: {
                            color: '#f1f5f9'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const value = context.parsed.y;
                                return `${context.dataset.label}: ${value} testes`;
                            }
                        }
                    }
                },
                scales: {
                    y: { 
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Quantidade de Testes',
                            font: {
                                size: 12,
                                weight: 'bold'
                            },
                            color: '#f1f5f9'
                        },
                        ticks: {
                            stepSize: 1,
                            precision: 0,
                            color: '#94a3b8'
                        },
                        grid: {
                            color: '#334155'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Mês',
                            font: {
                                size: 12,
                                weight: 'bold'
                            },
                            color: '#f1f5f9'
                        },
                        ticks: {
                            color: '#94a3b8'
                        },
                        grid: {
                            color: '#334155'
                        }
                    }
                }
            }
        });
    }

    /**
     * Atualiza todos os gráficos
     */
    updateAll(executions, evolutionData) {
        this.destroyAll();
        
        if (executions && executions.length > 0) {
            this.createSuccessEvolutionChart(executions);
            this.createBugsVsInstabilityChart(executions);
            this.createFailureDistributionChart(executions);
            this.createExecutionTimeChart(executions);
            this.createErrorClassificationChart(executions);
            this.createFunctionalitiesChart(executions);
            this.createRealBugsVsEnvironmentChart(executions);
        }
        
        if (evolutionData) {
            this.createTestEvolutionChart(evolutionData);
            this.createAutomationStatusChart(evolutionData);
            this.createAutomationByFunctionalityChart(evolutionData);
        }
    }

    /**
     * Atualiza gráficos da visão geral
     */
    async updateOverviewCharts(executions, evolutionData) {
        try {
            if (executions && executions.length > 0) {
                this.createOverviewSuccessChart(executions);
                this.createOverviewEnvironmentsChart(executions);
                this.createOverviewROIChart(executions);
                this.createOverviewSuccessByEnvChart(executions);
            }
            
            await this.createOverviewCreationTrendChart(evolutionData);
            await this.createAutomationVelocityChart(evolutionData);
        } catch (error) {
            console.error('Erro ao atualizar gráficos da visão geral:', error);
        }
    }

    /**
     * Cria gráfico consolidado de evolução de sucesso para visão geral
     */
    createOverviewSuccessChart(executions) {
        const ctx = document.getElementById('chart-overview-success');
        if (!ctx) {
            console.warn('⚠️ Canvas chart-overview-success não encontrado');
            return;
        }

        if (this.charts.overviewSuccess) {
            this.charts.overviewSuccess.destroy();
        }
        
        // Se não houver dados, mostrar mensagem
        if (!executions || executions.length === 0) {
            this.showNoDataMessage('chart-overview-success', 
                'Sem dados de execução', 
                'Execute testes para visualizar a evolução de sucesso');
            return;
        }
        
        // Remover mensagem se houver dados
        this.hideNoDataMessage('chart-overview-success');

        // Normalizar dados antes de agrupar
        const normalizedExecutions = executions.map(e => this.normalizeExecutionForChart({...e}));
        
        // Agrupar por mês do ano atual
        const grouped = this.groupExecutionsByMonth(normalizedExecutions);
        
        // Formatar labels como "Jan/2026", "Fev/2026", etc.
        const labels = grouped.map(e => {
            const date = new Date(e.timestamp);
            const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
            const monthName = monthNames[date.getMonth()];
            const year = date.getFullYear();
            return `${monthName}/${year}`;
        });
        
        const finalGrouped = grouped;

        // Verificar se há dados válidos
        if (labels.length === 0 || finalGrouped.length === 0) {
            this.showNoDataMessage('chart-overview-success', 
                'Sem dados de execução', 
                'Execute testes para visualizar a evolução de sucesso');
            return;
        }

        // Criar referência para usar no tooltip
        const chartData = {
            finalGrouped: finalGrouped,
            labels: labels
        };
        
        this.charts.overviewSuccess = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Taxa de Sucesso Real',
                        data: finalGrouped.map(e => e.successRate || 0),
                        borderColor: this.chartColors.primary,
                        backgroundColor: 'rgba(59, 130, 246, 0.2)',
                        tension: 0.4,
                        fill: true,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    },
                    {
                        label: 'Taxa de Sucesso Ajustada',
                        data: finalGrouped.map(e => e.adjustedSuccessRate || 0),
                        borderColor: this.chartColors.success,
                        backgroundColor: 'rgba(16, 185, 129, 0.2)',
                        tension: 0.4,
                        fill: true,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { 
                        display: true, 
                        position: 'top',
                        labels: {
                            color: '#f1f5f9',
                            usePointStyle: true
                        }
                    },
                    tooltip: { 
                        mode: 'index', 
                        intersect: false,
                        callbacks: {
                            title: function(context) {
                                const monthData = chartData.finalGrouped[context[0].dataIndex];
                                const execCount = monthData?.executionCount || 0;
                                return `Mês: ${context[0].label}${execCount > 1 ? ` (${execCount} execuções)` : ''}`;
                            },
                            label: function(context) {
                                const label = context.dataset.label;
                                const value = context.parsed.y.toFixed(2) + '%';
                                let explanation = '';
                                if (label === 'Taxa de Sucesso Real') {
                                    explanation = ' (sucesso bruto de todos os testes)';
                                } else if (label === 'Taxa de Sucesso Ajustada') {
                                    explanation = ' (remove bugs do Salesforce)';
                                }
                                return label + ': ' + value + explanation;
                            },
                            footer: function(context) {
                                const monthData = chartData.finalGrouped[context[0].dataIndex];
                                if (monthData) {
                                    return `Total: ${monthData.total || 0} testes | Passou: ${monthData.passed || 0} | Falhou: ${monthData.failed || 0}`;
                                }
                                return 'Taxa Real: todos os testes | Taxa Ajustada: remove bugs Salesforce';
                            }
                        }
                    }
                },
                scales: {
                    y: { 
                        beginAtZero: true, 
                        max: 100, 
                        ticks: { 
                            callback: v => v + '%',
                            color: '#94a3b8'
                        },
                        grid: {
                            color: '#334155'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#94a3b8'
                        },
                        grid: {
                            color: '#334155'
                        }
                    }
                }
            }
        });
    }

    /**
     * Cria gráfico de distribuição por ambiente
     */
    createOverviewEnvironmentsChart(executions) {
        const ctx = document.getElementById('chart-overview-environments');
        if (!ctx) {
            console.warn('⚠️ Canvas chart-overview-environments não encontrado');
            return;
        }
        
        // Se não houver dados, mostrar mensagem
        if (!executions || executions.length === 0) {
            this.showNoDataMessage('chart-overview-environments', 
                'Sem dados de execução', 
                'Execute testes para visualizar a distribuição por ambiente');
            return;
        }
        
        // Remover mensagem se houver dados
        this.hideNoDataMessage('chart-overview-environments');

        if (this.charts.overviewEnvironments) {
            this.charts.overviewEnvironments.destroy();
        }

        const envCounts = { qa: 0, stg: 0, prod: 0 };
        executions.forEach(e => {
            const env = (e.environment || 'qa').toLowerCase();
            if (envCounts.hasOwnProperty(env)) {
                envCounts[env]++;
            }
        });

        this.charts.overviewEnvironments = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['QA', 'STG', 'PROD'],
                datasets: [{
                    data: [envCounts.qa, envCounts.stg, envCounts.prod],
                    backgroundColor: [
                        this.chartColors.info,
                        this.chartColors.warning,
                        this.chartColors.danger
                    ],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: true, position: 'bottom' }
                }
            }
        });
    }

    /**
     * Cria gráfico de ROI de automação
     */
    createOverviewROIChart(executions) {
        const ctx = document.getElementById('chart-overview-roi');
        if (!ctx) {
            console.warn('⚠️ Canvas chart-overview-roi não encontrado');
            return;
        }
        
        // Se não houver dados, mostrar mensagem
        if (!executions || executions.length === 0) {
            this.showNoDataMessage('chart-overview-roi', 
                'Sem dados de execução', 
                'Execute testes para visualizar o ROI de automação');
            return;
        }
        
        // Remover mensagem se houver dados
        this.hideNoDataMessage('chart-overview-roi');

        if (this.charts.overviewROI) {
            this.charts.overviewROI.destroy();
        }

        // Consolidar todos os dados para visão geral
        const normalized = executions.map(e => this.normalizeExecutionForChart({...e}));
        
        let totalExecutionTime = 0;
        let totalTimeGained = 0;
        let totalTests = 0;
        let totalExecutions = normalized.length;
        
        normalized.forEach(exec => {
            let timeGained = exec.timeGained;
            if (!timeGained) {
                if (exec.durationManual && exec.duration) {
                    timeGained = exec.durationManual - exec.duration;
                } else if (exec.total && exec.duration) {
                    const estimatedManual = exec.total * 10 * 60 * 1000;
                    timeGained = estimatedManual - exec.duration;
                } else {
                    timeGained = 0;
                }
            }
            
            totalExecutionTime += exec.duration || exec.executionTime || 0;
            totalTimeGained += timeGained;
            totalTests += exec.total || exec.totalTests || 0;
        });

        const totalManualTime = totalExecutionTime + totalTimeGained;
        const totalROI = totalExecutionTime > 0 ? (totalTimeGained / totalExecutionTime) * 100 : 0;

        // Dados consolidados para o gráfico
        const consolidatedData = {
            executionTime: totalExecutionTime,
            timeGained: totalTimeGained,
            totalTests: totalTests,
            executionCount: totalExecutions,
            roi: totalROI
        };

        // Converter tempos para horas
        const timeInvestedHours = parseFloat((totalExecutionTime / (1000 * 60 * 60)).toFixed(2));
        const timeManualHours = parseFloat((totalManualTime / (1000 * 60 * 60)).toFixed(2));

        this.charts.overviewROI = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Visão Geral'],
                datasets: [
                    {
                        label: 'Tempo Investido (Automação)',
                        data: [timeInvestedHours],
                        backgroundColor: 'rgba(54, 162, 235, 0.8)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Tempo Manual Estimado (Sem Automação)',
                        data: [timeManualHours],
                        backgroundColor: 'rgba(255, 99, 132, 0.8)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { 
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 15,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        enabled: false // Desabilitar tooltip padrão, usar painel lateral
                    }
                },
                scales: {
                    y: { 
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Tempo (horas)',
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        },
                        ticks: { 
                            callback: function(value) {
                                return value.toFixed(1) + 'h';
                            }
                        }
                    },
                    x: {
                        title: {
                            display: false
                        }
                    }
                }
            }
        });

        // Inicializar painel com dados consolidados
        this.updateROIInfoPanel(consolidatedData, totalROI);
    }

    /**
     * Atualiza o painel de informações do ROI
     */
    updateROIInfoPanel(data, roi) {
        const panel = document.getElementById('roi-info-panel');
        if (!panel) return;

        const timeGainedFormatted = window.dataLoader.formatDuration(data.timeGained);
        const timeInvestedFormatted = window.dataLoader.formatDuration(data.executionTime);
        const estimatedManualTime = data.executionTime + data.timeGained;
        const estimatedManualTimeFormatted = window.dataLoader.formatDuration(estimatedManualTime);

        const timeGainedHours = data.timeGained / (1000 * 60 * 60);
        const timeInvestedHours = data.executionTime / (1000 * 60 * 60);
        const estimatedManualHours = estimatedManualTime / (1000 * 60 * 60);

        // Calcular diferença visual
        const timeSaved = estimatedManualTime - data.executionTime;
        const timeSavedFormatted = window.dataLoader.formatDuration(timeSaved);
        const timeSavedHours = timeSaved / (1000 * 60 * 60);

        // Interpretação do ROI
        let roiStatus = '';
        let roiStatusClass = '';
        let roiDescription = '';
        if (roi > 100) {
            const extraHours = ((roi - 100) / 100) * timeInvestedHours;
            roiStatus = `✓ Excelente - Economia de ${(roi - 100).toFixed(1)}%`;
            roiStatusClass = 'success';
            roiDescription = `Automação recuperou ${roi.toFixed(1)}% do tempo investido, economizando ${extraHours.toFixed(1)} horas extras além do investido.`;
        } else if (roi > 0) {
            const remainingHours = ((100 - roi) / 100) * timeInvestedHours;
            roiStatus = `✓ Positivo - Retorno de ${roi.toFixed(1)}%`;
            roiStatusClass = 'success';
            roiDescription = `Automação recuperou ${roi.toFixed(1)}% do tempo investido. Faltam ${remainingHours.toFixed(1)} horas para recuperar totalmente.`;
        } else {
            roiStatus = `⚠ Negativo - ROI de ${roi.toFixed(1)}%`;
            roiStatusClass = 'danger';
            roiDescription = `Automação ainda não recuperou o tempo investido. Considere otimizar os testes ou aumentar a frequência de execução.`;
        }

        panel.innerHTML = `
            <h4>Visão Geral</h4>
            
            <div class="roi-info-section">
                <div class="roi-info-section-title">📊 Comparação Visual</div>
                <div class="roi-info-item">
                    <span class="roi-info-label">Economia:</span>
                    <span class="roi-info-value success">${timeSavedFormatted} (${timeSavedHours.toFixed(2)}h)</span>
                </div>
                <div class="roi-info-item">
                    <span class="roi-info-label">ROI:</span>
                    <span class="roi-info-value ${roiStatusClass}">${roi.toFixed(1)}% ${roiStatus}</span>
                </div>
            </div>

            <div class="roi-info-section">
                <div class="roi-info-section-title">📈 Estatísticas Gerais</div>
                <div class="roi-info-item">
                    <span class="roi-info-label">Total de Execuções:</span>
                    <span class="roi-info-value">${data.executionCount}</span>
                </div>
                <div class="roi-info-item">
                    <span class="roi-info-label">Total de Testes:</span>
                    <span class="roi-info-value">${data.totalTests}</span>
                </div>
            </div>

            <div class="roi-info-section">
                <div class="roi-info-section-title">⏱️ Detalhamento de Tempo</div>
                <div class="roi-info-item">
                    <span class="roi-info-label">Tempo Investido:</span>
                    <span class="roi-info-value">${timeInvestedFormatted} (${timeInvestedHours.toFixed(2)}h)</span>
                </div>
                <div class="roi-info-item">
                    <span class="roi-info-label">Tempo Ganho:</span>
                    <span class="roi-info-value success">${timeGainedFormatted} (${timeGainedHours.toFixed(2)}h)</span>
                </div>
                <div class="roi-info-item">
                    <span class="roi-info-label">Tempo Manual Estimado:</span>
                    <span class="roi-info-value">${estimatedManualTimeFormatted} (${estimatedManualHours.toFixed(2)}h)</span>
                </div>
            </div>

            <div class="roi-info-section">
                <div class="roi-info-description">💡 ${roiDescription}</div>
            </div>
        `;
    }

    /**
     * Mostra placeholder no painel de informações do ROI
     */
    showROIPlaceholder() {
        const panel = document.getElementById('roi-info-panel');
        if (!panel) return;

        panel.innerHTML = `
            <div class="roi-info-placeholder">
                <p>Passe o mouse sobre um mês no gráfico para ver os detalhes</p>
            </div>
        `;
    }

    /**
     * Cria gráfico de tendência de criação
     */
    async createOverviewCreationTrendChart(evolutionData) {
        const ctx = document.getElementById('chart-overview-creation-trend');
        if (!ctx) {
            console.warn('⚠️ Canvas chart-overview-creation-trend não encontrado');
            return;
        }
        
        // Remover mensagem se houver dados
        this.hideNoDataMessage('chart-overview-creation-trend');

        // Destruir gráfico existente antes de criar novo
        if (this.charts.overviewCreationTrend) {
            try {
                this.charts.overviewCreationTrend.destroy();
            } catch (error) {
                console.warn('Erro ao destruir gráfico existente:', error);
            }
            this.charts.overviewCreationTrend = null;
        }

        // Tentar carregar dados do CSV primeiro (sem bloquear se falhar)
        let csvData = null;
        try {
            csvData = await window.dataLoader.loadCSVRegressionData();
            console.log('CSV data loaded:', csvData ? 'success' : 'null');
        } catch (error) {
            console.warn('Erro ao carregar CSV (continuando com dados de evolução):', error);
            csvData = null;
        }

        // Priorizar dados do CSV se disponível
        if (csvData && csvData.byMonth && Object.keys(csvData.byMonth).length > 0) {
            const sortedDates = Object.keys(csvData.byMonth).sort();
            
            console.log('Dados do CSV para gráfico:', {
                totalMonths: sortedDates.length,
                months: sortedDates,
                totalTests: csvData.totalTests,
                automatedTests: csvData.automatedTests,
                automationMonths: csvData.byAutomationMonth ? Object.keys(csvData.byAutomationMonth).length : 0
            });
            
            // Obter todos os meses únicos (criação + automatização)
            const allMonths = new Set([
                ...Object.keys(csvData.byMonth || {}),
                ...Object.keys(csvData.byAutomationMonth || {})
            ]);
            const sortedAllMonths = Array.from(allMonths).sort();
            
            // Usar sortedAllMonths se disponível, senão usar sortedDates
            const finalSortedDates = sortedAllMonths.length > 0 ? sortedAllMonths : sortedDates;
            
            if (finalSortedDates.length === 0) {
                this.showNoDataMessage('chart-overview-creation-trend', 
                    'Sem dados no CSV', 
                    'O arquivo CSV não contém dados de criação válidos');
                return;
            }
            
            const labels = finalSortedDates.map(d => {
                const [year, month] = d.split('-');
                const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                return `${monthNames[parseInt(month) - 1]}/${year}`;
            });
            
            // Calcular dados acumulados
            let totalAccumulated = 0;
            let automatedAccumulated = 0;
            
            // Total de Testes: agrupar por Data de criação
            const totalData = finalSortedDates.map(date => {
                const monthTests = csvData.byMonth[date] || [];
                totalAccumulated += monthTests.length;
                return totalAccumulated;
            });
            
            // Testes Automatizados: agrupar por Data da automatização (coluna AA)
            const automatedData = finalSortedDates.map(date => {
                const monthAutomatedTests = csvData.byAutomationMonth[date] || [];
                automatedAccumulated += monthAutomatedTests.length;
                return automatedAccumulated;
            });

            console.log('Criando gráfico com dados:', {
                labels: labels,
                totalData: totalData,
                automatedData: automatedData,
                labelsLength: labels.length,
                totalDataLength: totalData.length,
                automatedDataLength: automatedData.length,
                byAutomationMonth: csvData.byAutomationMonth ? Object.keys(csvData.byAutomationMonth).length : 0,
                usingAutomationDate: true
            });
            
            if (totalData.length === 0 || labels.length === 0) {
                console.error('Dados vazios para o gráfico!');
                this.showNoDataMessage('chart-overview-creation-trend', 
                    'Sem dados para exibir', 
                    'Os dados do CSV foram carregados mas não há valores para exibir no gráfico');
                return;
            }

            // Garantir que não há gráfico anterior
            if (this.charts.overviewCreationTrend) {
                try {
                    this.charts.overviewCreationTrend.destroy();
                } catch (e) {
                    console.warn('Erro ao destruir gráfico anterior:', e);
                }
                this.charts.overviewCreationTrend = null;
            }

            this.charts.overviewCreationTrend = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Total de Testes',
                            data: totalData,
                            borderColor: this.chartColors.primary,
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            tension: 0.4,
                            fill: true,
                            pointRadius: 4,
                            pointHoverRadius: 6
                        },
                        {
                            label: 'Testes Automatizados',
                            data: automatedData,
                            borderColor: this.chartColors.success,
                            backgroundColor: 'rgba(34, 197, 94, 0.1)',
                            tension: 0.4,
                            fill: true,
                            pointRadius: 4,
                            pointHoverRadius: 6
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { 
                            display: true,
                            position: 'top',
                            labels: {
                                usePointStyle: true,
                                padding: 15
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const label = context.dataset.label || '';
                                    const value = context.parsed.y;
                                    return `${label}: ${value} testes`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: { 
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Quantidade de Testes',
                                font: {
                                    size: 12,
                                    weight: 'bold'
                                }
                            },
                            ticks: {
                                stepSize: 1,
                                precision: 0
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Mês',
                                font: {
                                    size: 12,
                                    weight: 'bold'
                                }
                            }
                        }
                    }
                }
            });
            console.log('Gráfico criado com sucesso!');
            return;
        }

        // Fallback: usar dados de evolução se disponível
        if (!evolutionData) {
            // Se não tem CSV nem evolutionData, mostrar mensagem
            if (!csvData) {
                this.showNoDataMessage('chart-overview-creation-trend', 
                    'Sem dados de evolução', 
                    'Execute o monitoramento de testes ou verifique o arquivo CSV para visualizar a tendência de criação');
            }
            return;
        }

        // Garantir que não há gráfico anterior antes de criar novo
        if (this.charts.overviewCreationTrend) {
            try {
                this.charts.overviewCreationTrend.destroy();
            } catch (e) {
                console.warn('Erro ao destruir gráfico anterior:', e);
            }
            this.charts.overviewCreationTrend = null;
        }

        // Usar dados de evolução agrupados por mês
        const evolution = evolutionData.evolution || {};
        const tests = evolutionData.tests || [];
        
        // Ordenar datas
        const sortedDates = Object.keys(evolution).sort();
        
        // Se não houver dados de evolução por data, tentar criar a partir dos testes
        if (sortedDates.length === 0 && tests.length > 0) {
            // Agrupar testes por mês de criação (para Total de Testes)
            const byMonth = {};
            // Agrupar testes automatizados por mês de automatização (para Testes Automatizados)
            const byAutomationMonth = {};
            
            tests.forEach(test => {
                // Agrupar por Data de criação
                if (test.createdDate) {
                    try {
                        const [day, month, year] = test.createdDate.split('/');
                        const key = `${year}-${month.padStart(2, '0')}`;
                        if (!byMonth[key]) {
                            byMonth[key] = [];
                        }
                        byMonth[key].push(test);
                    } catch (e) {
                        // Ignorar erros de parsing
                    }
                }
                
                // Agrupar por Data da automatização (coluna AA) - apenas para testes automatizados
                if (test.automated && test.automationDate) {
                    try {
                        const [day, month, year] = test.automationDate.split('/');
                        const key = `${year}-${month.padStart(2, '0')}`;
                        if (!byAutomationMonth[key]) {
                            byAutomationMonth[key] = [];
                        }
                        byAutomationMonth[key].push(test);
                    } catch (e) {
                        // Ignorar erros de parsing
                    }
                }
            });
            
            // Obter todos os meses únicos (criação + automatização)
            const allMonths = new Set([
                ...Object.keys(byMonth),
                ...Object.keys(byAutomationMonth)
            ]);
            const finalSortedDates = Array.from(allMonths).sort();
            
            // Criar dados acumulados
            let totalAccumulated = 0;
            let automatedAccumulated = 0;
            
            // Total de Testes: agrupar por Data de criação
            const totalData = finalSortedDates.map(date => {
                const monthTests = byMonth[date] || [];
                totalAccumulated += monthTests.length;
                return totalAccumulated;
            });
            
            // Testes Automatizados: agrupar por Data da automatização (coluna AA)
            const automatedData = finalSortedDates.map(date => {
                const monthAutomatedTests = byAutomationMonth[date] || [];
                automatedAccumulated += monthAutomatedTests.length;
                return automatedAccumulated;
            });
            
            sortedDates.push(...finalSortedDates);
            
            const labels = finalSortedDates.map(d => {
                const [year, month] = d.split('-');
                const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                return `${monthNames[parseInt(month) - 1]}/${year}`;
            });

            // Garantir que não há gráfico anterior
            if (this.charts.overviewCreationTrend) {
                try {
                    this.charts.overviewCreationTrend.destroy();
                } catch (e) {
                    console.warn('Erro ao destruir gráfico anterior:', e);
                }
                this.charts.overviewCreationTrend = null;
            }

            this.charts.overviewCreationTrend = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Total de Testes',
                            data: totalData,
                            borderColor: this.chartColors.primary,
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            tension: 0.4,
                            fill: true,
                            pointRadius: 4,
                            pointHoverRadius: 6
                        },
                        {
                            label: 'Testes Automatizados',
                            data: automatedData,
                            borderColor: this.chartColors.success,
                            backgroundColor: 'rgba(34, 197, 94, 0.1)',
                            tension: 0.4,
                            fill: true,
                            pointRadius: 4,
                            pointHoverRadius: 6
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { 
                            display: true,
                            position: 'top',
                            labels: {
                                usePointStyle: true,
                                padding: 15
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const label = context.dataset.label || '';
                                    const value = context.parsed.y;
                                    return `${label}: ${value} testes`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: { 
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Quantidade de Testes',
                                font: {
                                    size: 12,
                                    weight: 'bold'
                                }
                            },
                            ticks: {
                                stepSize: 1,
                                precision: 0
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Mês',
                                font: {
                                    size: 12,
                                    weight: 'bold'
                                }
                            }
                        }
                    }
                }
            });
            return;
        }
        
        // Se não houver CSV, usar dados de evolução estruturados
        if (!evolutionData || !evolutionData.evolution) {
            console.warn('⚠️ Sem dados de evolução estruturados para gráfico de tendência de criação');
            this.showNoDataMessage('chart-overview-creation-trend', 
                'Sem dados disponíveis', 
                'Não há dados de evolução de testes disponíveis para exibir este gráfico');
            return;
        }

        const evolution = evolutionData.evolution || {};
        const sortedDates = Object.keys(evolution).sort();
        
        if (sortedDates.length === 0) {
            console.warn('⚠️ Sem datas disponíveis no objeto evolution');
            this.showNoDataMessage('chart-overview-creation-trend', 
                'Sem dados disponíveis', 
                'Não há dados de evolução de testes por mês disponíveis');
            return;
        }

        const labels = sortedDates.map(d => {
            const [year, month] = d.split('-');
            const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
            return `${monthNames[parseInt(month) - 1]}/${year}`;
        });

        // Calcular dados acumulados
        let totalAccumulated = 0;
        let automatedAccumulated = 0;
        
        const totalData = sortedDates.map(date => {
            const monthTests = evolution[date];
            // Garantir que monthTests é um array
            const testsArray = Array.isArray(monthTests) ? monthTests : [];
            totalAccumulated += testsArray.length;
            return totalAccumulated;
        });
        
        const automatedData = sortedDates.map(date => {
            const monthTests = evolution[date];
            // Garantir que monthTests é um array
            const testsArray = Array.isArray(monthTests) ? monthTests : [];
            const automated = testsArray.filter(t => t && t.automated).length;
            automatedAccumulated += automated;
            return automatedAccumulated;
        });

        // Garantir que não há gráfico anterior
        if (this.charts.overviewCreationTrend) {
            try {
                this.charts.overviewCreationTrend.destroy();
            } catch (e) {
                console.warn('Erro ao destruir gráfico anterior:', e);
            }
            this.charts.overviewCreationTrend = null;
        }

        this.charts.overviewCreationTrend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Total de Testes',
                        data: totalData,
                        borderColor: this.chartColors.primary,
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.4,
                        fill: true,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    },
                    {
                        label: 'Testes Automatizados',
                        data: automatedData,
                        borderColor: this.chartColors.success,
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        tension: 0.4,
                        fill: true,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { 
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 15
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const label = context.dataset.label || '';
                                const value = context.parsed.y;
                                return `${label}: ${value} testes`;
                            }
                        }
                    }
                },
                scales: {
                    y: { 
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Quantidade de Testes',
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            stepSize: 1,
                            precision: 0
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Mês',
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Cria gráfico de taxa de sucesso por ambiente
     */
    createOverviewSuccessByEnvChart(executions) {
        const ctx = document.getElementById('chart-overview-success-by-env');
        if (!ctx) {
            console.warn('⚠️ Canvas chart-overview-success-by-env não encontrado');
            return;
        }
        
        // Se não houver dados, mostrar mensagem
        if (!executions || executions.length === 0) {
            this.showNoDataMessage('chart-overview-success-by-env', 
                'Sem dados de execução', 
                'Execute testes para visualizar a taxa de sucesso por ambiente');
            return;
        }
        
        // Remover mensagem se houver dados
        this.hideNoDataMessage('chart-overview-success-by-env');

        if (this.charts.overviewSuccessByEnv) {
            this.charts.overviewSuccessByEnv.destroy();
        }

        const envData = { qa: [], stg: [], prod: [] };
        executions.forEach(e => {
            const env = (e.environment || 'qa').toLowerCase();
            if (envData.hasOwnProperty(env)) {
                envData[env].push(e);
            }
        });

        const calculateAvg = (arr) => {
            if (arr.length === 0) return 0;
            const sum = arr.reduce((acc, e) => acc + (e.successRate || 0), 0);
            return parseFloat((sum / arr.length).toFixed(2));
        };

        this.charts.overviewSuccessByEnv = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['QA', 'STG', 'PROD'],
                datasets: [{
                    label: 'Taxa de Sucesso Média (%)',
                    data: [
                        calculateAvg(envData.qa),
                        calculateAvg(envData.stg),
                        calculateAvg(envData.prod)
                    ],
                    backgroundColor: [
                        this.chartColors.info,
                        this.chartColors.warning,
                        this.chartColors.danger
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } }
                }
            }
        });
    }

    /**
     * Cria gráfico de cobertura por objeto
     */
    createCoverageByObjectChart(coverageReport) {
        const ctx = document.getElementById('chart-coverage-by-object');
        if (!ctx) {
            console.warn('⚠️ Canvas chart-coverage-by-object não encontrado');
            return;
        }
        
        // Garantir que o canvas tenha altura adequada para evitar quebra de linha
        const container = ctx.closest('.chart-container');
        if (container) {
            container.style.minHeight = '500px';
        }
        
        // Se não houver dados, mostrar mensagem
        if (!coverageReport) {
            this.showNoDataMessage('chart-coverage-by-object', 
                'Sem dados de cobertura', 
                'Gere relatório de cobertura para visualizar cobertura por objeto');
            return;
        }
        
        // Remover mensagem se houver dados
        this.hideNoDataMessage('chart-coverage-by-object');

        if (this.charts.coverageByObject) {
            this.charts.coverageByObject.destroy();
        }
        
        // Filtrar objetos da lista base
        // MOSTRAR objetos que têm cenários de teste OU métricas no Brain
        // (objetos com testes devem aparecer mesmo sem métricas no Brain)
        const baseObjects = (coverageReport.objects || []).filter(obj => {
            // Verificar métricas disponíveis
            const totalFlows = (obj.totalActiveFlows || 0);
            const totalActions = (obj.totalActions || 0);
            const totalFields = (obj.totalFieldsInUse || 0);
            const totalValidationRules = (obj.totalActiveValidationRules || 0);
            const totalRecordTypes = (obj.totalActiveRecordTypes || 0);
            const scenariosCovered = (obj.scenariosCovered || 0);
            const scenariosNotCovered = (obj.scenariosNotCovered || 0);
            const totalScenarios = scenariosCovered + scenariosNotCovered;
            
            // Verificar se há pelo menos uma métrica disponível (flows, ações, campos, etc.)
            const hasAnyMetric = totalFlows > 0 || totalActions > 0 || totalFields > 0 || 
                                 totalValidationRules > 0 || totalRecordTypes > 0;
            
            // Verificar se há cenários de teste (cobertos ou não cobertos)
            const hasScenarios = totalScenarios > 0;
            
            // Verificar se há cobertura > 0
            const hasCoverage = (obj.coveragePercentage || 0) > 0;
            
            // Objeto deve aparecer se:
            // 1. Tem métricas disponíveis E (tem cenários OU cobertura > 0) OU
            // 2. Tem cenários de teste (mesmo sem métricas no Brain - indica que há testes)
            return (hasAnyMetric && (hasScenarios || hasCoverage)) || hasScenarios;
        });
        
        if (baseObjects.length === 0) {
            this.showNoDataMessage('chart-coverage-by-object', 
                'Sem dados de cobertura', 
                'Não há dados de cobertura para os objetos da lista base');
            return;
        }
        
        // Ajustar altura do container baseado no número de objetos
        if (container) {
            const estimatedHeight = Math.max(450, baseObjects.length * 45 + 150);
            container.style.minHeight = estimatedHeight + 'px';
        }
        
        const sortedObjects = [...baseObjects].sort((a, b) => b.coveragePercentage - a.coveragePercentage);
        const objects = sortedObjects.slice(0, 15); // Top 15
        
        // Criar labels sem quebra de linha - usar nome completo ou truncar sem quebrar
        // IMPORTANTE: Manter nomes em uma única linha para evitar quebra visual
        const labels = objects.map(o => {
            const name = o.objectName || '';
            // Remover qualquer quebra de linha existente
            const cleanName = name.replace(/\n/g, ' ').replace(/\r/g, '').trim();
            // Se o nome for muito longo, truncar mas manter em uma linha
            // Usar limite maior para gráficos horizontais (eixo Y tem mais espaço)
            if (cleanName.length > 35) {
                return cleanName.substring(0, 32) + '...';
            }
            return cleanName;
        });
        const coverageData = objects.map(o => o.coveragePercentage);
        
        // Criar referência aos objetos para uso nos callbacks do tooltip
        // IMPORTANTE: Manter referência para que os callbacks possam acessar os dados corretos
        const chartDataRef = {
            objects: objects,
            labels: labels,
            coverageData: coverageData
        };

        this.charts.coverageByObject = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Cobertura (%)',
                    data: coverageData,
                    backgroundColor: coverageData.map(c => 
                        c >= 80 ? this.chartColors.success :
                        c >= 50 ? this.chartColors.warning :
                        this.chartColors.danger
                    ),
                    borderWidth: 1,
                    barThickness: 'flex',
                    maxBarThickness: 40
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                aspectRatio: 1.8,
                interaction: {
                    mode: 'point',
                    intersect: true
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        align: 'center',
                        labels: {
                            generateLabels: () => [
                                {
                                    text: '≥ 80% (Bom)',
                                    fillStyle: this.chartColors.success,
                                    strokeStyle: this.chartColors.success,
                                    lineWidth: 2,
                                    fontColor: '#e2e8f0'
                                },
                                {
                                    text: '50-79% (Regular)',
                                    fillStyle: this.chartColors.warning,
                                    strokeStyle: this.chartColors.warning,
                                    lineWidth: 2,
                                    fontColor: '#e2e8f0'
                                },
                                {
                                    text: '< 50% (Baixo)',
                                    fillStyle: this.chartColors.danger,
                                    strokeStyle: this.chartColors.danger,
                                    lineWidth: 2,
                                    fontColor: '#e2e8f0'
                                }
                            ],
                            color: '#e2e8f0',
                            font: {
                                size: 14,
                                weight: '500',
                                family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif'
                            },
                            padding: 18,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            boxWidth: 16,
                            boxHeight: 16,
                            boxPadding: 10
                        },
                        onClick: null, // Desabilitar clique para não ocultar dados
                        onHover: (e, legendItem) => {
                            if (e.native && e.native.target) {
                                e.native.target.style.cursor = 'default';
                            }
                        },
                        onLeave: (e, legendItem) => {
                            if (e.native && e.native.target) {
                                e.native.target.style.cursor = 'default';
                            }
                        }
                    },
                    tooltip: {
                        enabled: true,
                        mode: 'point',
                        intersect: true,
                        position: 'nearest',
                        backgroundColor: '#1e293b',
                        borderColor: '#334155',
                        titleColor: '#f1f5f9',
                        bodyColor: '#cbd5e1',
                        borderWidth: 1,
                        padding: 14,
                        titleFont: {
                            size: 14,
                            weight: 'bold'
                        },
                        bodyFont: {
                            size: 12
                        },
                        animation: {
                            duration: 150
                        },
                        displayColors: false,
                        callbacks: {
                            title: function(context) {
                                // Para gráficos horizontais (indexAxis: 'y'), o dataIndex está em context[0].dataIndex
                                const tooltipContext = Array.isArray(context) ? context[0] : context;
                                const dataIndex = tooltipContext?.dataIndex ?? 0;
                                const object = chartDataRef.objects[dataIndex];
                                
                                if (object) {
                                    const percentage = tooltipContext?.parsed?.x ?? chartDataRef.coverageData[dataIndex] ?? 0;
                                    return `📊 ${object.objectName}: ${percentage.toFixed(1)}% de Cobertura`;
                                }
                                return 'Cobertura de Testes Regressivos';
                            },
                            label: function(context) {
                                // Obter o índice correto do objeto
                                // Para gráficos horizontais, dataIndex está diretamente no context
                                const dataIndex = context.dataIndex ?? 0;
                                const object = chartDataRef.objects[dataIndex];
                                
                                if (!object) {
                                    const label = chartDataRef.labels[dataIndex] || 'Desconhecido';
                                    const percentage = context.parsed?.x ?? chartDataRef.coverageData[dataIndex] ?? 0;
                                    return `${label}: ${percentage.toFixed(1)}%`;
                                }
                                
                                const flowsTotal = (object.totalActiveFlows || 0);
                                const actionsTotal = (object.totalActions || 0);
                                const fieldsTotal = (object.totalFieldsInUse || 0);
                                const validationRulesTotal = (object.totalActiveValidationRules || 0);
                                const recordTypesTotal = (object.totalActiveRecordTypes || 0);
                                const scenariosTotal = (object.scenariosCovered || 0) + (object.scenariosNotCovered || 0);
                                
                                const details = [];
                                
                                // Adicionar métricas apenas se houver dados
                                if (flowsTotal > 0) {
                                    details.push(`🌊 Flows: ${object.flowsCovered || 0}/${flowsTotal} cobertos`);
                                }
                                if (actionsTotal > 0) {
                                    details.push(`⚙️ Ações: ${object.actionsCovered || 0}/${actionsTotal} cobertas`);
                                }
                                if (fieldsTotal > 0) {
                                    details.push(`📝 Campos: ${object.fieldsCovered || 0}/${fieldsTotal} cobertos`);
                                }
                                if (validationRulesTotal > 0) {
                                    details.push(`✅ Regras de Validação: ${object.validationRulesCovered || 0}/${validationRulesTotal} cobertas`);
                                }
                                if (recordTypesTotal > 0) {
                                    details.push(`📋 Record Types: ${object.recordTypesCovered || 0}/${recordTypesTotal} cobertos`);
                                }
                                if (scenariosTotal > 0) {
                                    details.push(`🧪 Cenários: ${object.scenariosCovered || 0}/${scenariosTotal} cobertos`);
                                }
                                
                                // Se não há nenhuma métrica, mostrar aviso
                                if (details.length === 0) {
                                    details.push('⚠️ Nenhuma métrica disponível para este objeto');
                                    details.push('   (Sem flows ativos, campos em uso ou regras ativas)');
                                    if (scenariosTotal > 0) {
                                        details.push(`   ⚠️ Detectados ${scenariosTotal} cenários, mas podem ser falsos positivos`);
                                    }
                                }
                                
                                // Adicionar nota explicativa
                                details.push('');
                                details.push('ℹ️ Base: flows ativos, campos em uso, regras ativas e testes com tag @Regressão');
                                
                                return details;
                            },
                            afterBody: function(context) {
                                // Obter o índice correto do objeto
                                const tooltipContext = Array.isArray(context) ? context[0] : context;
                                const dataIndex = tooltipContext?.dataIndex ?? 0;
                                const object = chartDataRef.objects[dataIndex];
                                if (!object) return '';
                                
                                // Verificar se há inconsistências
                                const flowsTotal = (object.totalActiveFlows || 0);
                                const actionsTotal = (object.totalActions || 0);
                                const fieldsTotal = (object.totalFieldsInUse || 0);
                                const validationRulesTotal = (object.totalActiveValidationRules || 0);
                                const recordTypesTotal = (object.totalActiveRecordTypes || 0);
                                const scenariosTotal = (object.scenariosCovered || 0) + (object.scenariosNotCovered || 0);
                                
                                const hasRealMetrics = flowsTotal > 0 || actionsTotal > 0 || fieldsTotal > 0 || 
                                                      validationRulesTotal > 0 || recordTypesTotal > 0;
                                
                                // Se tem cenários mas não tem flows/outras métricas, avisar
                                if (scenariosTotal > 0 && !hasRealMetrics) {
                                    return '\n⚠️ Atenção: Este objeto tem cenários mas não possui flows ativos ou outras métricas no Brain. Pode ser detecção incorreta.';
                                }
                                
                                // Se não tem nenhuma métrica nem cenários, avisar
                                if (!hasRealMetrics && scenariosTotal === 0) {
                                    return '\nℹ️ Este objeto não possui métricas disponíveis no Brain (sem flows ativos, campos em uso ou regras ativas).';
                                }
                                
                                return '';
                            }
                        }
                    }
                },
                scales: {
                    x: { 
                        beginAtZero: true, 
                        max: 100, 
                        ticks: { 
                            callback: v => v + '%',
                            font: {
                                size: 12
                            }
                        } 
                    },
                    y: {
                        ticks: {
                            font: {
                                size: 13,
                                lineHeight: 1.0
                            },
                            maxRotation: 0,
                            minRotation: 0,
                            autoSkip: false,
                            padding: 12,
                            mirror: false,
                            callback: function(value, index) {
                                const label = this.getLabelForValue(value);
                                // Garantir que o label não quebre - usar nome completo ou truncar adequadamente
                                // IMPORTANTE: Retornar string sem quebras de linha
                                if (label && typeof label === 'string') {
                                    const cleanLabel = label.replace(/\n/g, ' ').replace(/\r/g, '');
                                    if (cleanLabel.length > 35) {
                                        return cleanLabel.substring(0, 32) + '...';
                                    }
                                    return cleanLabel;
                                }
                                return label || '';
                            }
                        },
                        afterFit: function(scale) {
                            // Ajustar altura mínima para evitar compressão excessiva
                            const minHeight = objects.length * 50;
                            if (scale.height < minHeight) {
                                scale.height = minHeight;
                            }
                            // Garantir largura mínima para o eixo Y (labels não quebrem)
                            if (scale.width < 180) {
                                scale.width = 180;
                            }
                        },
                        afterUpdate: function(scale) {
                            // Garantir que labels não quebrem após atualização
                            scale.ticks.forEach((tick, index) => {
                                if (tick.label && typeof tick.label === 'string') {
                                    tick.label = tick.label.replace(/\n/g, ' ').replace(/\r/g, '');
                                }
                            });
                        }
                    }
                },
                layout: {
                    padding: {
                        left: 15,
                        right: 10,
                        top: 10,
                        bottom: 10
                    }
                }
            }
        });
    }

    /**
     * Cria gráfico de gaps de cobertura
     */
    createCoverageGapsChart(coverageReport) {
        const ctx = document.getElementById('chart-coverage-gaps');
        if (!ctx) {
            console.warn('⚠️ Canvas chart-coverage-gaps não encontrado');
            return;
        }
        
        // Se não houver dados, mostrar mensagem
        if (!coverageReport) {
            this.showNoDataMessage('chart-coverage-gaps', 
                'Sem dados de cobertura', 
                'Gere relatório de cobertura para visualizar gaps');
            return;
        }
        
        // Remover mensagem se houver dados
        this.hideNoDataMessage('chart-coverage-gaps');

        if (this.charts.coverageGaps) {
            this.charts.coverageGaps.destroy();
        }

        const topGaps = window.coverageAnalyzer.identifyTopGaps(coverageReport, 10);
        
        // Filtrar apenas gaps com dados (totalGaps > 0)
        const gapsWithData = topGaps.filter(g => g.totalGaps > 0);
        
        if (gapsWithData.length === 0) {
            this.showNoDataMessage('chart-coverage-gaps', 
                'Sem gaps de cobertura', 
                'Não há gaps de cobertura identificados para os objetos da lista base');
            return;
        }
        
        const labels = gapsWithData.map(g => g.object.length > 20 ? g.object.substring(0, 20) + '...' : g.object);
        const gapsData = gapsWithData.map(g => g.totalGaps);

        this.charts.coverageGaps = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Gaps de Cobertura',
                    data: gapsData,
                    backgroundColor: this.chartColors.danger,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                indexAxis: 'y',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: true,
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: (context) => {
                                const gap = topGaps[context.dataIndex];
                                if (gap) {
                                    return `${gap.object}: ${context.parsed.x} gaps`;
                                }
                                return `${labels[context.dataIndex]}: ${context.parsed.x} gaps`;
                            }
                        }
                    }
                },
                scales: {
                    x: { beginAtZero: true }
                }
            }
        });
    }

    /**
     * Cria gráfico de cobertura por Record Type (por objeto)
     * Mostra barras horizontais com Record Types cobertos vs não cobertos por objeto
     */
    createCoverageByRecordTypeChart(coverageReport) {
        const ctx = document.getElementById('chart-coverage-by-record-type');
        if (!ctx) {
            console.warn('⚠️ Canvas chart-coverage-by-record-type não encontrado');
            return;
        }
        
        // Se não houver dados, mostrar mensagem
        if (!coverageReport) {
            this.showNoDataMessage('chart-coverage-by-record-type', 
                'Sem dados de cobertura', 
                'Gere relatório de cobertura para visualizar cobertura por Record Type');
            return;
        }
        
        // Remover mensagem se houver dados
        this.hideNoDataMessage('chart-coverage-by-record-type');

        if (this.charts.coverageByRecordType) {
            this.charts.coverageByRecordType.destroy();
        }

        // Filtrar objetos que têm Record Types
        const objectsWithRecordTypes = (coverageReport.objects || []).filter(obj => {
            const total = (obj.totalActiveRecordTypes || 0);
            return total > 0;
        });
        
        // Se não há objetos com Record Types, mostrar mensagem
        if (objectsWithRecordTypes.length === 0) {
            this.showNoDataMessage('chart-coverage-by-record-type', 
                'Sem dados de Record Types', 
                'Nenhum Record Type ativo encontrado nos objetos da lista base');
            return;
        }
        
        // Ordenar por total de Record Types (maior primeiro)
        const sortedObjects = [...objectsWithRecordTypes].sort((a, b) => {
            const totalA = (a.totalActiveRecordTypes || 0);
            const totalB = (b.totalActiveRecordTypes || 0);
            return totalB - totalA;
        });
        
        // Preparar dados para o gráfico
        const labels = sortedObjects.map(obj => obj.objectName || 'Desconhecido');
        const coveredData = sortedObjects.map(obj => obj.recordTypesCovered || 0);
        const notCoveredData = sortedObjects.map(obj => obj.recordTypesNotCovered || 0);
        const totalData = sortedObjects.map(obj => obj.totalActiveRecordTypes || 0);
        
        // Calcular porcentagem de cobertura por objeto
        const coveragePercentages = sortedObjects.map(obj => {
            const total = obj.totalActiveRecordTypes || 0;
            const covered = obj.recordTypesCovered || 0;
            return total > 0 ? Math.round((covered / total) * 100) : 0;
        });

        this.charts.coverageByRecordType = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Coberto',
                        data: coveredData,
                        backgroundColor: this.chartColors.success,
                        borderWidth: 1
                    },
                    {
                        label: 'Não Coberto',
                        data: notCoveredData,
                        backgroundColor: this.chartColors.danger,
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                aspectRatio: 1.5,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: '#e2e8f0',
                            font: {
                                size: 12,
                                weight: '500'
                            },
                            padding: 12,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            boxWidth: 12,
                            boxHeight: 12
                        }
                    },
                    tooltip: {
                        enabled: true,
                        mode: 'index',
                        intersect: false,
                        backgroundColor: '#1e293b',
                        borderColor: '#334155',
                        titleColor: '#f1f5f9',
                        bodyColor: '#cbd5e1',
                        borderWidth: 1,
                        padding: 12,
                        callbacks: {
                            title: (context) => {
                                const index = context[0].dataIndex;
                                const obj = sortedObjects[index];
                                return `📋 ${obj.objectName}: ${coveragePercentages[index]}% de Cobertura`;
                            },
                            label: (context) => {
                                const index = context.dataIndex;
                                const datasetLabel = context.dataset.label;
                                const value = context.parsed.x;
                                const total = totalData[index];
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return `${datasetLabel}: ${value} de ${total} Record Types (${percentage}%)`;
                            },
                            afterBody: (context) => {
                                const index = context[0].dataIndex;
                                const obj = sortedObjects[index];
                                const total = obj.totalActiveRecordTypes || 0;
                                const covered = obj.recordTypesCovered || 0;
                                const notCovered = obj.recordTypesNotCovered || 0;
                                
                                if (total === 0) {
                                    return '\n⚠️ Nenhum Record Type ativo encontrado';
                                }
                                
                                return [
                                    '',
                                    `Total: ${total} Record Types ativos`,
                                    `Cobertos: ${covered}`,
                                    `Não cobertos: ${notCovered}`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        beginAtZero: true,
                        ticks: {
                            color: '#94a3b8',
                            font: {
                                size: 11
                            },
                            callback: function(value) {
                                return value;
                            }
                        },
                        grid: {
                            color: '#334155'
                        }
                    },
                    y: {
                        stacked: true,
                        ticks: {
                            color: '#94a3b8',
                            font: {
                                size: 11
                            },
                            maxRotation: 0,
                            minRotation: 0,
                            autoSkip: false
                        },
                        grid: {
                            color: '#334155',
                            display: false
                        }
                    }
                }
            }
        });
    }

    /**
     * Cria gráfico de evolução de cobertura
     */
    createCoverageEvolutionChart(coverageReport) {
        const ctx = document.getElementById('chart-coverage-evolution');
        if (!ctx) {
            console.warn('⚠️ Canvas chart-coverage-evolution não encontrado');
            return;
        }
        
        // Se não houver dados, mostrar mensagem
        if (!coverageReport) {
            this.showNoDataMessage('chart-coverage-evolution', 
                'Sem dados de cobertura', 
                'Gere relatório de cobertura para visualizar evolução');
            return;
        }
        
        // Remover mensagem se houver dados
        this.hideNoDataMessage('chart-coverage-evolution');

        if (this.charts.coverageEvolution) {
            this.charts.coverageEvolution.destroy();
        }

        // Simplificado - usar dados atuais
        const current = coverageReport.summary?.coveragePercentage || 0;
        const target = 80;

        this.charts.coverageEvolution = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Cobertura Atual', 'Meta (80%)'],
                datasets: [{
                    label: 'Cobertura (%)',
                    data: [current, target],
                    borderColor: this.chartColors.primary,
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: true,
                        callbacks: {
                            title: () => 'Evolução de Cobertura (Testes Regressivos)',
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed.y.toFixed(1);
                                if (label.includes('Meta')) {
                                    return [
                                        `Meta de Cobertura: ${value}%`,
                                        `(Objetivo: 80% de cobertura com testes regressivos)`
                                    ];
                                }
                                return [
                                    `Cobertura Atual: ${value}%`,
                                    `(Baseado em testes com tag @Regressão, flows ativos e objetos da lista base)`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } }
                }
            }
        });
    }

    /**
     * Cria gráfico de evolução do Brain
     * Mostra múltiplas métricas: objetos mapeados, regras de negócio e completude média
     */
    createBrainEvolutionChart(projectMetrics) {
        const ctx = document.getElementById('chart-brain-evolution');
        if (!ctx) {
            console.warn('⚠️ Canvas chart-brain-evolution não encontrado');
            return;
        }

        if (this.charts.brainEvolution) {
            this.charts.brainEvolution.destroy();
        }

        const evolution = projectMetrics?.temporalEvolution || {};
        const metricsByMonth = evolution.metricsByMonth || [];
        const summary = projectMetrics?.summary || {};
        const currentCompleteness = summary.averageCompleteness || 0;
        const currentBusinessRules = summary.businessRulesCount || 0;
        const currentObjects = summary.totalObjects || 0;
        
        console.log('📊 createBrainEvolutionChart - Dados recebidos:', {
            metricsByMonth: metricsByMonth.length,
            currentCompleteness,
            currentBusinessRules,
            currentObjects,
            metricsByMonthData: metricsByMonth
        });
        
        // Se não houver dados, mostrar mensagem
        if (metricsByMonth.length === 0) {
            console.warn('⚠️ createBrainEvolutionChart: Sem dados de evolução');
            this.showNoDataMessage('chart-brain-evolution', 
                'Sem dados do Brain', 
                'Gere métricas do Brain para visualizar a evolução');
            return;
        }
        
        // Remover mensagem se houver dados
        this.hideNoDataMessage('chart-brain-evolution');
        
        // Preparar labels e dados
        const labels = metricsByMonth.map(m => m.monthLabel);
        
        // Dados de objetos acumulados
        const objectsData = metricsByMonth.map(m => m.totalObjects || 0);
        
        // Dados de regras de negócio acumuladas
        const businessRulesData = metricsByMonth.map(m => m.totalBusinessRules || 0);
        
        console.log('📊 createBrainEvolutionChart - Dados preparados:', {
            labels,
            objectsData,
            businessRulesData,
            maxObjects: Math.max(...objectsData, 0),
            maxRules: Math.max(...businessRulesData, 0)
        });
        
        // Dados de completude média
        // Se houver apenas um mês ou poucos dados, usar valor atual
        // Caso contrário, estimar baseado em objetos acumulados
        const completenessData = metricsByMonth.length === 1 
            ? [currentCompleteness]
            : metricsByMonth.map((m, index) => {
                // Se não há objetos ainda, completude é 0
                if (m.totalObjects === 0) {
                    return 0;
                }
                // Estimar completude baseado em objetos acumulados
                // Completude tende a aumentar com mais objetos mapeados
                // Usar progressão linear baseada na proporção de objetos
                const progressRatio = currentObjects > 0 ? (m.totalObjects / currentObjects) : 0;
                // Aplicar progressão não-linear (começa mais rápido, depois desacelera)
                const estimatedCompleteness = Math.min(100, Math.round(currentCompleteness * Math.pow(progressRatio, 0.7)));
                return estimatedCompleteness;
            });
        
        // Meta de completude (80%)
        const completenessTarget = 80;
        const targetData = labels.map(() => completenessTarget);
        
        // Calcular crescimento percentual para tooltips
        const calculateGrowth = (current, previous) => {
            if (!previous || previous === 0) return null;
            const growth = ((current - previous) / previous) * 100;
            return growth > 0 ? `+${growth.toFixed(1)}%` : `${growth.toFixed(1)}%`;
        };

        // Garantir que temos dados válidos
        if (objectsData.length === 0 && businessRulesData.length === 0) {
            console.warn('⚠️ createBrainEvolutionChart: Sem dados válidos para renderizar');
            this.showNoDataMessage('chart-brain-evolution', 
                'Sem dados do Brain', 
                'Gere métricas do Brain para visualizar a evolução');
            return;
        }
        
        console.log('✅ createBrainEvolutionChart - Criando gráfico com:', {
            datasets: 4,
            labels: labels.length,
            objectsData,
            businessRulesData,
            completenessData
        });

        // Atualizar seção de detalhes abaixo do gráfico com o último mês disponível
        this.updateBrainEvolutionDetails(metricsByMonth, completenessData);

        // Adicionar evento de hover para atualizar detalhes abaixo do gráfico
        const detailsContainer = document.getElementById('brain-evolution-details');
        const monthLabelEl = document.getElementById('brain-evolution-month-label');
        const objectsDetailsEl = document.getElementById('brain-evolution-objects-details');
        const rulesDetailsEl = document.getElementById('brain-evolution-rules-details');
        
        const updateDetailsOnHover = (index) => {
            if (!detailsContainer || !monthLabelEl || !objectsDetailsEl || !rulesDetailsEl) return;
            if (index < 0 || index >= metricsByMonth.length) return;
            
            const month = metricsByMonth[index];
            const completeness = completenessData[index];
            
            // Atualizar label do mês
            monthLabelEl.textContent = `📅 ${month.monthLabel}`;
            
            // Atualizar detalhes de objetos
            objectsDetailsEl.innerHTML = `
                <div style="margin-bottom: 0.5rem;">
                    <strong style="color: #3b82f6;">📦 OBJETOS NO BRAIN:</strong>
                </div>
                <div style="padding-left: 1rem; color: #cbd5e1;">
                    <div>• Total acumulado: <strong style="color: #f1f5f9;">${month.totalObjects} objeto(s)</strong></div>
                    <div>• Novos neste mês: <strong style="color: #f1f5f9;">${month.newObjects > 0 ? month.newObjects : 'nenhum'} objeto(s)</strong></div>
                    <div style="margin-top: 0.5rem; font-size: 0.8125rem; color: #94a3b8;">
                        Explicação: Objetos Salesforce que têm documentação no Brain
                    </div>
                </div>
            `;
            
            // Atualizar detalhes de regras de negócio
            rulesDetailsEl.innerHTML = `
                <div style="margin-bottom: 0.5rem;">
                    <strong style="color: #10b981;">📋 REGRAS DE NEGÓCIO:</strong>
                </div>
                <div style="padding-left: 1rem; color: #cbd5e1;">
                    <div>• Total acumulado: <strong style="color: #f1f5f9;">${month.totalBusinessRules} regra(s)</strong></div>
                    <div>• Novas neste mês: <strong style="color: #f1f5f9;">${month.newBusinessRules > 0 ? month.newBusinessRules : 'nenhuma'} regra(s)</strong></div>
                    <div style="margin-top: 0.5rem; font-size: 0.8125rem; color: #94a3b8;">
                        Explicação: Documentos REGRAS_NEGOCIO_*.md criados
                    </div>
                </div>
            `;
            
            // Mostrar o container
            detailsContainer.style.display = 'block';
        };

        this.charts.brainEvolution = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Objetos Mapeados',
                        data: objectsData,
                        borderColor: this.chartColors.primary,
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.4,
                        fill: false,
                        yAxisID: 'y',
                        pointRadius: 5,
                        pointHoverRadius: 8,
                        pointHoverBorderWidth: 3,
                        borderWidth: 3,
                        pointBackgroundColor: this.chartColors.primary,
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2
                    },
                    {
                        label: 'Regras de Negócio',
                        data: businessRulesData,
                        borderColor: this.chartColors.success,
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4,
                        fill: false,
                        yAxisID: 'y',
                        pointRadius: 5,
                        pointHoverRadius: 8,
                        pointHoverBorderWidth: 3,
                        borderWidth: 3,
                        pointBackgroundColor: this.chartColors.success,
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2
                    },
                    {
                        label: 'Completude Média (%)',
                        data: completenessData,
                        borderColor: this.chartColors.warning,
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        tension: 0.4,
                        fill: false,
                        yAxisID: 'y1',
                        pointRadius: 5,
                        pointHoverRadius: 8,
                        pointHoverBorderWidth: 3,
                        borderWidth: 3,
                        borderDash: [5, 5],
                        pointBackgroundColor: this.chartColors.warning,
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2
                    },
                    {
                        label: 'Meta de Completude (80%)',
                        data: targetData,
                        borderColor: this.chartColors.danger,
                        backgroundColor: 'transparent',
                        tension: 0,
                        fill: false,
                        yAxisID: 'y1',
                        pointRadius: 0,
                        borderWidth: 2,
                        borderDash: [10, 5],
                        pointStyle: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: '#e2e8f0',
                            font: {
                                size: 12,
                                weight: '500'
                            },
                            padding: 12,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            boxWidth: 12,
                            boxHeight: 12
                        }
                    },
                    tooltip: {
                        enabled: false  // Desabilitado - informações aparecem abaixo do gráfico e no tooltip do ícone ℹ️
                    },
                    title: {
                        display: true,
                        text: 'Evolução do Brain - Base de Conhecimento do Projeto',
                        color: '#f1f5f9',
                        font: {
                            size: 16,
                            weight: 'bold'
                        },
                        padding: {
                            top: 10,
                            bottom: 20
                        }
                    }
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Quantidade (Objetos e Regras)',
                            color: '#94a3b8',
                            font: {
                                size: 12,
                                weight: '500'
                            }
                        },
                        ticks: {
                            color: '#94a3b8',
                            font: {
                                size: 11
                            },
                            callback: function(value) {
                                return value;
                            }
                        },
                        grid: {
                            color: '#334155'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Completude (%)',
                            color: '#94a3b8',
                            font: {
                                size: 12,
                                weight: '500'
                            }
                        },
                        ticks: {
                            color: '#94a3b8',
                            font: {
                                size: 11
                            },
                            callback: function(value) {
                                return value + '%';
                            }
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    },
                    x: {
                        ticks: {
                            color: '#94a3b8',
                            font: {
                                size: 11
                            },
                            maxRotation: 45,
                            minRotation: 0
                        },
                        grid: {
                            color: '#334155'
                        }
                    }
                }
            },
            plugins: [{
                id: 'brainEvolutionHover',
                afterEvent: (chart, args) => {
                    if (!args.event || !args.event.native) return;
                    
                    const event = args.event.native;
                    const canvasPosition = Chart.helpers.getRelativePosition(event, chart);
                    const dataIndex = chart.scales.x.getValueForPixel(canvasPosition.x);
                    
                    if (dataIndex >= 0 && dataIndex < metricsByMonth.length) {
                        updateDetailsOnHover(dataIndex);
                    } else if (event.type === 'mouseout') {
                        // Ao sair do gráfico, mostrar último mês novamente
                        if (metricsByMonth.length > 0) {
                            updateDetailsOnHover(metricsByMonth.length - 1);
                        }
                    }
                }
            }]
        });
        
        // Adicionar listeners de mouse para atualizar detalhes
        ctx.addEventListener('mousemove', (e) => {
            const canvasPosition = Chart.helpers.getRelativePosition(e, this.charts.brainEvolution);
            const dataIndex = this.charts.brainEvolution.scales.x.getValueForPixel(canvasPosition.x);
            
            if (dataIndex >= 0 && dataIndex < metricsByMonth.length) {
                updateDetailsOnHover(dataIndex);
            }
        });
        
        ctx.addEventListener('mouseleave', () => {
            // Ao sair do gráfico, mostrar último mês novamente
            if (metricsByMonth.length > 0) {
                updateDetailsOnHover(metricsByMonth.length - 1);
            }
        });
    }

    /**
     * Atualiza a seção de detalhes abaixo do gráfico de evolução do Brain
     */
    updateBrainEvolutionDetails(metricsByMonth, completenessData) {
        const detailsContainer = document.getElementById('brain-evolution-details');
        const monthLabelEl = document.getElementById('brain-evolution-month-label');
        const objectsDetailsEl = document.getElementById('brain-evolution-objects-details');
        const rulesDetailsEl = document.getElementById('brain-evolution-rules-details');
        
        if (!detailsContainer || !monthLabelEl || !objectsDetailsEl || !rulesDetailsEl) {
            console.warn('⚠️ Elementos de detalhes do Brain não encontrados');
            return;
        }
        
        // Pegar o último mês disponível
        if (!metricsByMonth || metricsByMonth.length === 0) {
            detailsContainer.style.display = 'none';
            return;
        }
        
        const lastMonth = metricsByMonth[metricsByMonth.length - 1];
        const lastCompleteness = completenessData && completenessData.length > 0 
            ? completenessData[completenessData.length - 1] 
            : 0;
        
        // Atualizar label do mês
        monthLabelEl.textContent = `📅 ${lastMonth.monthLabel}`;
        
        // Atualizar detalhes de objetos
        objectsDetailsEl.innerHTML = `
            <div style="margin-bottom: 0.5rem;">
                <strong style="color: #3b82f6;">📦 OBJETOS NO BRAIN:</strong>
            </div>
            <div style="padding-left: 1rem; color: #cbd5e1;">
                <div>• Total acumulado: <strong style="color: #f1f5f9;">${lastMonth.totalObjects} objeto(s)</strong></div>
                <div>• Novos neste mês: <strong style="color: #f1f5f9;">${lastMonth.newObjects > 0 ? lastMonth.newObjects : 'nenhum'} objeto(s)</strong></div>
                <div style="margin-top: 0.5rem; font-size: 0.8125rem; color: #94a3b8;">
                    Explicação: Objetos Salesforce que têm documentação no Brain
                </div>
            </div>
        `;
        
        // Atualizar detalhes de regras de negócio
        rulesDetailsEl.innerHTML = `
            <div style="margin-bottom: 0.5rem;">
                <strong style="color: #10b981;">📋 REGRAS DE NEGÓCIO:</strong>
            </div>
            <div style="padding-left: 1rem; color: #cbd5e1;">
                <div>• Total acumulado: <strong style="color: #f1f5f9;">${lastMonth.totalBusinessRules} regra(s)</strong></div>
                <div>• Novas neste mês: <strong style="color: #f1f5f9;">${lastMonth.newBusinessRules > 0 ? lastMonth.newBusinessRules : 'nenhuma'} regra(s)</strong></div>
                <div style="margin-top: 0.5rem; font-size: 0.8125rem; color: #94a3b8;">
                    Explicação: Documentos REGRAS_NEGOCIO_*.md criados
                </div>
            </div>
        `;
        
        // Mostrar o container
        detailsContainer.style.display = 'block';
    }

    /**
     * Cria gráfico de completude por objeto
     */
    createCompletenessByObjectChart(projectMetrics) {
        // Evitar renderização múltipla
        if (this.charts.completenessByObject && !this.charts.completenessByObject.destroyed) {
            console.log('⏭️ Gráfico já existe, pulando renderização duplicada');
            return;
        }
        
        const ctx = document.getElementById('chart-completeness-by-object');
        if (!ctx) {
            console.warn('⚠️ Canvas chart-completeness-by-object não encontrado');
            return;
        }
        
        // Se não houver dados, mostrar mensagem
        if (!projectMetrics) {
            this.showNoDataMessage('chart-completeness-by-object', 
                'Sem dados de projeto', 
                'Gere métricas de projeto para visualizar completude por objeto');
            return;
        }
        
        // Remover mensagem se houver dados
        this.hideNoDataMessage('chart-completeness-by-object');

        // Destruir gráfico anterior se existir
        if (this.charts.completenessByObject) {
            try {
                this.charts.completenessByObject.destroy();
            } catch (e) {
                console.warn('Erro ao destruir gráfico anterior:', e);
            }
            this.charts.completenessByObject = null;
        }
        
        // Limpar canvas antes de criar novo gráfico
        if (ctx) {
            const context = ctx.getContext('2d');
            context.clearRect(0, 0, ctx.width, ctx.height);
        }

        // Lista base de objetos para análise (mesma lista do generate-coverage-report.js)
        // Lista base de objetos para análise (DEVE corresponder exatamente à lista em generate-project-metrics.js)
        const BASE_OBJECTS = [
            'Contratos',
            'Contratos Reajuste',
            'Empresas',
            'Leads',
            'Oportunidades',
            'Pedidos RA',
            'Contatos',
            'Reforma tributária',
            'Assinatura simplificada',
            'Auditorias',
            'Diário de Bordos',
            'csats',
            'Pesquisas',
            'Respostas da Pesquisa',
            'Índices Econômicos',
            'Tabela de Impostos',
            'Produtos',
            'Catálogos de preços',
            'Distribuição de Leads',
            'Regras de Distribuição',
            'Emails de lista',
            'Aprovadores da Equipe',
            'Membros da Equipe',
            'Distribuição Onboarding',
            'Campanhas',
            'Onboardings',
            'Eventos de integração'
        ];
        
        // Mapeamento de nomes técnicos para nomes amigáveis (mesmo do generate-coverage-report.js)
        const OBJECT_NAME_MAPPING = {
            'Contract': 'Contratos',
            'Contract_Reajuste': 'Contratos Reajuste',
            'ContractReajuste': 'Contratos Reajuste',
            'Contrato_Reajuste__c': 'Contratos Reajuste',
            'Account': 'Empresas',
            'Lead': 'Leads',
            'Opportunity': 'Oportunidades',
            'Pedido_RA': 'Pedidos RA',
            'PedidoRA': 'Pedidos RA',
            'Quote': 'Pedidos RA', // Quote pode ser usado para Pedidos RA
            'Contact': 'Contatos',
            'Auditoria__c': 'Auditorias',
            'Auditoria': 'Auditorias',
            'Di_rio_de_Bordo__c': 'Diário de Bordos',
            'Diario_Bordo': 'Diário de Bordos',
            'CSAT__c': 'csats',
            'CSAT': 'csats',
            'Survey__c': 'Pesquisas',
            'Survey': 'Pesquisas',
            'RespostaPesquisa__c': 'Respostas da Pesquisa',
            'RespostaPesquisa': 'Respostas da Pesquisa',
            'IndiceEconomico__c': 'Índices Econômicos',
            'IndiceEconomico': 'Índices Econômicos',
            'TabelaDeImposto__c': 'Tabela de Impostos',
            'TabelaDeImposto': 'Tabela de Impostos',
            'Product2': 'Produtos',
            'Product': 'Produtos',
            'Pricebook2': 'Catálogos de preços',
            'Pricebook': 'Catálogos de preços',
            'DistribuicaoLead__c': 'Distribuição de Leads',
            'DistribuicaoLead': 'Distribuição de Leads',
            'Distribuicao__c': 'Regras de Distribuição',
            'Distribuicao': 'Regras de Distribuição',
            'Campaign': 'Campanhas',
            'Onboarding__c': 'Onboardings',
            'Onboarding': 'Onboardings',
            'EventosBot__c': 'Eventos de integração',
            'EventosBot': 'Eventos de integração'
        };
        
        // Lista de objetos que devem ser IGNORADOS (não estão na lista base)
        const IGNORED_OBJECTS = [
            'Contratos_Ativos__c',
            'ContratosAtivos',
            'Event',
            'Event__c',
            'Asset',
            'Asset__c'
        ];
        
        // Mapeamento reverso: nome amigável -> nomes técnicos possíveis
        const REVERSE_MAPPING = {};
        Object.keys(OBJECT_NAME_MAPPING).forEach(techName => {
            const friendlyName = OBJECT_NAME_MAPPING[techName];
            if (!REVERSE_MAPPING[friendlyName]) {
                REVERSE_MAPPING[friendlyName] = [];
            }
            REVERSE_MAPPING[friendlyName].push(techName.toLowerCase());
        });
        
        // Normalizar nome do objeto para comparação
        const normalizeObjectName = (name) => {
            return name.trim().toLowerCase().replace(/\s+/g, ' ').replace(/_/g, ' ').replace(/__c/g, '').replace(/__/g, '');
        };
        
        // Verificar se um objeto está na lista base (usando mapeamento)
        const isBaseObject = (objectName) => {
            // Primeiro: verificar se está na lista de ignorados
            if (IGNORED_OBJECTS.some(ignored => normalizeObjectName(ignored) === normalizeObjectName(objectName))) {
                return false;
            }
            
            const normalized = normalizeObjectName(objectName);
            
            // Verificar mapeamento direto
            if (OBJECT_NAME_MAPPING[objectName]) {
                const friendlyName = OBJECT_NAME_MAPPING[objectName];
                return BASE_OBJECTS.includes(friendlyName);
            }
            
            // Verificar mapeamento reverso
            for (const [friendlyName, techNames] of Object.entries(REVERSE_MAPPING)) {
                if (techNames.some(tech => {
                    const normalizedTech = normalizeObjectName(tech);
                    return normalized === normalizedTech || normalized.includes(normalizedTech) || normalizedTech.includes(normalized);
                })) {
                    return BASE_OBJECTS.includes(friendlyName);
                }
            }
            
            // Verificar diretamente na lista base (comparação mais rigorosa)
            const matchedBase = BASE_OBJECTS.find(base => {
                const normalizedBase = normalizeObjectName(base);
                // Comparação exata ou se o nome normalizado contém o nome base (mas não o contrário para evitar falsos positivos)
                return normalized === normalizedBase || normalized.includes(normalizedBase);
            });
            
            return matchedBase !== undefined;
        };
        
        // Obter nome amigável do objeto
        const getFriendlyName = (objectName) => {
            // Verificar mapeamento direto
            if (OBJECT_NAME_MAPPING[objectName]) {
                const friendlyName = OBJECT_NAME_MAPPING[objectName];
                // Verificar se o nome amigável está na lista base
                if (BASE_OBJECTS.includes(friendlyName)) {
                    return friendlyName;
                }
            }
            
            // Verificar mapeamento reverso
            const normalized = normalizeObjectName(objectName);
            for (const [friendlyName, techNames] of Object.entries(REVERSE_MAPPING)) {
                if (techNames.some(tech => {
                    const normalizedTech = normalizeObjectName(tech);
                    return normalized === normalizedTech || normalized.includes(normalizedTech) || normalizedTech.includes(normalized);
                })) {
                    // Verificar se o nome amigável está na lista base
                    if (BASE_OBJECTS.includes(friendlyName)) {
                        return friendlyName;
                    }
                }
            }
            
            // Se não encontrou mapeamento válido, retornar null para indicar que deve ser filtrado
            return null;
        };
        
        // Criar mapa de completude por nome amigável (agrupar objetos técnicos)
        const completenessByFriendlyName = new Map();
        const filteredOut = [];
        
        (projectMetrics.completeness || []).forEach(c => {
            // Filtrar objetos que não estão na lista base
            if (!isBaseObject(c.object)) {
                filteredOut.push(c.object);
                return;
            }
            
            const friendlyName = getFriendlyName(c.object);
            
            // Se não encontrou mapeamento válido, filtrar
            if (!friendlyName || !BASE_OBJECTS.includes(friendlyName)) {
                filteredOut.push(`${c.object} -> ${friendlyName || 'null'} (não está na BASE_OBJECTS)`);
                return;
            }
            
            const normalizedFriendly = normalizeObjectName(friendlyName);
            
            // Se já existe, manter o que tem maior completude
            if (completenessByFriendlyName.has(normalizedFriendly)) {
                const existing = completenessByFriendlyName.get(normalizedFriendly);
                if (c.percentage > existing.percentage) {
                    completenessByFriendlyName.set(normalizedFriendly, {
                        ...c,
                        object: friendlyName,
                        originalObject: c.object
                    });
                }
            } else {
                completenessByFriendlyName.set(normalizedFriendly, {
                    ...c,
                    object: friendlyName,
                    originalObject: c.object
                });
            }
        });
        
        // Log de debug
        const objetosValidosLista = Array.from(completenessByFriendlyName.values()).map(c => c.object);
        console.log('🔍 Filtragem de objetos:', {
            totalNoJSON: (projectMetrics.completeness || []).length,
            filtrados: filteredOut.length,
            objetosFiltrados: filteredOut,
            objetosValidos: completenessByFriendlyName.size,
            objetosValidosLista: objetosValidosLista,
            totalNaListaBase: BASE_OBJECTS.length,
            objetosNaListaBaseNaoEncontrados: BASE_OBJECTS.filter(obj => !objetosValidosLista.includes(obj))
        });
        
        // Converter para array e ordenar por completude
        // Não limitar a 15 - mostrar todos os objetos da lista base
        const validCompleteness = Array.from(completenessByFriendlyName.values())
            .sort((a, b) => b.percentage - a.percentage);
        
        const labels = validCompleteness.map(c => c.object.length > 25 ? c.object.substring(0, 25) + '...' : c.object);
        const data = validCompleteness.map(c => c.percentage);
        
        // Calcular métricas para sugestões
        const totalObjects = validCompleteness.length;
        const objectsAbove80 = validCompleteness.filter(c => c.percentage >= 80).length;
        const objectsAbove50 = validCompleteness.filter(c => c.percentage >= 50).length;
        const objectsBelow50 = validCompleteness.filter(c => c.percentage < 50).length;
        const averageCompleteness = totalObjects > 0 
            ? Math.round(validCompleteness.reduce((sum, c) => sum + c.percentage, 0) / totalObjects)
            : 0;

        // Garantir que temos dados válidos antes de criar o gráfico
        if (validCompleteness.length === 0) {
            console.warn('⚠️ createCompletenessByObjectChart: Nenhum objeto válido da lista base encontrado');
            this.showNoDataMessage('chart-completeness-by-object', 
                'Sem dados de completude', 
                'Nenhum objeto da lista base encontrado com dados válidos');
            return;
        }
        
        console.log('✅ createCompletenessByObjectChart - Criando gráfico com:', {
            objetos: validCompleteness.length,
            labels: labels.length,
            data: data.length,
            objetosExibidos: validCompleteness.map(c => c.object),
            labelsCompletos: labels,
            dadosCompletos: data.map((d, i) => ({ objeto: validCompleteness[i].object, completude: d }))
        });

        // Verificar se há duplicatas nos dados antes de criar o gráfico
        const uniqueLabels = [];
        const uniqueData = [];
        const seenLabels = new Set();
        
        labels.forEach((label, index) => {
            const normalizedLabel = label.toLowerCase().trim();
            if (!seenLabels.has(normalizedLabel)) {
                seenLabels.add(normalizedLabel);
                uniqueLabels.push(label);
                uniqueData.push(data[index]);
            }
        });
        
        console.log('🔍 Verificação de duplicatas:', {
            labelsOriginais: labels.length,
            labelsUnicos: uniqueLabels.length,
            duplicatas: labels.length - uniqueLabels.length,
            labelsOriginaisLista: labels,
            labelsUnicosLista: uniqueLabels,
            objetosDuplicados: labels.filter((label, index) => labels.indexOf(label) !== index)
        });
        
        // Linhas de meta e expectativa (valores constantes para todas as barras)
        const metaData = uniqueLabels.map(() => 80); // Meta de 80%
        const expectativaData = uniqueLabels.map(() => 60); // Expectativa de 60%

        // Garantir que há apenas um dataset de barras
        const datasets = [
            {
                label: 'Completude (%)',
                data: uniqueData,
                backgroundColor: uniqueData.map(c => 
                    c >= 80 ? this.chartColors.success :
                    c >= 50 ? this.chartColors.warning :
                    '#ff4d4d' // Vermelho para < 50%
                ),
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.1)',
                order: 1 // Renderizar primeiro (barras)
            },
            {
                label: 'Expectativa (60%)',
                data: expectativaData,
                type: 'line',
                borderColor: this.chartColors.info,
                backgroundColor: 'transparent',
                borderWidth: 2,
                borderDash: [5, 5],
                pointRadius: 0,
                pointHoverRadius: 0,
                pointStyle: false,
                fill: false,
                tension: 0,
                order: 0, // Renderizar por último (sobre as barras)
                hidden: false
            },
            {
                label: 'Meta (80%)',
                data: metaData,
                type: 'line',
                borderColor: this.chartColors.danger,
                backgroundColor: 'transparent',
                borderWidth: 2,
                borderDash: [10, 5],
                pointRadius: 0,
                pointHoverRadius: 0,
                pointStyle: false,
                fill: false,
                tension: 0,
                order: 0, // Renderizar por último (sobre as barras)
                hidden: false
            }
        ];
        
        console.log('📊 Datasets criados:', {
            total: datasets.length,
            barras: datasets.filter(d => !d.type || d.type === 'bar').length,
            linhas: datasets.filter(d => d.type === 'line').length,
            labels: uniqueLabels.length,
            data: uniqueData.length,
            labelsCompletos: uniqueLabels,
            dataCompleto: uniqueData.map((d, i) => ({ label: uniqueLabels[i], valor: d }))
        });
        
        // Verificar se há algum problema de renderização
        console.log('🔍 Verificação final antes de criar gráfico:', {
            canvasExiste: !!ctx,
            canvasId: ctx?.id,
            datasetsConfig: datasets.map(d => ({
                label: d.label,
                type: d.type || 'bar',
                dataLength: d.data?.length || 0
            }))
        });

        // Garantir que há apenas um dataset de barras
        if (datasets.filter(d => !d.type || d.type === 'bar').length > 1) {
            console.warn('⚠️ Múltiplos datasets de barras detectados! Removendo duplicatas...');
            const barDatasets = datasets.filter(d => !d.type || d.type === 'bar');
            const lineDatasets = datasets.filter(d => d.type === 'line');
            datasets.length = 0;
            datasets.push(barDatasets[0]); // Manter apenas o primeiro dataset de barras
            datasets.push(...lineDatasets); // Adicionar todas as linhas
        }

        // Verificação final antes de criar o gráfico
        if (uniqueLabels.length !== uniqueData.length) {
            console.error('❌ ERRO: Número de labels não corresponde ao número de dados!', {
                labels: uniqueLabels.length,
                data: uniqueData.length
            });
            return;
        }
        
        // Verificar se há duplicatas nos labels finais
        const labelsSet = new Set(uniqueLabels);
        if (labelsSet.size !== uniqueLabels.length) {
            console.error('❌ ERRO: Há duplicatas nos labels finais!', {
                total: uniqueLabels.length,
                unicos: labelsSet.size,
                duplicatas: uniqueLabels.filter((label, index) => uniqueLabels.indexOf(label) !== index)
            });
            // Remover duplicatas mantendo apenas a primeira ocorrência
            const seen = new Set();
            const finalLabels = [];
            const finalData = [];
            uniqueLabels.forEach((label, index) => {
                if (!seen.has(label)) {
                    seen.add(label);
                    finalLabels.push(label);
                    finalData.push(uniqueData[index]);
                }
            });
            uniqueLabels.length = 0;
            uniqueLabels.push(...finalLabels);
            uniqueData.length = 0;
            uniqueData.push(...finalData);
            console.log('✅ Duplicatas removidas:', {
                antes: labels.length,
                depois: uniqueLabels.length
            });
        }
        
        // Ajustar altura do container antes de criar o gráfico
        const chartContainer = ctx.closest('.chart-container');
        if (chartContainer) {
            const minHeight = uniqueLabels.length * 45 + 100; // 45px por label + espaço para título e padding
            chartContainer.style.minHeight = minHeight + 'px';
            chartContainer.style.height = 'auto';
        }
        
        this.charts.completenessByObject = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: uniqueLabels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false, // Permitir que o gráfico ajuste a altura automaticamente
                indexAxis: 'y',
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                layout: {
                    padding: {
                        left: 10,
                        right: 10,
                        top: 10,
                        bottom: 10
                    }
                },
                // Ajustar altura do gráfico baseado no número de labels
                onResize: function(chart, size) {
                    try {
                        const minHeight = uniqueLabels.length * 45; // 45px por label
                        if (size && size.height < minHeight) {
                            const container = chart.canvas.parentElement;
                            if (container) {
                                container.style.minHeight = minHeight + 'px';
                                container.style.height = minHeight + 'px';
                            }
                        }
                    } catch (e) {
                        console.warn('Erro ao ajustar altura no resize:', e);
                    }
                },
                plugins: {
                    legend: { 
                        display: true,
                        position: 'top',
                        labels: {
                            color: '#e2e8f0',
                            filter: (item) => {
                                // Mostrar apenas linhas de meta e expectativa na legenda
                                return item.text === 'Meta (80%)' || item.text === 'Expectativa (60%)';
                            },
                            usePointStyle: true,
                            pointStyle: 'line'
                        }
                    },
                    tooltip: {
                        enabled: true,
                        mode: 'nearest',
                        intersect: true,
                        callbacks: {
                            label: (context) => {
                                const datasetLabel = context.dataset.label;
                                if (datasetLabel === 'Meta (80%)') {
                                    return '🎯 Meta: 80%';
                                }
                                if (datasetLabel === 'Expectativa (60%)') {
                                    return '📊 Expectativa: 60%';
                                }
                                // Tooltip simplificado - apenas valor básico
                                // Usar índice correto baseado nos dados únicos
                                const labelIndex = context.dataIndex;
                                if (labelIndex >= 0 && labelIndex < uniqueLabels.length) {
                                    const item = validCompleteness.find(c => c.object === uniqueLabels[labelIndex]);
                                    if (item) {
                                        const gap = 80 - item.percentage;
                                        let tooltip = `${item.object}: ${context.parsed.x.toFixed(1)}%`;
                                        if (item.percentage < 80) {
                                            tooltip += ` (Faltam ${gap.toFixed(1)}% para meta)`;
                                        }
                                        return tooltip;
                                    }
                                }
                                return `Completude: ${context.parsed.x.toFixed(1)}%`;
                            }
                        }
                    }
                },
                scales: {
                    x: { 
                        beginAtZero: true, 
                        max: 100, 
                        ticks: { 
                            callback: v => v + '%',
                            color: '#94a3b8'
                        },
                        title: {
                            display: true,
                            text: 'Completude (%)',
                            color: '#94a3b8'
                        },
                        grid: {
                            color: '#334155'
                        }
                    },
                    y: {
                        // Garantir que todos os labels sejam exibidos
                        ticks: {
                            color: '#e2e8f0',
                            maxTicksLimit: undefined, // Sem limite de ticks
                            stepSize: 1, // Mostrar todos os labels
                            autoSkip: false, // Não pular labels - CRÍTICO para mostrar todos
                            font: {
                                size: 11
                            },
                            callback: function(value, index, ticks) {
                                // Garantir que o label corresponda ao índice correto
                                // Para gráficos horizontais, o índice corresponde diretamente ao label
                                if (index >= 0 && index < uniqueLabels.length) {
                                    return uniqueLabels[index];
                                }
                                return '';
                            }
                        },
                        grid: {
                            color: '#334155',
                            display: true
                        },
                        afterFit: function(scale) {
                            // Ajustar altura mínima baseada no número de labels
                            const minHeight = uniqueLabels.length * 45; // 45px por label para melhor legibilidade
                            // Apenas ajustar a altura da escala, sem tentar acessar o chart
                            // O Chart.js ajustará automaticamente o tamanho do canvas
                            if (scale && scale.height < minHeight) {
                                scale.height = minHeight;
                            }
                        }
                    }
                }
            }
        });
        
        // Atualizar seção de sugestões abaixo do gráfico (usar dados únicos)
        const uniqueCompleteness = validCompleteness.filter((c, index) => {
            const normalized = c.object.toLowerCase().trim();
            return !validCompleteness.slice(0, index).some(prev => prev.object.toLowerCase().trim() === normalized);
        });
        
        this.updateCompletenessSuggestions(uniqueCompleteness, {
            totalObjects: uniqueCompleteness.length,
            objectsAbove80: uniqueCompleteness.filter(c => c.percentage >= 80).length,
            objectsAbove50: uniqueCompleteness.filter(c => c.percentage >= 50).length,
            objectsBelow50: uniqueCompleteness.filter(c => c.percentage < 50).length,
            averageCompleteness: uniqueCompleteness.length > 0 
                ? Math.round(uniqueCompleteness.reduce((sum, c) => sum + c.percentage, 0) / uniqueCompleteness.length)
                : 0
        });
    }
    
    /**
     * Atualiza a seção de sugestões para aumentar completude
     */
    updateCompletenessSuggestions(validCompleteness, metrics) {
        const suggestionsContainer = document.getElementById('completeness-suggestions');
        if (!suggestionsContainer) {
            // Criar container se não existir
            const chartContainer = document.getElementById('chart-completeness-by-object')?.closest('.chart-container');
            if (chartContainer) {
                const newContainer = document.createElement('div');
                newContainer.id = 'completeness-suggestions';
                newContainer.style.cssText = 'margin-top: 1.5rem; padding: 1rem; background-color: #1e293b; border-radius: 8px; border: 1px solid #334155;';
                chartContainer.appendChild(newContainer);
                this.updateCompletenessSuggestions(validCompleteness, metrics);
                return;
            }
            return;
        }
        
        const { totalObjects, objectsAbove80, objectsAbove50, objectsBelow50, averageCompleteness } = metrics;
        
        // Objetos que precisam de atenção (abaixo de 50%)
        const needsAttention = validCompleteness
            .filter(c => c.percentage < 50)
            .slice(0, 5)
            .map(c => c.object);
        
        // Objetos próximos da meta (entre 50% e 80%)
        const nearGoal = validCompleteness
            .filter(c => c.percentage >= 50 && c.percentage < 80)
            .slice(0, 5)
            .map(c => c.object);
        
        // Gerar sugestões baseadas nos dados
        const suggestions = [];
        
        if (objectsBelow50 > 0) {
            suggestions.push({
                icon: '🔴',
                title: 'Objetos com Baixa Completude (< 50%)',
                description: `${objectsBelow50} objeto(s) precisam de atenção urgente`,
                actions: [
                    'Criar arquivo record_types.json com todos os Record Types ativos',
                    'Gerar enriched_data.json com dados enriquecidos',
                    'Criar fields_analysis.json com análise de campos',
                    'Documentar flows ativos em flows_analysis.json'
                ],
                objects: needsAttention
            });
        }
        
        if (nearGoal.length > 0) {
            suggestions.push({
                icon: '🟠',
                title: 'Objetos Próximos da Meta (50-80%)',
                description: `${nearGoal.length} objeto(s) estão próximos de atingir a meta`,
                actions: [
                    'Completar arquivos faltantes (test_suggestions.json, end_to_end_flows.json)',
                    'Criar CONSOLIDATED_DOC.md com documentação consolidada',
                    'Revisar e atualizar documentação existente'
                ],
                objects: nearGoal
            });
        }
        
        suggestions.push({
            icon: '📊',
            title: 'Estatísticas Gerais',
            description: `Completude média: ${averageCompleteness}% | Meta: 80% | Expectativa: 60%`,
            actions: [
                `${objectsAbove80} objeto(s) atingiram a meta (≥ 80%)`,
                `${objectsAbove50 - objectsAbove80} objeto(s) estão acima da expectativa (50-79%)`,
                `${objectsBelow50} objeto(s) precisam de atenção (< 50%)`
            ],
            objects: []
        });
        
        // Renderizar sugestões
        let html = '<h4 style="color: #f1f5f9; font-size: 1rem; font-weight: 600; margin-bottom: 1rem;">💡 Como Aumentar a Completude</h4>';
        
        suggestions.forEach((suggestion, index) => {
            html += `
                <div style="margin-bottom: ${index < suggestions.length - 1 ? '1.5rem' : '0'}; padding-bottom: ${index < suggestions.length - 1 ? '1.5rem' : '0'}; border-bottom: ${index < suggestions.length - 1 ? '1px solid #334155' : 'none'};">
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">
                        <span style="font-size: 1.25rem;">${suggestion.icon}</span>
                        <strong style="color: #f1f5f9; font-size: 0.875rem;">${suggestion.title}</strong>
                    </div>
                    <p style="color: #cbd5e1; font-size: 0.8125rem; margin-bottom: 0.75rem;">${suggestion.description}</p>
                    ${suggestion.objects.length > 0 ? `
                        <div style="margin-bottom: 0.75rem;">
                            <span style="color: #94a3b8; font-size: 0.75rem;">Objetos: </span>
                            <span style="color: #cbd5e1; font-size: 0.75rem;">${suggestion.objects.join(', ')}</span>
                        </div>
                    ` : ''}
                    <ul style="color: #cbd5e1; font-size: 0.8125rem; padding-left: 1.5rem; margin: 0; line-height: 1.6;">
                        ${suggestion.actions.map(action => `<li style="margin-bottom: 0.25rem;">${action}</li>`).join('')}
                    </ul>
                </div>
            `;
        });
        
        suggestionsContainer.innerHTML = html;
        suggestionsContainer.style.display = 'block';
    }

    /**
     * Cria gráfico de regras de negócio documentadas
     */
    createBusinessRulesChart(projectMetrics) {
        const ctx = document.getElementById('chart-business-rules');
        if (!ctx) {
            console.warn('⚠️ Canvas chart-business-rules não encontrado');
            return;
        }
        
        // Se não houver dados, mostrar mensagem
        if (!projectMetrics) {
            this.showNoDataMessage('chart-business-rules', 
                'Sem dados de projeto', 
                'Gere métricas de projeto para visualizar regras de negócio');
            return;
        }
        
        // Remover mensagem se houver dados
        this.hideNoDataMessage('chart-business-rules');

        if (this.charts.businessRules) {
            this.charts.businessRules.destroy();
        }

        const rules = projectMetrics.businessRules || {};
        const files = rules.files || [];
        
        // Agrupar por mês
        const byMonth = {};
        files.forEach(f => {
            const date = new Date(f.lastModified);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!byMonth[monthKey]) {
                byMonth[monthKey] = 0;
            }
            byMonth[monthKey]++;
        });

        const sortedMonths = Object.keys(byMonth).sort();
        const labels = sortedMonths;
        const data = sortedMonths.map(m => byMonth[m]);

        this.charts.businessRules = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Regras de Negócio',
                    data: data,
                    backgroundColor: this.chartColors.info,
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.1)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: true,
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: (context) => {
                                // Tooltip simplificado - apenas valor básico
                                return `Regras: ${context.parsed.y}`;
                            }
                        }
                    }
                },
                scales: {
                    y: { 
                        beginAtZero: true,
                        ticks: {
                            color: '#94a3b8',
                            stepSize: 1
                        },
                        grid: {
                            color: '#334155'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#94a3b8'
                        },
                        grid: {
                            color: '#334155'
                        }
                    }
                }
            }
        });
        
        // Atualizar análise abaixo do gráfico
        this.updateBusinessRulesAnalysis(rules);
    }
    
    /**
     * Atualiza a análise de regras de negócio abaixo do gráfico
     */
    updateBusinessRulesAnalysis(businessRules) {
        const analysisContainer = document.getElementById('business-rules-analysis');
        if (!analysisContainer) {
            // Criar container se não existir
            const chartContainer = document.getElementById('chart-business-rules')?.closest('.chart-container');
            if (chartContainer) {
                const newContainer = document.createElement('div');
                newContainer.id = 'business-rules-analysis';
                newContainer.style.cssText = 'margin-top: 1.5rem; padding: 1rem; background-color: #1e293b; border-radius: 8px; border: 1px solid #334155;';
                chartContainer.appendChild(newContainer);
                this.updateBusinessRulesAnalysis(businessRules);
                return;
            }
            return;
        }
        
        const analysis = businessRules.analysis || {};
        
        if (!analysis.totalFiles || analysis.totalFiles === 0) {
            analysisContainer.style.display = 'none';
            return;
        }
        
        analysisContainer.style.display = 'block';
        
        const sectionStats = analysis.sectionStats || {};
        const sortedSections = analysis.sortedSections || [];
        
        let html = '<h4 style="color: #f1f5f9; font-size: 1rem; font-weight: 600; margin-bottom: 1rem;">📊 Análise por Seção das Regras de Negócio</h4>';
        
        // Mostrar porcentagem por seção
        if (sortedSections.length > 0) {
            html += `
                <div style="margin-bottom: 1.5rem;">
                    <p style="color: #cbd5e1; font-size: 0.8125rem; margin-bottom: 1rem;">
                        Porcentagem de arquivos que contêm cada seção (de ${analysis.totalFiles || 0} arquivos):
                    </p>
                    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                        ${sortedSections.map(section => {
                            const percentage = section.percentage || 0;
                            const color = percentage >= 80 ? '#10b981' : percentage >= 50 ? '#f59e0b' : '#ef4444';
                            const icon = percentage >= 80 ? '✅' : percentage >= 50 ? '🟠' : '🔴';
                            
                            return `
                                <div style="padding: 0.75rem; background-color: #0f172a; border-radius: 6px; border: 1px solid #334155;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                                            <span style="font-size: 1rem;">${icon}</span>
                                            <strong style="color: #f1f5f9; font-size: 0.875rem;">${section.name}</strong>
                                        </div>
                                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                                            <span style="color: ${color}; font-weight: 600; font-size: 0.875rem;">${percentage}%</span>
                                            <span style="color: #94a3b8; font-size: 0.75rem;">(${section.count}/${section.total})</span>
                                        </div>
                                    </div>
                                    ${section.filesWithout && section.filesWithout.length > 0 ? `
                                        <div style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid #334155;">
                                            <span style="color: #94a3b8; font-size: 0.75rem;">
                                                Faltando em: ${section.filesWithout.length <= 5 
                                                    ? section.filesWithout.join(', ') 
                                                    : section.filesWithout.slice(0, 5).join(', ') + ` e mais ${section.filesWithout.length - 5}`}
                                            </span>
                                        </div>
                                    ` : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }
        
        // Resumo geral
        if (analysis.averageScore !== undefined) {
            html += `
                <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid #334155;">
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                        <span style="font-size: 1.25rem;">📈</span>
                        <strong style="color: #f1f5f9; font-size: 0.875rem;">Resumo Geral</strong>
                    </div>
                    <p style="color: #cbd5e1; font-size: 0.8125rem;">
                        Score médio de completude: <strong style="color: #f1f5f9;">${analysis.averageScore}%</strong>
                    </p>
                </div>
            `;
        }
        
        analysisContainer.innerHTML = html;
    }

    /**
     * Retorna label traduzido para tipo de marco
     */
    getTypeLabel(type) {
        const labels = {
            'infrastructure': 'Infraestrutura',
            'feature': 'Funcionalidade',
            'bugfix': 'Correção de Bug',
            'improvement': 'Melhoria',
            'documentation': 'Documentação',
            'other': 'Outro'
        };
        return labels[type] || type || 'Outro';
    }
    
    /**
     * Cria gráfico de timeline de avanços por marco
     * Eixo Y: Tipos de avanço (Estrutura, Funcionalidade, etc.)
     * Eixo X: Marcos (Marco 1, Marco 2, etc.)
     * Cada avanço tem bolinha no marco criado e linha tracejada para marcos seguintes
     */
    createMilestonesChart(projectMetrics) {
        const ctx = document.getElementById('chart-milestones');
        if (!ctx) {
            console.warn('⚠️ Canvas chart-milestones não encontrado');
            return;
        }
        
        // Se não houver dados, mostrar mensagem
        if (!projectMetrics) {
            this.showNoDataMessage('chart-milestones', 
                'Sem dados de projeto', 
                'Gere métricas de projeto para visualizar marcos');
            return;
        }
        
        // Remover mensagem se houver dados
        this.hideNoDataMessage('chart-milestones');

        if (this.charts.milestones) {
            this.charts.milestones.destroy();
        }

        // Ordenar marcos do mais antigo para o mais novo (por data)
        const milestones = (projectMetrics.milestones || []).sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return dateA - dateB; // Mais antigo primeiro (crescente)
        });
        
        if (milestones.length === 0) {
            return;
        }
        
        // Mapeamento de tipos para nomes em português
        const typeMapping = {
            'infrastructure': 'Estrutura',
            'feature': 'Funcionalidade',
            'bugfix': 'Correção de Bugs',
            'improvement': 'Melhoria',
            'documentation': 'Documentação'
        };
        
        // Cores baseadas no tipo
        const typeColors = {
            'infrastructure': this.chartColors.primary,
            'feature': this.chartColors.success,
            'bugfix': this.chartColors.danger,
            'improvement': this.chartColors.info,
            'documentation': this.chartColors.warning
        };
        
        // Identificar todos os tipos de avanço únicos presentes nos marcos
        const uniqueTypes = [...new Set(milestones.map(m => m.type))];
        const advancementTypes = uniqueTypes.map(type => ({
            key: type,
            label: typeMapping[type] || type,
            color: typeColors[type] || this.chartColors.info
        }));
        
        // Criar labels para eixo X (Marco 1, Marco 2, etc.)
        const labels = milestones.map((_, index) => `Marco ${index + 1}`);
        
        // Criar áreas de fundo coloridas para cada marco (delimitar área de cada marco)
        // Cores alternadas para melhor visualização (aumentar opacidade para ficar mais visível)
        const marcoColors = [
            'rgba(59, 130, 246, 0.15)',   // Azul claro
            'rgba(16, 185, 129, 0.15)',   // Verde claro
            'rgba(139, 92, 246, 0.15)',   // Roxo claro
            'rgba(236, 72, 153, 0.15)',   // Rosa claro
            'rgba(251, 146, 60, 0.15)',   // Laranja claro
            'rgba(34, 197, 94, 0.15)',   // Verde esmeralda claro
            'rgba(168, 85, 247, 0.15)'    // Roxo violeta claro
        ];
        
        // Criar áreas de fundo usando annotations (plugin Chart.js)
        // Preparar annotations para criar retângulos verticais para cada marco
        const marcoAnnotations = milestones.map((milestone, index) => {
            const color = marcoColors[index % marcoColors.length];
            const minY = -0.5;
            const maxY = advancementTypes.length - 0.5;
            const leftX = index - 0.5;
            const rightX = index + 0.5;
            
            return {
                type: 'box',
                xMin: leftX,
                xMax: rightX,
                yMin: minY,
                yMax: maxY,
                backgroundColor: color,
                borderColor: 'transparent',
                borderWidth: 0
            };
        });
        
        // Criar datasets vazios apenas para manter estrutura (as áreas serão annotations)
        const marcoAreaDatasets = [];
        
        // Criar datasets para cada tipo de avanço
        // Cada tipo terá uma linha que começa no primeiro marco deste tipo e continua tracejada até o último marco
        const advancementDatasets = advancementTypes.map((advType, typeIndex) => {
            // Encontrar todos os marcos deste tipo
            const milestonesOfType = milestones
                .map((m, index) => ({ milestone: m, index }))
                .filter(({ milestone }) => milestone.type === advType.key);
            
            if (milestonesOfType.length === 0) {
                return null;
            }
            
            // Encontrar primeiro marco deste tipo
            const firstMarcoIndex = milestonesOfType[0].index;
            
            // Criar dados: linha começa no primeiro marco deste tipo e continua até o último marco geral
            // Isso mostra que o avanço está implementado e herdado por todos os marcos seguintes
            // Usar formato {x, y} para compatibilidade com eixo linear
            const data = [];
            
            // Do primeiro marco deste tipo até o último marco geral: linha tracejada
            // Mostra que está implementado e herdado
            for (let i = firstMarcoIndex; i < milestones.length; i++) {
                data.push({
                    x: i, // Índice numérico do marco
                    y: typeIndex // Posição Y do tipo de avanço
                });
            }
            
            return {
                label: advType.label,
                data: data,
                borderColor: advType.color,
                backgroundColor: advType.color,
                borderWidth: 2,
                fill: false,
                tension: 0, // Linha reta
                pointRadius: 0, // Sem pontos na linha (bolinhas serão datasets separados)
                pointHoverRadius: 0,
                borderDash: [5, 5], // Linha tracejada para mostrar herança
                spanGaps: false, // Não conectar gaps
                order: 0 // Renderizar linhas primeiro
            };
        }).filter(dataset => dataset !== null);
        
        // Criar datasets para bolinhas (pontos de criação)
        // Criar mapeamento: datasetIndex -> milestoneIndex para tooltip preciso
        const datasetToMilestoneMap = new Map();
        let pointDatasetIndex = 0;
        
        const pointDatasets = milestones.map((milestone, index) => {
            const typeIndex = advancementTypes.findIndex(at => at.key === milestone.type);
            if (typeIndex === -1) return null;
            
            const advType = advancementTypes[typeIndex];
            
            // Armazenar mapeamento: índice do dataset de bolinha -> índice do marco
            // Considerar datasets de avanço + índice da bolinha
            const currentDatasetIndex = advancementDatasets.length + pointDatasetIndex;
            datasetToMilestoneMap.set(currentDatasetIndex, index);
            pointDatasetIndex++;
            
            return {
                type: 'scatter',
                label: `${milestone.name} - Criação`,
                data: [{
                    x: index, // Índice numérico do marco (0, 1, 2, etc.)
                    y: typeIndex // Posição Y do tipo de avanço
                }],
                backgroundColor: advType.color,
                borderColor: '#ffffff',
                borderWidth: 2,
                pointRadius: 8,
                pointHoverRadius: 10,
                pointBackgroundColor: advType.color,
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                showLine: false,
                fill: false,
                order: 1 // Renderizar bolinhas por cima das linhas
            };
        }).filter(dataset => dataset !== null);

        // Combinar datasets (linhas de avanço e bolinhas)
        // Áreas de marco são criadas via annotations, não como datasets
        const allDatasets = [...advancementDatasets, ...pointDatasets];

        this.charts.milestones = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: allDatasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    // Plugin de annotation para áreas de fundo dos marcos
                    annotation: {
                        annotations: marcoAnnotations
                    },
                    legend: { 
                        display: true,
                        position: 'right',
                        labels: {
                            color: '#94a3b8',
                            usePointStyle: true,
                            padding: 15,
                            // Filtrar legenda para mostrar apenas tipos de avanço (não os marcos individuais)
                            filter: function(item, chart) {
                                const datasetIndex = item.datasetIndex;
                                // Mostrar apenas datasets de tipos de avanço (linhas tracejadas)
                                // Ocultar datasets de bolinhas individuais (scatter)
                                return datasetIndex < advancementDatasets.length;
                            }
                        }
                    },
                    tooltip: {
                        enabled: true,
                        callbacks: {
                            title: (items) => {
                                const item = items[0];
                                const datasetIndex = item.datasetIndex;
                                
                                // Verificar se é uma bolinha (dataset de scatter)
                                if (item.dataset.type === 'scatter') {
                                    // Usar mapeamento para identificar o marco correto
                                    const milestoneIndex = datasetToMilestoneMap.get(datasetIndex);
                                    if (milestoneIndex !== undefined && milestoneIndex < milestones.length) {
                                        const milestone = milestones[milestoneIndex];
                                        return milestone.name;
                                    }
                                }
                                return '';
                            },
                            label: (context) => {
                                const datasetIndex = context.datasetIndex;
                                
                                // Verificar se é uma bolinha (dataset de scatter)
                                if (context.dataset.type === 'scatter') {
                                    // Usar mapeamento para identificar o marco correto
                                    const milestoneIndex = datasetToMilestoneMap.get(datasetIndex);
                                    
                                    if (milestoneIndex !== undefined && milestoneIndex < milestones.length) {
                                        const milestone = milestones[milestoneIndex];
                                        
                                        return [
                                            `Marco: ${milestone.name}`,
                                            `Tipo: ${typeMapping[milestone.type] || milestone.type}`,
                                            `Data de Criação: ${new Date(milestone.date).toLocaleDateString('pt-BR')}`,
                                            `Descrição: ${milestone.description || 'Sem descrição'}`
                                        ];
                                    }
                                }
                                // Para linhas tracejadas, não mostrar tooltip
                                return [];
                            },
                            // Filtrar tooltips para mostrar apenas quando hover sobre bolinhas
                            filter: function(tooltipItem) {
                                // Mostrar tooltip apenas para bolinhas (scatter), não para linhas
                                return tooltipItem.dataset.type === 'scatter';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'linear', // Usar linear para suportar scatter plots com índices numéricos
                        min: -0.5,
                        max: milestones.length - 0.5,
                        ticks: {
                            color: '#94a3b8',
                            stepSize: 1,
                            callback: function(value) {
                                const index = Math.round(value);
                                if (index >= 0 && index < labels.length) {
                                    return labels[index];
                                }
                                return '';
                            }
                        },
                        grid: {
                            color: '#334155'
                        },
                        title: {
                            display: true,
                            text: 'Marcos',
                            color: '#94a3b8',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        }
                    },
                    y: {
                        type: 'linear',
                        // Customizar construção dos ticks para posicionar labels no centro das raias
                        afterBuildTicks: function(scale) {
                            // Criar ticks customizados apenas nos valores intermediários (centro das raias)
                            // Cada tick deve ser um objeto com 'value' e 'label'
                            const customTicks = [];
                            for (let i = 0; i < advancementTypes.length; i++) {
                                customTicks.push({
                                    value: i + 0.5, // Valor intermediário (centro da raia)
                                    label: advancementTypes[i].label
                                });
                            }
                            // Substituir os ticks padrão pelos customizados
                            scale.ticks = customTicks;
                        },
                        ticks: {
                            color: '#94a3b8',
                            // Usar callback para exibir labels dos ticks customizados
                            callback: function(value, index, ticks) {
                                // Se temos ticks customizados com labels, usar diretamente
                                if (ticks && ticks[index] && typeof ticks[index] === 'object' && ticks[index].label) {
                                    return ticks[index].label;
                                }
                                // Fallback: verificar se é valor intermediário
                                const remainder = value % 1;
                                if (Math.abs(remainder - 0.5) < 0.01) {
                                    const idx = Math.round(value - 0.5);
                                    if (idx >= 0 && idx < advancementTypes.length) {
                                        return advancementTypes[idx].label;
                                    }
                                }
                                return '';
                            },
                            // Ajustar padding para melhor posicionamento
                            padding: 10,
                            // Desabilitar autoSkip para garantir que todos os ticks sejam exibidos
                            autoSkip: false
                        },
                        grid: {
                            color: '#334155',
                            // Manter linhas do grid nos valores inteiros (0, 1, 2, etc.)
                            drawOnChartArea: true
                        },
                        title: {
                            display: true,
                            text: 'Avanço',
                            color: '#94a3b8',
                            font: {
                                size: 14,
                                weight: 'bold'
                            },
                            // Centralizar verticalmente com as raias
                            align: 'center' // Centraliza o título verticalmente no eixo Y
                        },
                        min: -0.5,
                        max: advancementTypes.length - 0.5
                    }
                }
            }
        });
        
        // Atualizar resumo abaixo do gráfico
        this.updateMilestonesSummary(milestones);
    }
    
    /**
     * Atualiza o resumo de marcos abaixo do gráfico
     */
    updateMilestonesSummary(milestones) {
        const summaryContainer = document.getElementById('milestones-summary');
        if (!summaryContainer) {
            // Criar container se não existir
            const chartContainer = document.getElementById('chart-milestones')?.closest('.chart-container');
            if (chartContainer) {
                const newContainer = document.createElement('div');
                newContainer.id = 'milestones-summary';
                newContainer.style.cssText = 'margin-top: 1.5rem; padding: 1rem; background-color: #1e293b; border-radius: 8px; border: 1px solid #334155;';
                chartContainer.appendChild(newContainer);
                this.updateMilestonesSummary(milestones);
                return;
            }
            return;
        }
        
        if (!milestones || milestones.length === 0) {
            summaryContainer.style.display = 'none';
            return;
        }
        
        summaryContainer.style.display = 'block';
        
        // Ordenar por data (mais recente primeiro)
        const sortedMilestones = [...milestones].sort((a, b) => 
            new Date(b.date) - new Date(a.date)
        );
        
        let html = '<h4 style="color: #f1f5f9; font-size: 1rem; font-weight: 600; margin-bottom: 1rem;">📋 Resumo dos Marcos</h4>';
        
        sortedMilestones.forEach((milestone, index) => {
            const date = new Date(milestone.date);
            const typeIcon = {
                'infrastructure': '🏗️',
                'feature': '✨',
                'bugfix': '🐛',
                'improvement': '🔧',
                'documentation': '📚'
            }[milestone.type] || '📌';
            
            html += `
                <div style="margin-bottom: ${index < sortedMilestones.length - 1 ? '1rem' : '0'}; padding-bottom: ${index < sortedMilestones.length - 1 ? '1rem' : '0'}; border-bottom: ${index < sortedMilestones.length - 1 ? '1px solid #334155' : 'none'};">
                    <div style="display: flex; align-items: flex-start; gap: 0.75rem;">
                        <span style="font-size: 1.25rem; flex-shrink: 0;">${typeIcon}</span>
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                                <strong style="color: #f1f5f9; font-size: 0.875rem;">${milestone.name}</strong>
                                <span style="color: #94a3b8; font-size: 0.75rem;">${date.toLocaleDateString('pt-BR')}</span>
                                <span style="color: #64748b; font-size: 0.7rem; padding: 2px 6px; background-color: #334155; border-radius: 4px;">${milestone.type || 'N/A'}</span>
                            </div>
                            <p style="color: #cbd5e1; font-size: 0.8125rem; margin: 0; line-height: 1.5;">${milestone.description || 'Sem descrição'}</p>
                        </div>
                    </div>
                </div>
            `;
        });
        
        summaryContainer.innerHTML = html;
    }
}

// Exportar instância global
window.chartsManager = new ChartsManager();
