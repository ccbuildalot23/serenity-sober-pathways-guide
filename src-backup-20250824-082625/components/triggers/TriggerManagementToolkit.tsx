
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, AlertTriangle, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import logger from '../../services/loggerService';

interface Trigger {
  id: string;
  _name: string;
  _category: 'emotional' | 'environmental' | 'social' | 'physical';
  _intensity: number;
  _coping_strategies: string[];
}

const TriggerManagementToolkit: React.FC = () => {
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [newTrigger, setNewTrigger] = useState({
    _name: '',
    _category: 'emotional' as const,
    _intensity: 5,
    _coping_strategies: ['']
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
          _name: 'Stress',
          _category: 'emotional',
          _intensity: 5,
          _coping_strategies: ['Deep breathing', 'Take a walk']
        },
        {
          id: '2',
          _name: 'Social gatherings',
          _category: 'social',
          _intensity: 6,
          _coping_strategies: ['Call sponsor', 'Exit strategy']
        },
        {
          id: '3',
          _name: 'Bars or clubs',
          _category: 'environmental',
          _intensity: 7,
          _coping_strategies: ['Leave immediately', 'Call friend']
        }
      ];

      setTriggers(mockTriggers);
      logger.debug('Loaded triggers (mock data):', mockTriggers, { component: 'TriggerManagementToolkit' });
    } catch (error) {
      console.error('Error loading triggers:', error);
      toast.error('Failed to load triggers');
    }
  };

  const addTrigger = async () => {
    if (!user || !newTrigger._name.trim()) {
      toast.error('Please enter a trigger _name');
      return;
    }

    try {
      const trigger: Trigger = {
        id: Date.now().toString(), // Mock ID
        _name: newTrigger._name,
        _category: newTrigger._category,
        _intensity: newTrigger._intensity,
        _coping_strategies: newTrigger._coping_strategies.filter(s => s.trim())
      };

      setTriggers(prev => [...prev, trigger]);
      setNewTrigger({
        _name: '',
        _category: 'emotional',
        _intensity: 5,
        _coping_strategies: ['']
      });

      toast.success('Trigger added successfully');
      logger.debug('Added trigger (mock):', trigger, { component: 'TriggerManagementToolkit' });
    } catch (error) {
      console.error('Error adding trigger:', error);
      toast.error('Failed to add trigger');
    }
  };

  const deleteTrigger = async (id: string) => {
    try {
      setTriggers(prev => prev.filter(t => t.id !== id));
      toast.success('Trigger deleted');
      logger.debug('Deleted trigger (mock):', id, { component: 'TriggerManagementToolkit' });
    } catch (error) {
      console.error('Error deleting trigger:', error);
      toast.error('Failed to delete trigger');
    }
  };

  const updateCopingStrategy = (index: number, value: string) => {
    const updated = [...newTrigger._coping_strategies];
    updated[index] = value;
    setNewTrigger(prev => ({ ...prev, _coping_strategies: updated }));
  };

  const addCopingStrategy = () => {
    setNewTrigger(prev => ({
      ...prev,
      _coping_strategies: [...prev._coping_strategies, '']
    }));
  };

  const getCategoryColor = (_category: string) => {
    const colors = {
      emotional: 'bg-red-100 text-red-800',
      environmental: 'bg-green-100 text-green-800',
      social: 'bg-blue-100 text-blue-800',
      physical: 'bg-purple-100 text-purple-800'
    };
    return colors[_category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getIntensityColor = (_intensity: number) => {
    if (_intensity <= 3) return 'text-green-600';
    if (_intensity <= 6) return 'text-yellow-600';
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
              <Label htmlFor="trigger-_name">Trigger Name</Label>
              <Input
                id="trigger-_name"
                value={newTrigger._name}
                onChange={(e) => setNewTrigger(prev => ({ ...prev, _name: e.target.value }))}
                placeholder="e.g., Work stress, Social events"
              />
            </div>
            
            <div>
              <Label htmlFor="trigger-_category">Category</Label>
              <select
                id="trigger-_category"
                value={newTrigger._category}
                onChange={(e) => setNewTrigger(prev => ({ ...prev, _category: e.target.value as any }))}
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
            <Label htmlFor="trigger-_intensity">Intensity (1-10): {newTrigger._intensity}</Label>
            <input
              id="trigger-_intensity"
              type="range"
              min="1"
              max="10"
              value={newTrigger._intensity}
              onChange={(e) => setNewTrigger(prev => ({ ...prev, _intensity: parseInt(e.target.value) }))}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label>Coping Strategies</Label>
            {newTrigger._coping_strategies.map((strategy, index) => (
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
                    <h3 className="font-semibold">{trigger._name}</h3>
                    <Badge className={getCategoryColor(trigger._category)}>
                      {trigger._category}
                    </Badge>
                    <div className="flex items-center">
                      <Star className={`w-4 h-4 mr-1 ${getIntensityColor(trigger._intensity)}`} />
                      <span className={`text-sm font-medium ${getIntensityColor(trigger._intensity)}`}>
                        {trigger._intensity}/10
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    <strong>Coping strategies:</strong> {trigger._coping_strategies.join(', ')}
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
