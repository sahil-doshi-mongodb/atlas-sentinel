const PARTNERS = {
    vector_search: {
        partners: ['PeerIslands (vector tuning)', 'AWS (MAP funding)', 'Voyage AI'],
        motion: 'Joint co-sell with AWS Partner SA team for cluster upsizing.',
    },
    indexing: {
        partners: ['MongoDB Performance Specialist', 'PeerIslands'],
        motion: 'Index audit engagement.',
    },
    schema_design: {
        partners: ['MongoDB Professional Services', 'Capgemini', 'Cognizant'],
        motion: 'Schema modernization workshop.',
    },
    replication: {
        partners: ['MongoDB Professional Services', 'AWS Networking team'],
        motion: 'HA architecture review.',
    },
    multi_tenant: {
        partners: ['MongoDB Multi-Tenant Architecture team'],
        motion: 'Tenancy model review.',
    },
    capacity: {
        partners: ['MongoDB Solutions Architect', 'AWS MAP funding team'],
        motion: 'Cluster sizing review and cloud co-funding.',
    },
};

export async function recommend_partner_solution({ issue_category, cloud_provider }) {
    const match = PARTNERS[issue_category] || PARTNERS.indexing;
    return {
        issue_category,
        cloud_provider: cloud_provider || 'any',
        recommended_partners: match.partners,
        co_sell_motion: match.motion,
    };
}