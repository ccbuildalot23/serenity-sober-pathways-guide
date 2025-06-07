import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface NetworkMember {
  name: string;
  circle: 'inner' | 'middle' | 'outer';
}

const SupportNetworkVisualizer: React.FC = () => {
  const [members, setMembers] = useState<NetworkMember[]>([]);
  const [newMember, setNewMember] = useState<NetworkMember>({ name: '', circle: 'inner' });

  const addMember = () => {
    if (!newMember.name) return;
    setMembers([...members, newMember]);
    setNewMember({ name: '', circle: 'inner' });
  };

  const circles = ['inner', 'middle', 'outer'] as const;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Support Network</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Name"
            value={newMember.name}
            onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
          />
          <select
            className="border rounded px-2"
            value={newMember.circle}
            onChange={(e) => setNewMember({ ...newMember, circle: e.target.value as any })}
          >
            {circles.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <Button onClick={addMember}>Add</Button>
        </div>
        {circles.map(c => (
          <div key={c}>
            <h4 className="font-semibold capitalize mb-2">{c} circle</h4>
            <div className="space-y-1">
              {members.filter(m => m.circle === c).map((m, idx) => (
                <div key={idx} className="border p-2 rounded">
                  {m.name}
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default SupportNetworkVisualizer;
