/**
 * Carregador de dados do Brain
 */

class BrainDataLoader {
    constructor() {
        this.brainMetrics = null;
        this.coverageReport = null;
        this.projectMetrics = null;
    }

    /**
     * Carrega métricas do Brain
     * @param {boolean} forceRefresh - Força atualização ignorando cache
     */
    async loadBrainMetrics(forceRefresh = false) {
        // Se forceRefresh, limpar dados em cache
        if (forceRefresh) {
            this.brainMetrics = null;
        }
        
        try {
            const cacheBuster = forceRefresh ? `?t=${Date.now()}&_refresh=${Math.random()}` : `?t=${Date.now()}`;
            const response = await fetch(`data/brain-metrics.json${cacheBuster}`, {
                cache: forceRefresh ? 'no-store' : 'default',
                headers: forceRefresh ? {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                } : {}
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.brainMetrics = await response.json();
            return this.brainMetrics;
        } catch (error) {
            console.error('Erro ao carregar métricas do Brain:', error);
            return {
                generatedAt: null,
                totals: {
                    objects: 0,
                    recordTypes: 0,
                    validationRules: 0,
                    layouts: 0,
                    fields: 0,
                    testSuggestions: 0,
                    flows: 0,
                    businessRules: 0
                },
                completeness: {},
                objects: [],
                metadata: {}
            };
        }
    }

    /**
     * Carrega relatório de cobertura
     */
    async loadCoverageReport() {
        try {
            const cacheBuster = `?t=${Date.now()}`;
            const response = await fetch(`data/coverage-report.json${cacheBuster}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.coverageReport = await response.json();
            return this.coverageReport;
        } catch (error) {
            console.error('Erro ao carregar relatório de cobertura:', error);
            return {
                generatedAt: null,
                summary: {
                    totalObjects: 0,
                    totalFlows: 0,
                    totalScenarios: 0,
                    totalCovered: 0,
                    totalNotCovered: 0,
                    averageCoverage: 0,
                    coveragePercentage: 0
                },
                objects: [],
                featureFiles: 0
            };
        }
    }

    /**
     * Carrega métricas de projeto
     * @param {boolean} forceRefresh - Força atualização ignorando cache
     */
    async loadProjectMetrics(forceRefresh = false) {
        // Se forceRefresh, limpar dados em cache
        if (forceRefresh) {
            this.projectMetrics = null;
        }
        
        try {
            const cacheBuster = forceRefresh ? `?t=${Date.now()}&_refresh=${Math.random()}` : `?t=${Date.now()}`;
            const response = await fetch(`data/project-metrics.json${cacheBuster}`, {
                cache: forceRefresh ? 'no-store' : 'default',
                headers: forceRefresh ? {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                } : {}
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.projectMetrics = await response.json();
            return this.projectMetrics;
        } catch (error) {
            console.error('Erro ao carregar métricas de projeto:', error);
            return {
                generatedAt: null,
                summary: {
                    totalObjects: 0,
                    averageCompleteness: 0,
                    businessRulesCount: 0,
                    milestonesCount: 0,
                    evolutionEvents: 0
                },
                temporalEvolution: { events: [], byDate: {} },
                businessRules: { total: 0, files: [], lastUpdated: null },
                completeness: [],
                milestones: []
            };
        }
    }

    /**
     * Carrega todos os dados do Brain
     */
    async loadAll() {
        const [brainMetrics, coverageReport, projectMetrics] = await Promise.all([
            this.loadBrainMetrics(),
            this.loadCoverageReport(),
            this.loadProjectMetrics()
        ]);

        return {
            brainMetrics,
            coverageReport,
            projectMetrics
        };
    }

    /**
     * Obtém objetos ordenados por completude
     */
    getObjectsByCompleteness(limit = 10) {
        if (!this.projectMetrics || !this.projectMetrics.completeness) {
            return [];
        }

        return this.projectMetrics.completeness
            .slice(0, limit)
            .map(c => ({
                object: c.object,
                percentage: c.percentage,
                passed: c.passed,
                total: c.total
            }));
    }

    /**
     * Obtém objetos com menor cobertura
     */
    getObjectsWithLowCoverage(limit = 10) {
        if (!this.coverageReport || !this.coverageReport.objects) {
            return [];
        }

        return this.coverageReport.objects
            .filter(o => o.coveragePercentage < 50)
            .sort((a, b) => a.coveragePercentage - b.coveragePercentage)
            .slice(0, limit)
            .map(o => ({
                object: o.objectName,
                coverage: o.coveragePercentage,
                flowsNotCovered: o.flowsNotCovered,
                scenariosNotCovered: o.scenariosNotCovered
            }));
    }
}

// Exportar instância global
window.brainDataLoader = new BrainDataLoader();
