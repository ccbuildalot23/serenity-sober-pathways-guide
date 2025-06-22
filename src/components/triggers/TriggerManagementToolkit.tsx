
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, AlertTriangle, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Trigger {
  id: string;
  name: string;
  category: 'emotional' | 'environmental' | 'social' | 'physical';
  intensity: number;
  coping_strategies: string[];
}

const TriggerManagementToolkit: React.FC = () => {
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [newTrigger, setNewTrigger] = useState({
    name: '',
    category: 'emotional' as const,
    intensity: 5,
    coping_strategies: ['']
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    loadTriggers();
  }, [user]);

  const loadTriggers = async () => {
    if (!user) return;

    try {
      // Since user_triggers table doesn't exist in the current schema, 
      // we'll simulate with hardcoded data for now
      const mockTriggers: Trigger[] = [
        {
          id: '1',
          name: 'Stress',
          category: 'emotional',
          intensity: 5,
          coping_strategies: ['Deep breathing', 'Take a walk']
        },
        {
          id: '2',
          name: 'Social gatherings',
          category: 'social',
          intensity: 6,
          coping_strategies: ['Call sponsor', 'Exit strategy']
        },
        {
          id: '3',
          name: 'Bars or clubs',
          category: 'environmental',
          intensity: 7,
          coping_strategies: ['Leave immediately', 'Call friend']
        }
      ];

      setTriggers(mockTriggers);
      console.log('Loaded triggers (mock data):', mockTriggers);
    } catch (error) {
      console.error('Error loading triggers:', error);
      toast.error('Failed to load triggers');
    }
  };

  const addTrigger = async () => {
    if (!user || !newTrigger.name.trim()) {
      toast.error('Please enter a trigger name');
      return;
    }

    try {
      const trigger: Trigger = {
        id: Date.now().toString(), // Mock ID
        name: newTrigger.name,
        category: newTrigger.category,
        intensity: newTrigger.intensity,
        coping_strategies: newTrigger.coping_strategies.filter(s => s.trim())
      };

      setTriggers(prev => [...prev, trigger]);
      setNewTrigger({
        name: '',
        category: 'emotional',
        intensity: 5,
        coping_strategies: ['']
      });

      toast.success('Trigger added successfully');
      console.log('Added trigger (mock):', trigger);
    } catch (error) {
      console.error('Error adding trigger:', error);
      toast.error('Failed to add trigger');
    }
  };

  const deleteTrigger = async (id: string) => {
    try {
      setTriggers(prev => prev.filter(t => t.id !== id));
      toast.success('Trigger deleted');
      console.log('Deleted trigger (mock):', id);
    } catch (error) {
      console.error('Error deleting trigger:', error);
      toast.error('Failed to delete trigger');
    }
  };

  const updateCopingStrategy = (index: number, value: string) => {
    const updated = [...newTrigger.coping_strategies];
    updated[index] = value;
    setNewTrigger(prev => ({ ...prev, coping_strategies: updated }));
  };

  const addCopingStrategy = () => {
    setNewTrigger(prev => ({
      ...prev,
      coping_strategies: [...prev.coping_strategies, '']
    }));
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      emotional: 'bg-red-100 text-red-800',
      environmental: 'bg-green-100 text-green-800',
      social: 'bg-blue-100 text-blue-800',
      physical: 'bg-purple-100 text-purple-800'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getIntensityColor = (intensity: number) => {
    if (intensity <= 3) return 'text-green-600';
    if (intensity <= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-orange-600" />
            Trigger Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="trigger-name">Trigger Name</Label>
              <Input
                id="trigger-name"
                value={newTrigger.name}
                onChange={(e) => setNewTrigger(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Work stress, Social events"
              />
            </div>
            
            <div>
              <Label htmlFor="trigger-category">Category</Label>
              <select
                id="trigger-category"
                value={newTrigger.category}
                onChange={(e) => setNewTrigger(prev => ({ ...prev, category: e.target.value as any }))}
                className="w-full p-2 border rounded-md"
              >
                <option value="emotional">Emotional</option>
                <option value="environmental">Environmental</option>
                <option value="social">Social</option>
                <option value="physical">Physical</option>
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="trigger-intensity">Intensity (1-10): {newTrigger.intensity}</Label>
            <input
              id="trigger-intensity"
              type="range"
              min="1"
              max="10"
              value={newTrigger.intensity}
              onChange={(e) => setNewTrigger(prev => ({ ...prev, intensity: parseInt(e.target.value) }))}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label>Coping Strategies</Label>
            {newTrigger.coping_strategies.map((strategy, index) => (
              <Input
                key={index}
                value={strategy}
                onChange={(e) => updateCopingStrategy(index, e.target.value)}
                placeholder={`Coping strategy ${index + 1}`}
              />
            ))}
            <Button onClick={addCopingStrategy} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Strategy
            </Button>
          </div>

          <Button onClick={addTrigger} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Trigger
          </Button>
        </CardContent>
      </Card>

      {/* Triggers List */}
      <div className="space-y-4">
        {triggers.map(trigger => (
          <Card key={trigger.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">{trigger.name}</h3>
                    <Badge className={getCategoryColor(trigger.category)}>
                      {trigger.category}
                    </Badge>
                    <div className="flex items-center">
                      <Star className={`w-4 h-4 mr-1 ${getIntensityColor(trigger.intensity)}`} />
                      <span className={`text-sm font-medium ${getIntensityColor(trigger.intensity)}`}>
                        {trigger.intensity}/10
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    <strong>Coping strategies:</strong> {trigger.coping_strategies.join(', ')}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingId(trigger.id)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteTrigger(trigger.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {triggers.length === 0 && (
        <div className="text-center py-8">
          <AlertTriangle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">No triggers added yet. Start by identifying your triggers above.</p>
        </div>
      )}
    </div>
  );
};

export default TriggerManagementToolkit;
