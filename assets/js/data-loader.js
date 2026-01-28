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
     * Carrega dados do CSV de regressões para análise de tendência de criação
     */
    async loadCSVRegressionData() {
        // Tentar múltiplos caminhos possíveis
        // Para GitHub Pages, o CSV precisa estar em data/
        const timestamp = new Date().getTime();
        const csvPaths = [
            `data/regressoes.csv?v=${timestamp}`,
            `data/Regressões - Regressão (1).csv?v=${timestamp}`
        ];
        
        for (const path of csvPaths) {
            try {
                console.log(`Tentando carregar CSV de: ${path}`);
                const response = await fetch(path, {
                    cache: 'no-store' // Forçar não usar cache
                });
                if (response.ok) {
                    const csvText = await response.text();
                    if (!csvText || csvText.trim() === '') {
                        console.warn(`CSV vazio para ${path}`);
                        continue;
                    }
                    console.log(`CSV carregado, tamanho: ${csvText.length} caracteres`);
                    const parsed = this.parseCSV(csvText);
                    if (parsed && parsed.byMonth && Object.keys(parsed.byMonth).length > 0) {
                        console.log(`✅ CSV parseado com sucesso de: ${path}`);
                        return parsed;
                    } else {
                        console.warn(`CSV carregado mas não foi possível parsear ou não tem dados: ${path}`, parsed);
                    }
                } else {
                    console.warn(`Resposta não OK para ${path}: ${response.status} ${response.statusText}`);
                }
            } catch (error) {
                console.warn(`Erro ao carregar ${path}:`, error.message);
                // Tentar próximo caminho
                continue;
            }
        }
        
        console.warn('Não foi possível carregar CSV de regressões de nenhum caminho');
        return null;
    }

    /**
     * Parse simples de CSV (suporta campos com quebras de linha entre aspas)
     */
    parseCSV(csvText) {
        try {
            if (!csvText || csvText.trim() === '') {
                console.warn('CSV vazio ou inválido');
                return null;
            }
            
            const rows = [];
            let currentRow = [];
            let currentField = '';
            let insideQuotes = false;
            
            for (let i = 0; i < csvText.length; i++) {
                const char = csvText[i];
                const nextChar = csvText[i + 1];
                
                if (char === '"') {
                    if (insideQuotes && nextChar === '"') {
                        // Escaped quote
                        currentField += '"';
                        i++; // Skip next quote
                    } else {
                        // Toggle quote state
                        insideQuotes = !insideQuotes;
                    }
                } else if (char === ',' && !insideQuotes) {
                    // End of field
                    currentRow.push(currentField.trim());
                    currentField = '';
                } else if ((char === '\n' || char === '\r') && !insideQuotes) {
                    // End of row (but handle \r\n)
                    if (char === '\n' || (char === '\r' && nextChar !== '\n')) {
                        if (currentField || currentRow.length > 0) {
                            currentRow.push(currentField.trim());
                            rows.push(currentRow);
                            currentRow = [];
                            currentField = '';
                        }
                    }
                } else {
                    currentField += char;
                }
            }
            
            // Add last field/row if exists
            if (currentField || currentRow.length > 0) {
                currentRow.push(currentField.trim());
                if (currentRow.length > 0) {
                    rows.push(currentRow);
                }
            }
            
            if (rows.length === 0) return null;
            
            // Primeira linha são os headers
            const headers = rows[0];
            console.log('Headers do CSV:', headers);
            
            // Coluna L é o índice 11 (A=0, B=1, ..., L=11)
            let dataIndex = headers.indexOf('Data de criação');
            if (dataIndex === -1) {
                // Se não encontrou pelo nome, usar índice 11 diretamente (coluna L)
                if (headers.length > 11) {
                    dataIndex = 11;
                    console.log('Usando índice 11 (coluna L) diretamente para data de criação');
                } else {
                    console.warn('CSV não tem coluna suficiente. Esperado pelo menos 12 colunas (L), encontrado:', headers.length);
                    return null;
                }
            }
            
            const automatedIndex = headers.indexOf('Automatizado?');
            const automationDateIndex = headers.indexOf('Data da automatização');
            const idIndex = headers.indexOf('ID');
            
            if (dataIndex < 0 || dataIndex >= headers.length) {
                console.warn('Índice de data inválido. Headers disponíveis:', headers);
                return null;
            }
            
            // Processar dados
            const tests = [];
            const byMonth = {}; // Agrupamento por Data de criação (para Total de Testes)
            const byAutomationMonth = {}; // Agrupamento por Data da automatização (para Testes Automatizados)
            let processedCount = 0;
            let skippedCount = 0;
            
            // Função auxiliar para parsear data e retornar monthKey
            function parseDateToMonthKey(dateString) {
                if (!dateString || dateString.trim() === '') return null;
                
                // Tentar formato DD/MM/YYYY
                const dateMatch = dateString.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
                if (dateMatch) {
                    const [, day, month, year] = dateMatch;
                    return `${year}-${month.padStart(2, '0')}`;
                }
                
                // Tentar outros formatos (DD-MM-YYYY)
                const dateMatch2 = dateString.match(/(\d{1,2})-(\d{1,2})-(\d{4})/);
                if (dateMatch2) {
                    const [, day, month, year] = dateMatch2;
                    return `${year}-${month.padStart(2, '0')}`;
                }
                
                // Tentar Date.parse
                const dateObj = new Date(dateString);
                if (!isNaN(dateObj.getTime())) {
                    const year = dateObj.getFullYear();
                    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                    return `${year}-${month}`;
                }
                
                return null;
            }
            
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                
                if (row.length <= dataIndex) {
                    skippedCount++;
                    continue;
                }
                
                const creationDate = row[dataIndex];
                const automated = automatedIndex !== -1 && automatedIndex < row.length ? row[automatedIndex] : '';
                const automationDate = automationDateIndex !== -1 && automationDateIndex < row.length ? row[automationDateIndex] : null;
                const id = idIndex !== -1 && idIndex < row.length ? row[idIndex] : `Teste ${i}`;
                
                if (!creationDate || creationDate.trim() === '') {
                    skippedCount++;
                    continue;
                }
                
                processedCount++;
                
                // Parsear Data de criação (para Total de Testes)
                const monthKey = parseDateToMonthKey(creationDate);
                if (!monthKey) {
                    continue;
                }
                
                // Parsear Data da automatização (para Testes Automatizados)
                let automationMonthKey = null;
                if (automationDate && automationDate.trim() !== '') {
                    automationMonthKey = parseDateToMonthKey(automationDate);
                }
                
                const isAutomated = automated && (
                    automated.toLowerCase() === 'automatizado' ||
                    automated.toLowerCase() === 'sim' || 
                    automated.toLowerCase() === 'true' || 
                    automated === '1' ||
                    automated.toLowerCase() === 'yes'
                );
                
                const test = {
                    id: id,
                    createdDate: creationDate,
                    automationDate: automationDate,
                    automated: isAutomated,
                    monthKey: monthKey,
                    automationMonthKey: automationMonthKey
                };
                
                tests.push(test);
                
                // Agrupar por Data de criação (para Total de Testes)
                if (!byMonth[monthKey]) {
                    byMonth[monthKey] = [];
                }
                byMonth[monthKey].push(test);
                
                // Agrupar por Data da automatização (para Testes Automatizados)
                if (isAutomated && automationMonthKey) {
                    if (!byAutomationMonth[automationMonthKey]) {
                        byAutomationMonth[automationMonthKey] = [];
                    }
                    byAutomationMonth[automationMonthKey].push(test);
                }
            }
            
            console.log(`CSV processado: ${processedCount} testes processados, ${skippedCount} ignorados`);
            
            return {
                tests: tests,
                byMonth: byMonth,
                byAutomationMonth: byAutomationMonth,
                totalTests: tests.length,
                automatedTests: tests.filter(t => t.automated).length
            };
        } catch (error) {
            console.error('Erro ao parsear CSV:', error);
            return null;
        }
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
