import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TooltipInfo } from '@/components/utils/TooltipInfo';
import { RefreshCw, Users, CheckCircle, Send, MessageCircle, Reply, UserPlus } from 'lucide-react';
import { CampaignInsights } from '@/types/campaigns';

type CardFilterType = 'connectionRequests' | 'requestsAccepted' | 'messagesSent' | 'responses';

interface CampaignAnalyticsCardsProps {
  insights: CampaignInsights | undefined;
  isLoading: boolean;
  isFetching: boolean;
  onRefresh: () => void;
  onCardClick?: (filterType: CardFilterType) => void;
}

const CampaignAnalyticsCards: React.FC<CampaignAnalyticsCardsProps> = ({
  insights,
  isLoading,
  isFetching,
  onRefresh,
  onCardClick,
}) => {
  // Analytics cards configuration (keeping inline as requested)
  const analyticsCards = [
    {
      title: 'Connection Requests',
      value: insights?.connectionRequestsSent || 0,
      icon: UserPlus,
      bg: 'bg-blue-50',
      iconColor: 'text-blue-500',
      filterType: 'connectionRequests' as CardFilterType
    },
    {
      title: 'Requests Accepted',
      value: insights?.connectionRequestsAccepted || 0,
      icon: CheckCircle,
      bg: 'bg-green-50',
      iconColor: 'text-green-500',
      filterType: 'requestsAccepted' as CardFilterType
    },
    {
      title: 'Messages Sent',
      value: insights?.messagesSent || 0,
      icon: MessageCircle,
      bg: 'bg-orange-50',
      iconColor: 'text-orange-500',
      filterType: 'messagesSent' as CardFilterType
    },
    {
      title: 'Responses',
      value: insights?.responses || 0,
      icon: Reply,
      bg: 'bg-green-50',
      iconColor: 'text-green-500',
      filterType: 'responses' as CardFilterType
    }
  ];

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-medium text-gray-800">Campaign Analytics</h2>
        <TooltipInfo
          content="Refresh analytics"
          side="left"
          align="center"
          trigger={(
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading || isFetching}
              className="h-8 text-gray-600 hover:text-gray-900"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${(isLoading || isFetching) ? 'animate-spin' : ''}`} />
            </Button>
          )}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {analyticsCards.map((card, index) => {
          const IconComponent = card.icon;
          const isClickable = !!onCardClick && !isLoading;
          
          return (
            <Card 
              key={index} 
              className={`bg-white border border-gray-200 shadow-sm transition-all ${
                isClickable 
                  ? 'cursor-pointer hover:shadow-md hover:border-gray-300 hover:scale-[1.02]' 
                  : ''
              }`}
              onClick={() => {
                if (isClickable && onCardClick) {
                  onCardClick(card.filterType);
                }
              }}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    {card.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${card.bg}`}>
                    <IconComponent className={`w-5 h-5 ${card.iconColor}`} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {isLoading ? (
                    <div className="h-8 w-16 bg-gray-100 animate-pulse rounded" />
                  ) : (
                    card.value.toLocaleString()
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default CampaignAnalyticsCards;
