import React, { useMemo } from 'react';
import { Info } from 'lucide-react';
import { Lead as LeadUI } from '@/types/leads';
import { Lead as CampaignLead } from '@/types/campaigns';
import { ColumnMapping } from '@/types/campaigns';
import { TooltipInfo } from '@/components/utils/TooltipInfo';

interface LeadsTableViewProps {
    leads: LeadUI[];
    campaignLeads: CampaignLead[];
    columnMapping: ColumnMapping[];
    searchQuery: string;
}

interface TableHeader {
    key: string;
    displayName: string;
    normalisedColumnName: string;
}

const buildTableHeaders = (columnMapping: ColumnMapping[]): TableHeader[] => {
    if (!columnMapping || columnMapping.length === 0) {
        // Fallback: generate headers from standard LinkedIn fields
        return [
            { key: 'linkedinUrl', displayName: 'LinkedIn URL', normalisedColumnName: 'linkedinUrl' },
            { key: 'firstName', displayName: 'First Name', normalisedColumnName: 'firstName' },
            { key: 'lastName', displayName: 'Last Name', normalisedColumnName: 'lastName' },
            { key: 'email', displayName: 'Email', normalisedColumnName: 'email' },
            { key: 'company', displayName: 'Company', normalisedColumnName: 'company' },
            { key: 'jobTitle', displayName: 'Job Title', normalisedColumnName: 'jobTitle' },
            { key: 'location', displayName: 'Location', normalisedColumnName: 'location' },
            { key: 'headline', displayName: 'Headline', normalisedColumnName: 'headline' },
        ];
    }

    return columnMapping.map(mapping => ({
        key: mapping.normalisedColumnName,
        displayName: mapping.csvColumnName,
        normalisedColumnName: mapping.normalisedColumnName,
    }));
};

const getCellValue = (lead: CampaignLead, columnKey: string): string => {
    // Try to get value from details first
    if (lead.details && lead.details[columnKey] !== undefined) {
        const value = lead.details[columnKey];
        return value !== null && value !== undefined ? String(value) : '';
    }
    
    // Try direct properties
    if (lead[columnKey as keyof CampaignLead] !== undefined) {
        const value = lead[columnKey as keyof CampaignLead];
        return value !== null && value !== undefined ? String(value) : '';
    }
    
    // Try customVars
    if (lead.customVars && lead.customVars[columnKey] !== undefined) {
        const value = lead.customVars[columnKey];
        return value !== null && value !== undefined ? String(value) : '';
    }
    
    return '';
};

export const LeadsTableView: React.FC<LeadsTableViewProps> = ({
    leads: _leads, // Keep for compatibility but use campaignLeads
    campaignLeads,
    columnMapping,
    searchQuery,
}) => {
    const headers = useMemo(() => buildTableHeaders(columnMapping), [columnMapping]);

    // Filter leads based on search query
    const filteredLeads = useMemo(() => {
        if (!searchQuery.trim()) {
            return campaignLeads;
        }

        const query = searchQuery.toLowerCase().trim();
        return campaignLeads.filter(lead => {
            // Search across all column values
            return headers.some(header => {
                const value = getCellValue(lead, header.key);
                return value.toLowerCase().includes(query);
            });
        });
    }, [campaignLeads, searchQuery, headers]);

    return (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        {headers.map((header) => (
                            <th
                                key={header.key}
                                scope="col"
                                className="font-medium text-gray-700 py-3 px-4 whitespace-nowrap"
                            >
                                <div className="flex items-center gap-1.5">
                                    <span className="truncate">
                                        {header.displayName}
                                    </span>
                                    <TooltipInfo
                                        trigger={
                                            <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 flex-shrink-0" />
                                        }
                                        content={
                                            <div className="font-normal">
                                           Inserted as <span className="font-bold">{header.normalisedColumnName}</span>
                                            </div>
                                        }
                                        side="top"
                                        align="center"
                                    />
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {filteredLeads.length === 0 ? (
                        <tr>
                            <td
                                colSpan={headers.length}
                                className="px-6 py-8 text-center text-gray-500"
                            >
                                No leads found
                            </td>
                        </tr>
                    ) : (
                        filteredLeads.map((lead) => {
                        if (!lead.id) return null;

                        return (
                            <tr key={lead.id} className="hover:bg-gray-50">
                                {headers.map((header) => {
                                    const value = getCellValue(lead, header.key);
                                    const isUrl = header.key.toLowerCase().includes('url') || 
                                                  header.key.toLowerCase().includes('link') ||
                                                  header.key.toLowerCase() === 'linkedinurl';
                                    const displayValue = value || '—';
                                    const isEmpty = !value;
                                    
                                    return (
                                        <td
                                            key={header.key}
                                            className="px-6 py-4 text-sm text-gray-900 max-w-[200px]"
                                        >
                                            {isUrl && value ? (
                                                <TooltipInfo
                                                    trigger={
                                                        <a
                                                            href={value}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-blue-600 hover:text-blue-800 hover:underline truncate block"
                                                        >
                                                            {value}
                                                        </a>
                                                    }
                                                    content={value}
                                                    side="top"
                                                    align="start"
                                                />
                                            ) : (
                                                <TooltipInfo
                                                    trigger={
                                                        <span className={`truncate block ${isEmpty ? 'text-gray-400 italic' : ''}`}>
                                                            {displayValue}
                                                        </span>
                                                    }
                                                    content={isEmpty ? '' : value}
                                                    side="top"
                                                    align="start"
                                                />
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    }))}
                </tbody>
            </table>
        </div>
    );
};

