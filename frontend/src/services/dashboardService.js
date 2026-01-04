/**
 * Dashboard Service - API calls for dashboard stats
 */
import apiClient from '../utils/api-client';
export const dashboardService = {
    /**
     * Get school summary with stats
     */
    async getSchoolSummary(schoolId) {
        const response = await apiClient.get(`/schools/${schoolId}/summary`);
        return response.data;
    },
    /**
     * Get dashboard stats for a single school (simplified)
     */
    async getStats(schoolId) {
        const summary = await this.getSchoolSummary(schoolId);
        return {
            total_products: summary.total_products,
            total_clients: summary.total_clients,
            total_sales: summary.total_sales,
            total_orders: summary.total_orders || 0,
        };
    },
    /**
     * Get aggregated stats for multiple schools
     */
    async getAggregatedStats(schools) {
        // Fetch stats for all schools in parallel
        const statsPromises = schools.map(async (school) => {
            try {
                const summary = await this.getSchoolSummary(school.id);
                return {
                    school_id: school.id,
                    school_name: school.name,
                    school_code: school.code,
                    total_products: summary.total_products || 0,
                    total_clients: summary.total_clients || 0,
                    total_sales: summary.total_sales || 0,
                    total_orders: summary.total_orders || 0,
                };
            }
            catch {
                // If a school fails, return zeros
                return {
                    school_id: school.id,
                    school_name: school.name,
                    school_code: school.code,
                    total_products: 0,
                    total_clients: 0,
                    total_sales: 0,
                    total_orders: 0,
                };
            }
        });
        const schoolStats = await Promise.all(statsPromises);
        // Calculate totals
        const totals = schoolStats.reduce((acc, stats) => ({
            total_products: acc.total_products + stats.total_products,
            total_clients: acc.total_clients + stats.total_clients,
            total_sales: acc.total_sales + stats.total_sales,
            total_orders: acc.total_orders + stats.total_orders,
        }), { total_products: 0, total_clients: 0, total_sales: 0, total_orders: 0 });
        return {
            totals,
            by_school: schoolStats,
            school_count: schools.length,
        };
    },
};
