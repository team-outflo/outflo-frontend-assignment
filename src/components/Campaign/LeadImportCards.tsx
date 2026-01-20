import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
    FolderSearch, 
    Compass, 
    Upload, 
    Linkedin, 
    UserPlus,
    List,
    LucideIcon
} from 'lucide-react';
import { LinkedInAccountType } from '@/components/Leads/LinkedInSearchForm';
import LinkedInIcon from '@/components/common/LinkedInIcon';

export interface LeadImportMethod {
    id: string;
    title: string;
    description: string;
    icon?: LucideIcon;
    iconComponent?: React.ComponentType<{ className?: string; size?: number; color?: string }>;
    iconImage?: string;
    iconColor: string;
    available: boolean;
    onClick: () => void;
}

interface LeadImportCardsProps {
    onCsvImport: () => void;
    onLinkedInSearch: (accountType: LinkedInAccountType) => void;
    onSavedLists: () => void;
}

const LEAD_IMPORT_METHODS: Omit<LeadImportMethod, 'onClick'>[] = [
    {
        id: 'csv-import',
        title: 'Upload CSV file',
        description: 'Add LinkedIn profiles from a CSV file',
        icon: Upload,
        iconColor: '#5a41cd',
        available: true,
    },
    {
        id: 'my-list',
        title: 'Add from my List',
        description: 'Import leads from saved list of leads',
        icon: List,
        iconColor: '#5a41cd',
        available: true,
    },
    {
        id: 'linkedin-search',
        title: 'Basic LinkedIn Search',
        description: ' Add profiles from search page of the free LinkedIn search',
        iconComponent: LinkedInIcon,
        iconColor: 'text-blue-600',
        available: true,
    },
    {
        id: 'sales-navigator',
        title: 'Sales navigator (Leads)',
        description: 'Add  profiles from sales navigator leads search URL',
        iconImage: '/icons/li_sales_nav.png',
        iconColor: 'text-blue-600',
        available: true,
    },
    {
        id: 'lead-finder',
        title: 'Recruiter',
        description: 'Import leads from LinkedIn Recruiter search URL',
        iconImage: '/icons/li_recrutier.png',
        iconColor: 'text-purple-600',
        available: true,
    },
    {
        id: 'linkedin-event',
        title: 'LinkedIn Event',
        description: 'Import leads attending an event',
        iconComponent: LinkedInIcon,
        iconColor: 'text-blue-600',
        available: false,
    },
    {
        id: 'linkedin-post',
        title: 'LinkedIn Post',
        description: 'Import comments or likes of a post',
        iconComponent: LinkedInIcon,
        iconColor: 'text-blue-600',
        available: false,
    },
    {
        id: 'linkedin-group',
        title: 'LinkedIn Group',
        description: 'Import leads from LinkedIn groups',
        iconComponent: LinkedInIcon,
        iconColor: 'text-blue-600',
        available: false,
    }
];

export const LeadImportCards: React.FC<LeadImportCardsProps> = ({
    onCsvImport,
    onLinkedInSearch,
    onSavedLists
}) => {
    const getOnClickHandler = (id: string) => {
        switch (id) {
            case 'csv-import':
                return onCsvImport;
            case 'linkedin-search':
                return () => onLinkedInSearch('classic');
            case 'sales-navigator':
                return () => onLinkedInSearch('sales_navigator');
            case 'lead-finder':
                return () => onLinkedInSearch('recruiter');
            case 'linkedin-event':
            case 'linkedin-post':
            case 'linkedin-group':
                return () => onLinkedInSearch('classic');
            case 'my-list':
                return onSavedLists;
            default:
                return () => {};
        }
    };

    const leadImportMethods: LeadImportMethod[] = LEAD_IMPORT_METHODS.map(method => ({
        ...method,
        onClick: getOnClickHandler(method.id)
    }));

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
                {leadImportMethods.map((method) => {
                    const IconComponent = method.icon;
                    const CustomIconComponent = method.iconComponent;
                    const iconImage = method.iconImage;
                    
                    return (
                        <Card
                            key={method.id}
                            className={`transition-colors bg-gray-50 ${
                                method.available 
                                    ? 'cursor-pointer hover:border-primary hover:bg-gray-100' 
                                    : 'opacity-60 cursor-not-allowed'
                            }`}
                            onClick={method.available ? method.onClick : undefined}
                        >
                            <CardContent className="p-6">
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center gap-3">
                                        {iconImage ? (
                                            <img 
                                                src={iconImage} 
                                                alt={method.title}
                                                className="h-6 w-6 object-contain"
                                            />
                                        ) : CustomIconComponent ? (
                                            <CustomIconComponent 
                                                size={24} 
                                                color={method.iconColor.includes('blue') ? '#2563eb' : method.iconColor.includes('purple') ? '#9333ea' : undefined} 
                                            />
                                        ) : IconComponent ? (
                                            method.iconColor.startsWith('#') ? (
                                                <IconComponent 
                                                    className="h-6 w-6"
                                                    style={{ color: method.iconColor }}
                                                />
                                            ) : (
                                                <IconComponent className={`h-6 w-6 ${method.iconColor}`} />
                                            )
                                        ) : null}
                                        <div className="flex-1 flex items-center gap-2">
                                            <h3 className="text-base font-medium">{method.title}</h3>
                                            {!method.available && (
                                                <Badge variant="secondary" className="text-xs bg-gray-200 text-gray-600">
                                                    COMING SOON
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{method.description}</p>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};

