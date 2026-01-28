/**
 * Carregador de dados para o dashboard
 */

/**
 * Retorna o base path para GitHub Pages (ex: /Dash-R-A). No local ou raiz retorna ''.
 * Garante que data/history.json seja pedido como /Dash-R-A/data/history.json no site.
 */
function getDataBasePath() {
    if (typeof window === 'undefined' || !window.location || !window.location.pathname) return '';
    const path = window.location.pathname;
    if (path === '/' || path === '') return '';
    return path.replace(/\/index\.html$/i, '').replace(/\/$/, '');
}

class DataLoader {
    constructor() {
        this.historyData = null;
        this.evolutionData = null;
    }

    /**
     * Carrega dados do histórico de execuções
     * Usa base path explícito no GitHub Pages e bypass de cache para forçar renderização atual.
     * @param {boolean} forceRefresh - Força atualização ignorando cache
     */
    async loadHistory(forceRefresh = false) {
        if (forceRefresh) {
            this.historyData = null;
        }
        
        const cacheBuster = `?t=${Date.now()}${forceRefresh ? '&_refresh=' + Math.random() : ''}`;
        const base = getDataBasePath();
        const noStoreOpts = {
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        };

        // 1) data/history.json com path explícito (GitHub Pages: /Dash-R-A/data/history.json)
        const dataHistoryUrl = base ? `${base}/data/history.json` : 'data/history.json';
        try {
            const response = await fetch(`${dataHistoryUrl}${cacheBuster}`, noStoreOpts);
            if (response.ok) {
                this.historyData = await response.json();
                return this.historyData;
            }
        } catch (error) {
            console.warn('Não foi possível carregar de data/history.json, tentando fallback...', error);
        }

        // 2) history.json na raiz (deploy também grava em public/history.json)
        const rootHistoryUrl = base ? `${base}/history.json` : 'history.json';
        try {
            const response = await fetch(`${rootHistoryUrl}${cacheBuster}`, noStoreOpts);
            if (response.ok) {
                this.historyData = await response.json();
                return this.historyData;
            }
        } catch (error) {
            console.warn('Não foi possível carregar de history.json (raiz)', error);
        }
        
        // 3) Fallback local: ../public/history.json
        try {
            const response = await fetch(`../public/history.json${cacheBuster}`, noStoreOpts);
            if (response.ok) {
                this.historyData = await response.json();
                return this.historyData;
            }
        } catch (error) {
            console.warn('Não foi possível carregar de ../public/history.json', error);
        }
        
        console.error('Erro ao carregar histórico de todos os locais');
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
        
        // Tentar primeiro de dashboard/data/test-evolution.json (local)
        try {
            const response = await fetch(`data/test-evolution.json${cacheBuster}`);
            if (response.ok) {
                this.evolutionData = await response.json();
                return this.evolutionData;
            }
        } catch (error) {
            console.warn('Não foi possível carregar de data/test-evolution.json, tentando fallback...', error);
        }
        
        // Fallback: tentar de ../public/test-evolution.json (compatibilidade com GitHub Pages)
        try {
            const response = await fetch(`../public/test-evolution.json${cacheBuster}`);
            if (response.ok) {
                this.evolutionData = await response.json();
                console.log('✅ Carregado de ../public/test-evolution.json (fallback)');
                return this.evolutionData;
            }
        } catch (error) {
            console.warn('Não foi possível carregar de ../public/test-evolution.json', error);
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
     * Carrega dados do CSV de regressões para análise de tendência de criação
     */
    async loadCSVRegressionData() {
        // Tentar múltiplos caminhos possíveis
        // Quando servido de dashboard/, o CSV precisa estar dentro de dashboard/ ou em data/
        // Adicionar timestamp para evitar cache
        const timestamp = new Date().getTime();
        const csvPaths = [
            `data/regressoes.csv?v=${timestamp}`,
            `data/Regressões - Regressão (1).csv?v=${timestamp}`,
            `../Planilhas/Regressões - Regressão (1).csv?v=${timestamp}`,
            `../../Planilhas/Regressões - Regressão (1).csv?v=${timestamp}`,
            `Planilhas/Regressões - Regressão (1).csv?v=${timestamp}`
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
            console.log('Total de colunas:', headers.length);
            console.log('Última coluna (índice ' + (headers.length - 1) + '):', headers[headers.length - 1]);
            console.log('Coluna AA (índice 26):', headers[26] || 'NÃO ENCONTRADA');
            
            // Coluna L é o índice 11 (A=0, B=1, ..., L=11)
            // Tentar pelo nome primeiro, depois usar índice direto
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
            
            console.log('Índices encontrados:', { 
                dataIndex, 
                automatedIndex, 
                automationDateIndex,
                idIndex, 
                totalHeaders: headers.length,
                headerNaColunaL: headers[11] || 'não encontrado',
                headerNaColunaAA: headers[26] || 'não encontrado'
            });
            
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
                
                // Debug: log primeira linha para ver estrutura
                if (i === 1) {
                    console.log('Primeira linha de dados:', row);
                    console.log('Tamanho da linha:', row.length);
                    console.log('Data na coluna L (índice 11):', row[11]);
                    console.log('Data da automatização na coluna AA (índice 26):', row[26]);
                }
                
                if (row.length <= dataIndex) {
                    skippedCount++;
                    if (i <= 3) console.log(`Linha ${i} pulada: tamanho insuficiente (${row.length} < ${dataIndex + 1})`);
                    continue;
                }
                
                const creationDate = row[dataIndex];
                const automated = automatedIndex !== -1 && automatedIndex < row.length ? row[automatedIndex] : '';
                const automationDate = automationDateIndex !== -1 && automationDateIndex < row.length ? row[automationDateIndex] : null;
                const id = idIndex !== -1 && idIndex < row.length ? row[idIndex] : `Teste ${i}`;
                
                if (!creationDate || creationDate.trim() === '') {
                    skippedCount++;
                    if (i <= 3) console.log(`Linha ${i} pulada: data vazia (${creationDate})`);
                    continue;
                }
                
                processedCount++;
                
                // Parsear Data de criação (para Total de Testes)
                const monthKey = parseDateToMonthKey(creationDate);
                if (!monthKey) {
                    if (i <= 3) console.log(`Linha ${i} pulada: não foi possível parsear data de criação (${creationDate})`);
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
                    automationDate: automationDate, // Data da automatização (coluna AA)
                    automated: isAutomated,
                    monthKey: monthKey,
                    automationMonthKey: automationMonthKey // Mês da automatização (baseado na coluna AA)
                };
                
                tests.push(test);
                
                // Agrupar por Data de criação (para Total de Testes)
                if (!byMonth[monthKey]) {
                    byMonth[monthKey] = [];
                }
                byMonth[monthKey].push(test);
                
                // Agrupar por Data da automatização (para Testes Automatizados)
                // Só agrupa se o teste está automatizado E tem data de automatização
                if (isAutomated && automationMonthKey) {
                    if (!byAutomationMonth[automationMonthKey]) {
                        byAutomationMonth[automationMonthKey] = [];
                    }
                    byAutomationMonth[automationMonthKey].push(test);
                }
            }
            
            console.log(`CSV processado: ${processedCount} testes processados, ${skippedCount} ignorados`);
            console.log('Meses encontrados (criação):', Object.keys(byMonth).sort());
            console.log('Meses encontrados (automatização):', Object.keys(byAutomationMonth).sort());
            console.log('Total de testes por mês (criação):', Object.keys(byMonth).map(m => ({ month: m, count: byMonth[m].length })));
            console.log('Total de testes por mês (automatização):', Object.keys(byAutomationMonth).map(m => ({ month: m, count: byAutomationMonth[m].length })));
            
            return {
                tests: tests,
                byMonth: byMonth, // Agrupamento por Data de criação
                byAutomationMonth: byAutomationMonth, // Agrupamento por Data da automatização
                totalTests: tests.length,
                automatedTests: tests.filter(t => t.automated).length
            };
        } catch (error) {
            console.error('Erro ao parsear CSV:', error);
            return null;
        }
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
        
        // Determinar tipo de execução (full = regressão completa, local = execução local)
        // Confiar no executionType já normalizado, mas fazer fallback se necessário
        const totalRegressions = executions.filter(e => {
            // Se já tem executionType normalizado, usar ele
            if (e.executionType) {
                return e.executionType === 'full';
            }
            // Fallback: inferir do executionId
            return e.executionId && e.executionId.includes('regression');
        }).length;
        
        const totalLocal = executions.filter(e => {
            // Se já tem executionType normalizado, usar ele
            if (e.executionType) {
                return e.executionType === 'local';
            }
            // Fallback: inferir do executionId (se não contém 'regression', é local)
            return !e.executionId || !e.executionId.includes('regression');
        }).length;
        
        // Acessar successRate corretamente (pode estar em metrics.successRate ou diretamente)
        const totalSuccessRate = executions.reduce((sum, e) => {
            const rate = e.metrics?.successRate ?? e.successRate ?? (e.total > 0 ? ((e.passed || 0) / e.total) * 100 : 0);
            return sum + rate;
        }, 0);
        const avgSuccessRate = totalSuccessRate / totalExecutions;
        
        // Adjusted rate (taxa ajustada removendo bugs reais) - usar successRate se não tiver adjusted
        const totalAdjustedRate = executions.reduce((sum, e) => {
            const adjustedRate = e.adjustedSuccessRate ?? e.metrics?.adjustedSuccessRate;
            if (adjustedRate !== undefined) {
                return sum + adjustedRate;
            }
            // Se não tiver adjusted, calcular removendo bugs reais
            const bugs = e.errorClassification?.salesforceBug || 0;
            const total = e.total || 0;
            if (total > 0 && bugs > 0) {
                const adjusted = ((e.passed || 0) / (total - bugs)) * 100;
                return sum + adjusted;
            }
            // Se não tiver bugs, usar successRate normal
            const rate = e.metrics?.successRate ?? e.successRate ?? (total > 0 ? ((e.passed || 0) / total) * 100 : 0);
            return sum + rate;
        }, 0);
        const avgAdjustedRate = totalAdjustedRate / totalExecutions;
        
        // Calcular tempo ganho (durationManual - duration)
        const totalTimeGained = executions.reduce((sum, e) => {
            const timeGained = e.timeGained;
            if (timeGained !== undefined) {
                return sum + timeGained;
            }
            // Calcular se tiver durationManual e duration
            if (e.durationManual && e.duration) {
                return sum + (e.durationManual - e.duration);
            }
            // Se não tiver durationManual, estimar: 10 minutos por teste
            if (e.total && e.duration) {
                const estimatedManual = e.total * 10 * 60 * 1000; // 10 min por teste em ms
                return sum + (estimatedManual - e.duration);
            }
            return sum;
        }, 0);

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
