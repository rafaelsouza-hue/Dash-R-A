/**
 * Analisador de cobertura de testes
 */

class CoverageAnalyzer {
    constructor() {
        this.coverageData = null;
    }

    /**
     * Analisa cobertura por objeto
     */
    analyzeByObject(coverageReport) {
        if (!coverageReport || !coverageReport.objects) {
            return [];
        }

        return coverageReport.objects.map(obj => ({
            object: obj.objectName,
            coverage: obj.coveragePercentage,
            flowsCovered: obj.flowsCovered,
            flowsNotCovered: obj.flowsNotCovered,
            scenariosCovered: obj.scenariosCovered,
            scenariosNotCovered: obj.scenariosNotCovered,
            gaps: obj.gaps
        }));
    }

    /**
     * Identifica objetos com maior gap de cobertura
     */
    identifyTopGaps(coverageReport, limit = 10) {
        if (!coverageReport || !coverageReport.objects) {
            return [];
        }

        return coverageReport.objects
            .map(obj => ({
                object: obj.objectName,
                totalGaps: obj.flowsNotCovered + obj.scenariosNotCovered,
                flowsGaps: obj.flowsNotCovered,
                scenariosGaps: obj.scenariosNotCovered,
                coverage: obj.coveragePercentage
            }))
            .sort((a, b) => b.totalGaps - a.totalGaps)
            .slice(0, limit);
    }

    /**
     * Calcula cobertura por Record Type
     */
    analyzeByRecordType(coverageReport) {
        // Esta análise requer dados mais detalhados
        // Por enquanto, retornar estrutura básica
        if (!coverageReport || !coverageReport.objects) {
            return {};
        }

        const byRecordType = {};
        
        coverageReport.objects.forEach(obj => {
            // Simplificado - assumir que cada objeto tem record types
            // Em implementação futura, buscar dados reais do Brain
            if (!byRecordType[obj.objectName]) {
                byRecordType[obj.objectName] = {
                    covered: 0,
                    notCovered: obj.recordTypesNotCovered || 0,
                    total: obj.recordTypesNotCovered || 0
                };
            }
        });

        return byRecordType;
    }

    /**
     * Calcula evolução de cobertura ao longo do tempo
     */
    calculateCoverageEvolution(coverageReport, historyData) {
        // Esta análise requer dados históricos de cobertura
        // Por enquanto, retornar estrutura básica
        return {
            current: coverageReport?.summary?.coveragePercentage || 0,
            target: 80, // Meta de 80% de cobertura
            trend: 'stable' // stable, increasing, decreasing
        };
    }

    /**
     * Agrupa gaps por tipo
     */
    groupGapsByType(coverageReport) {
        if (!coverageReport || !coverageReport.objects) {
            return {
                flows: [],
                scenarios: [],
                recordTypes: []
            };
        }

        const gaps = {
            flows: [],
            scenarios: [],
            recordTypes: []
        };

        coverageReport.objects.forEach(obj => {
            if (obj.gaps) {
                if (obj.gaps.flows) {
                    gaps.flows.push(...obj.gaps.flows.map(f => ({
                        object: obj.objectName,
                        ...f
                    })));
                }
                if (obj.gaps.scenarios) {
                    gaps.scenarios.push(...obj.gaps.scenarios.map(s => ({
                        object: obj.objectName,
                        ...s
                    })));
                }
                if (obj.gaps.recordTypes) {
                    gaps.recordTypes.push(...obj.gaps.recordTypes.map(rt => ({
                        object: obj.objectName,
                        ...rt
                    })));
                }
            }
        });

        return gaps;
    }
}

// Exportar instância global
window.coverageAnalyzer = new CoverageAnalyzer();
