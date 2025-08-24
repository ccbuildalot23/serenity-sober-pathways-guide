
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Star, Target, Plus, TrendingUp } from 'lucide-react';

interface ActivityRating {
  id: string;
  activity: string;
  date: Date;
  masteryRating: number;
  pleasureRating: number;
  notes: string;
}

const ActivityRating: React.FC = () => {
  const [ratings, setRatings] = useState<ActivityRating[]>([]);
  const [newRating, setNewRating] = useState<Partial<ActivityRating>>({
    activity: '',
    masteryRating: 5,
    pleasureRating: 5,
    notes: ''
  });

  const addRating = () => {
    if (newRating.activity) {
      const rating: ActivityRating = {
        id: Date.now().toString(),
        activity: newRating.activity,
        date: new Date(),
        masteryRating: newRating.masteryRating || 5,
        pleasureRating: newRating.pleasureRating || 5,
        notes: newRating.notes || ''
      };
      
      setRatings([rating, ...ratings]);
      setNewRating({
        activity: '',
        masteryRating: 5,
        pleasureRating: 5,
        notes: ''
      });
    }
  };

  const averageMastery = ratings.length > 0 
    ? ratings.reduce((sum, r) => sum + r.masteryRating, 0) / ratings.length 
    : 0;
    
  const averagePleasure = ratings.length > 0 
    ? ratings.reduce((sum, r) => sum + r.pleasureRating, 0) / ratings.length 
    : 0;

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold">Activity Rating System</h3>
        <p className="text-gray-600">Rate activities for mastery and pleasure to guide future planning</p>
      </div>

      {/* Rating Form */}
      <Card>
        <CardHeader>
          <CardTitle>Rate an Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="activity">Activity</Label>
            <Input
              id="activity"
              value={newRating.activity || ''}
              onChange={(e) => setNewRating({...newRating, activity: e.target.value})}
              placeholder="What activity did you do?"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="flex items-center space-x-2 mb-2">
                <Target className="w-4 h-4 text-blue-500" />
                <span>Mastery (Sense of accomplishment)</span>
              </Label>
              <Slider
                value={[newRating.masteryRating || 5]}
                onValueChange={(value) => setNewRating({...newRating, masteryRating: value[0]})}
                max={10}
                min={1}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-gray-500 mt-1">
                <span>No accomplishment (1)</span>
                <span className="font-medium">{newRating.masteryRating}/10</span>
                <span>Great accomplishment (10)</span>
              </div>
            </div>
            
            <div>
              <Label className="flex items-center space-x-2 mb-2">
                <Star className="w-4 h-4 text-yellow-500" />
                <span>Pleasure (How enjoyable was it?)</span>
              </Label>
              <Slider
                value={[newRating.pleasureRating || 5]}
                onValueChange={(value) => setNewRating({...newRating, pleasureRating: value[0]})}
                max={10}
                min={1}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-gray-500 mt-1">
                <span>No pleasure (1)</span>
                <span className="font-medium">{newRating.pleasureRating}/10</span>
                <span>Very enjoyable (10)</span>
              </div>
            </div>
          </div>
          
          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input
              id="notes"
              value={newRating.notes || ''}
              onChange={(e) => setNewRating({...newRating, notes: e.target.value})}
              placeholder="Any additional thoughts about this activity?"
            />
          </div>
          
          <Button onClick={addRating} disabled={!newRating.activity}>
            <Plus className="w-4 h-4 mr-2" />
            Add Rating
          </Button>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {ratings.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <TrendingUp className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{ratings.length}</p>
                  <p className="text-sm text-gray-600">Activities Rated</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Target className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{averageMastery.toFixed(1)}</p>
                  <p className="text-sm text-gray-600">Avg Mastery</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Star className="w-8 h-8 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">{averagePleasure.toFixed(1)}</p>
                  <p className="text-sm text-gray-600">Avg Pleasure</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Ratings */}
      {ratings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity Ratings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ratings.slice(0, 5).map((rating) => (
                <div key={rating.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{rating.activity}</h4>
                    <p className="text-sm text-gray-500">
                      {rating.date.toLocaleDateString()}
                    </p>
                    {rating.notes && (
                      <p className="text-sm text-gray-600 mt-1">{rating.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-center">
                      <Badge variant="outline" className="mb-1">
                        <Target className="w-3 h-3 mr-1" />
                        {rating.masteryRating}
                      </Badge>
                      <p className="text-xs text-gray-500">Mastery</p>
                    </div>
                    <div className="text-center">
                      <Badge variant="outline" className="mb-1">
                        <Star className="w-3 h-3 mr-1" />
                        {rating.pleasureRating}
                      </Badge>
                      <p className="text-xs text-gray-500">Pleasure</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insights */}
      {ratings.length >= 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Insights & Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {averageMastery > averagePleasure + 2 && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Mastery Focus:</strong> You're achieving a lot! Consider adding more purely enjoyable activities to balance your schedule.
                  </p>
                </div>
              )}
              
              {averagePleasure > averageMastery + 2 && (
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Pleasure Focus:</strong> You're enjoying your activities! Try adding some challenging tasks to build your sense of accomplishment.
                  </p>
                </div>
              )}
              
              {Math.abs(averageMastery - averagePleasure) <= 1 && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>Great Balance:</strong> You have a nice balance of mastery and pleasure activities. Keep it up!
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ActivityRating;
