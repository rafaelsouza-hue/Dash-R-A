/**
 * Analisador de dados por ambiente
 */

class EnvironmentAnalyzer {
    constructor() {
        this.environments = ['qa', 'stg', 'prod'];
    }

    /**
     * Agrupa execuções por ambiente
     */
    groupByEnvironment(executions) {
        const grouped = {};
        this.environments.forEach(env => {
            grouped[env] = [];
        });

        executions.forEach(exec => {
            const env = (exec.environment || 'qa').toLowerCase();
            if (grouped.hasOwnProperty(env)) {
                grouped[env].push(exec);
            } else {
                // Se ambiente não conhecido, adicionar a QA
                grouped['qa'].push(exec);
            }
        });

        return grouped;
    }

    /**
     * Calcula métricas agregadas por ambiente
     */
    calculateMetricsByEnvironment(executions) {
        const grouped = this.groupByEnvironment(executions);
        const metrics = {};

        this.environments.forEach(env => {
            const envExecutions = grouped[env] || [];
            const total = envExecutions.length;
            
            if (total === 0) {
                metrics[env] = {
                    totalExecutions: 0,
                    avgSuccessRate: 0,
                    avgAdjustedRate: 0,
                    totalTests: 0,
                    totalBugs: 0,
                    totalInstability: 0,
                    totalTimeGained: 0
                };
                return;
            }

            const totalTests = envExecutions.reduce((sum, e) => sum + (e.totalTests || 0), 0);
            const totalBugs = envExecutions.reduce((sum, e) => sum + (e.bugsReal || 0), 0);
            const totalInstability = envExecutions.reduce((sum, e) => sum + (e.instability || 0), 0);
            const totalTimeGained = envExecutions.reduce((sum, e) => sum + (e.timeGained || 0), 0);
            
            const avgSuccessRate = envExecutions.reduce((sum, e) => sum + (e.successRate || 0), 0) / total;
            const avgAdjustedRate = envExecutions.reduce((sum, e) => sum + (e.adjustedSuccessRate || 0), 0) / total;

            metrics[env] = {
                totalExecutions: total,
                avgSuccessRate: Math.round(avgSuccessRate * 100) / 100,
                avgAdjustedRate: Math.round(avgAdjustedRate * 100) / 100,
                totalTests: totalTests,
                totalBugs: totalBugs,
                totalInstability: totalInstability,
                totalTimeGained: totalTimeGained
            };
        });

        return metrics;
    }

    /**
     * Filtra execuções por ambiente
     */
    filterByEnvironment(executions, environment) {
        if (!environment || environment === '') {
            return executions;
        }

        return executions.filter(exec => {
            const execEnv = (exec.environment || 'qa').toLowerCase();
            return execEnv === environment.toLowerCase();
        });
    }

    /**
     * Compara métricas entre ambientes
     */
    compareEnvironments(executions) {
        const metrics = this.calculateMetricsByEnvironment(executions);
        const comparison = {
            bestSuccessRate: null,
            worstSuccessRate: null,
            mostStable: null,
            mostBugs: null,
            differences: {}
        };

        let bestRate = -1;
        let worstRate = 101;
        let mostStableEnv = null;
        let mostBugsEnv = null;
        let maxBugs = -1;

        this.environments.forEach(env => {
            const m = metrics[env];
            if (m.avgSuccessRate > bestRate) {
                bestRate = m.avgSuccessRate;
                comparison.bestSuccessRate = env.toUpperCase();
            }
            if (m.avgSuccessRate < worstRate) {
                worstRate = m.avgSuccessRate;
                comparison.worstSuccessRate = env.toUpperCase();
            }
            if (m.totalBugs > maxBugs) {
                maxBugs = m.totalBugs;
                mostBugsEnv = env.toUpperCase();
            }
        });

        comparison.mostBugs = mostBugsEnv;
        comparison.mostStable = comparison.bestSuccessRate;

        // Calcular diferenças
        const qa = metrics.qa;
        const stg = metrics.stg;
        const prod = metrics.prod;

        comparison.differences = {
            qa_vs_stg: {
                successRate: (qa.avgSuccessRate - stg.avgSuccessRate).toFixed(2),
                bugs: qa.totalBugs - stg.totalBugs
            },
            stg_vs_prod: {
                successRate: (stg.avgSuccessRate - prod.avgSuccessRate).toFixed(2),
                bugs: stg.totalBugs - prod.totalBugs
            },
            qa_vs_prod: {
                successRate: (qa.avgSuccessRate - prod.avgSuccessRate).toFixed(2),
                bugs: qa.totalBugs - prod.totalBugs
            }
        };

        return comparison;
    }
}

// Exportar instância global
window.environmentAnalyzer = new EnvironmentAnalyzer();
