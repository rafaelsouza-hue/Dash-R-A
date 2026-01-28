/**
 * Carregador de dados para o dashboard
 */

class DataLoader {
    constructor() {
        this.historyData = null;
        this.evolutionData = null;
    }

    /**
     * Carrega dados do histórico de execuções
     * Tenta carregar de dashboard/data/history.json primeiro, depois de ../public/history.json como fallback
     */
    async loadHistory() {
        const cacheBuster = `?t=${Date.now()}`;
        
        // Tentar primeiro de history.json na raiz do public (dashboard público)
        try {
            const response = await fetch(`history.json${cacheBuster}`);
            if (response.ok) {
                this.historyData = await response.json();
                return this.historyData;
            }
        } catch (error) {
            console.warn('Não foi possível carregar de history.json, tentando fallback...', error);
        }
        
        // Fallback: tentar de data/history.json (compatibilidade)
        try {
            const response = await fetch(`data/history.json${cacheBuster}`);
            if (response.ok) {
                this.historyData = await response.json();
                console.log('✅ Carregado de data/history.json (fallback)');
                return this.historyData;
            }
        } catch (error) {
            console.warn('Não foi possível carregar de data/history.json', error);
        }
        
        // Se ambos falharem, retornar estrutura vazia
        console.error('Erro ao carregar histórico de ambos os locais');
        return {
            executions: [],
            metadata: {
                lastUpdate: null,
                totalExecutions: 0,
                totalRegressions: 0,
                totalLocalExecutions: 0
            }
        };
    }

    /**
     * Carrega dados de evolução de testes
     * Tenta carregar de dashboard/data/test-evolution.json primeiro, depois de ../public/test-evolution.json como fallback
     */
    async loadEvolution() {
        const cacheBuster = `?t=${Date.now()}`;
        
        // Tentar primeiro de test-evolution.json na raiz do public (dashboard público)
        try {
            const response = await fetch(`test-evolution.json${cacheBuster}`);
            if (response.ok) {
                this.evolutionData = await response.json();
                return this.evolutionData;
            }
        } catch (error) {
            console.warn('Não foi possível carregar de test-evolution.json, tentando fallback...', error);
        }
        
        // Fallback: tentar de data/test-evolution.json (compatibilidade)
        try {
            const response = await fetch(`data/test-evolution.json${cacheBuster}`);
            if (response.ok) {
                this.evolutionData = await response.json();
                console.log('✅ Carregado de data/test-evolution.json (fallback)');
                return this.evolutionData;
            }
        } catch (error) {
            console.warn('Não foi possível carregar de data/test-evolution.json', error);
        }
        
        // Se ambos falharem, retornar estrutura vazia
        console.error('Erro ao carregar evolução de ambos os locais');
        return {
            tests: [],
            evolution: {},
            byFunctionality: {},
            byPriority: {},
            metadata: {
                lastUpdate: null,
                totalTests: 0,
                totalFiles: 0
            }
        };
    }

    /**
     * Filtra execuções baseado em critérios
     */
    filterExecutions(filters) {
        if (!this.historyData || !this.historyData.executions) {
            return [];
        }

        return this.historyData.executions.filter(exec => {
            if (filters.date && exec.date !== filters.date) {
                return false;
            }
            if (filters.version && exec.version !== filters.version) {
                return false;
            }
            if (filters.release && exec.release !== filters.release) {
                return false;
            }
            if (filters.type && exec.executionType !== filters.type) {
                return false;
            }
            if (filters.environment && exec.environment !== filters.environment) {
                return false;
            }
            if (filters.testType && exec.testType !== filters.testType) {
                return false;
            }
            return true;
        });
    }

    /**
     * Busca execuções por texto
     */
    searchExecutions(query) {
        if (!this.historyData || !this.historyData.executions) {
            return [];
        }

        if (!query || query.trim() === '') {
            return this.historyData.executions;
        }

        const lowerQuery = query.toLowerCase();
        return this.historyData.executions.filter(exec => {
            return (
                exec.version?.toLowerCase().includes(lowerQuery) ||
                exec.release?.toLowerCase().includes(lowerQuery) ||
                exec.environment?.toLowerCase().includes(lowerQuery) ||
                exec.timestamp?.toLowerCase().includes(lowerQuery)
            );
        });
    }

    /**
     * Ordena execuções
     */
    sortExecutions(executions, sortBy) {
        const [field, direction] = sortBy.split('-');
        const sorted = [...executions];

        sorted.sort((a, b) => {
            let aVal = a[field];
            let bVal = b[field];

            // Converter para número se necessário
            if (field === 'totalTests' || field === 'passed' || field === 'failed' || 
                field === 'successRate' || field === 'adjustedSuccessRate') {
                aVal = Number(aVal) || 0;
                bVal = Number(bVal) || 0;
            }

            // Converter timestamp para número
            if (field === 'timestamp') {
                aVal = new Date(aVal).getTime();
                bVal = new Date(bVal).getTime();
            }

            if (direction === 'asc') {
                return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
            } else {
                return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
            }
        });

        return sorted;
    }

    /**
     * Calcula métricas agregadas
     */
    calculateAggregatedMetrics(executions) {
        if (!executions || executions.length === 0) {
            return {
                totalExecutions: 0,
                totalRegressions: 0,
                totalLocal: 0,
                avgSuccessRate: 0,
                avgAdjustedRate: 0,
                totalTimeGained: 0
            };
        }

        const totalExecutions = executions.length;
        const totalRegressions = executions.filter(e => e.executionType === 'full').length;
        const totalLocal = executions.filter(e => e.executionType === 'local').length;
        
        const totalSuccessRate = executions.reduce((sum, e) => sum + (e.successRate || 0), 0);
        const avgSuccessRate = totalSuccessRate / totalExecutions;
        
        const totalAdjustedRate = executions.reduce((sum, e) => sum + (e.adjustedSuccessRate || 0), 0);
        const avgAdjustedRate = totalAdjustedRate / totalExecutions;
        
        const totalTimeGained = executions.reduce((sum, e) => sum + (e.timeGained || 0), 0);

        return {
            totalExecutions,
            totalRegressions,
            totalLocal,
            avgSuccessRate: Math.round(avgSuccessRate * 100) / 100,
            avgAdjustedRate: Math.round(avgAdjustedRate * 100) / 100,
            totalTimeGained
        };
    }

    /**
     * Formata duração em formato hh:mm (horas:minutos)
     */
    formatDuration(ms) {
        if (!ms || ms < 0) return '00:00';
        
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const minsRestantes = minutes % 60;
        
        // Se tiver segundos mas menos de 1 minuto, mostrar pelo menos 1 minuto
        const finalMinutes = (seconds > 0 && minutes === 0) ? 1 : minsRestantes;
        
        // Formato hh:mm (ex: 00:01, 00:27, 02:30, 7646:53)
        // Horas podem ter qualquer quantidade de dígitos, minutos sempre 2 dígitos
        return `${hours}:${String(finalMinutes).padStart(2, '0')}`;
    }

    /**
     * Obtém valores únicos para filtros
     */
    getUniqueValues(field) {
        if (!this.historyData || !this.historyData.executions) {
            return [];
        }

        const values = new Set();
        this.historyData.executions.forEach(exec => {
            if (exec[field]) {
                values.add(exec[field]);
            }
        });

        return Array.from(values).sort();
    }
}

// Exportar instância global
window.dataLoader = new DataLoader();
