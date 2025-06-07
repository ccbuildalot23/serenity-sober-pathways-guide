import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

interface RiskItem {
  name: string;
  level: 'low' | 'medium' | 'high' | 'extreme';
}

const defaultRisks: RiskItem[] = [
  { name: 'Old using friends', level: 'high' },
  { name: 'Bars and clubs', level: 'medium' },
  { name: 'Loneliness', level: 'high' },
  { name: 'Payday', level: 'medium' }
];

const RiskMapper: React.FC = () => {
  const [risks, setRisks] = useState<RiskItem[]>(defaultRisks);
  const toggleLevel = (index: number) => {
    const levels = ['low', 'medium', 'high', 'extreme'] as const;
    setRisks(risks.map((r, i) =>
      i === index
        ? { ...r, level: levels[(levels.indexOf(r.level) + 1) % levels.length] }
        : r
    ));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Risk Mapping</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {risks.map((risk, idx) => (
          <div key={idx} className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox checked className="pointer-events-none" />
              <span>{risk.name}</span>
            </div>
            <Badge onClick={() => toggleLevel(idx)} className="cursor-pointer">
              {risk.level}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default RiskMapper;
